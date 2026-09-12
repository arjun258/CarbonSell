from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import config
from ..db import get_db
from ..models import Address, CaptureMethod, Company, User
from ..schemas import (
    AddressIn, CaptureMethodIn, LoginIn, SignupIn, address_out, company_out,
)
from ..security import current_user, hash_password, make_token, verify_password

router = APIRouter(tags=["auth"])


def _region_for(state: str) -> str:
    return config.STATE_TO_REGION.get(state, config.DEFAULT_REGION)


def _add_address(db: Session, company: Company, a: AddressIn, default_kind: str) -> Address:
    row = Address(
        company_id=company.id,
        kind=a.kind or default_kind,
        label=a.label, line1=a.line1, city=a.city, state=a.state,
        region=_region_for(a.state), pincode=a.pincode,
        lat=a.lat, lng=a.lng, is_default=a.is_default,
    )
    db.add(row)
    return row


@router.post("/auth/signup")
def signup(body: SignupIn, db: Session = Depends(get_db)):
    if body.role not in ("emitter", "buyer"):
        raise HTTPException(400, "role must be emitter or buyer")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(409, "That email is already registered")

    valid = config.EMITTER_CATEGORIES if body.role == "emitter" else config.BUYER_CATEGORIES
    if body.category not in valid:
        raise HTTPException(400, f"category must be one of: {', '.join(valid)}")

    company = Company(
        name=body.company_name, type=body.role, category=body.category,
        phone=body.phone, is_verified=True, rating=4.0,
        gstin=f"24{abs(hash(body.company_name)) % 10**9:09d}1Z5",
    )
    db.add(company)
    db.flush()

    kind = "pickup" if body.role == "emitter" else "delivery"
    for i, a in enumerate(body.addresses):
        row = _add_address(db, company, a, kind)
        if i == 0 and not any(x.is_default for x in body.addresses):
            row.is_default = True
    if body.role == "emitter":
        for m in body.capture_methods:
            db.add(CaptureMethod(company_id=company.id, method=m))

    user = User(
        company_id=company.id, email=body.email.lower(),
        password_hash=hash_password(body.password), role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": make_token(user), "role": user.role}


@router.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect")
    return {"token": make_token(user), "role": user.role}


@router.get("/me")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """One call that feeds every prefill dropdown in the app."""
    company = user.company
    return {
        "user": {"id": user.id, "email": user.email, "role": user.role},
        "company": company_out(company, reveal_phone=True),
        "addresses": [address_out(a) for a in sorted(company.addresses, key=lambda a: a.id)],
        "capture_methods": [m.method for m in company.capture_methods],
        "capture_method_rows": [
            {"id": m.id, "method": m.method} for m in company.capture_methods
        ],
    }


@router.post("/addresses")
def add_address(body: AddressIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Powers the '+ Add new address' modal: no page navigation mid-form."""
    kind = "pickup" if user.role == "emitter" else "delivery"
    if body.is_default:
        for a in user.company.addresses:
            a.is_default = False
    row = _add_address(db, user.company, body, kind)
    db.commit()
    db.refresh(row)
    return address_out(row)


@router.post("/capture-methods")
def add_capture_method(
    body: CaptureMethodIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Sellers add capture methods after signup, from the profile page or
    inline while writing a listing."""
    if user.role != "emitter":
        raise HTTPException(403, "Only emitters record capture methods")
    method = body.method.strip()
    existing = [m.method.lower() for m in user.company.capture_methods]
    if method.lower() in existing:
        raise HTTPException(409, "You already have that capture method")
    db.add(CaptureMethod(company_id=user.company_id, method=method))
    db.commit()
    return {"capture_methods": [m.method for m in user.company.capture_methods]}


@router.delete("/capture-methods/{method_id}")
def remove_capture_method(
    method_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    row = db.get(CaptureMethod, method_id)
    if row is None or row.company_id != user.company_id:
        raise HTTPException(404, "No such capture method")
    db.delete(row)
    db.commit()
    return {"ok": True}
