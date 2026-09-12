"""Listings, requirements, browse and the ranked match endpoint."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import config
from ..db import get_db
from ..engine import Demand, evaluate, rank
from ..loaders import active_supplies, demand_from_requirement, supply_from_listing
from ..models import Address, Contaminant, ContaminantCap, Listing, Requirement, Thread, User
from ..schemas import (
    ListingIn, RequirementIn, listing_out, requirement_out,
)
from ..security import current_user, require_role

router = APIRouter(tags=["market"])


def _reveal_for(db: Session, listing: Listing, user: User | None) -> bool:
    """A seller's number is visible to a buyer only once the seller shared
    it in that listing's thread. The seller always sees their own."""
    if user is None:
        return False
    if user.company_id == listing.company_id:
        return True
    thread = (
        db.query(Thread)
        .filter(Thread.listing_id == listing.id, Thread.buyer_company_id == user.company_id)
        .first()
    )
    return bool(thread and thread.contact_shared)


@router.get("/listings")
def browse(
    region: str = Query(config.DEFAULT_REGION),
    min_purity: float | None = None,
    min_volume: float | None = None,
    max_price: float | None = None,
    source_type: str | None = None,
    form: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    q = (
        db.query(Listing)
        .join(Address, Listing.address_id == Address.id)
        .filter(Listing.status == "active", Address.region == region)
    )
    if min_purity is not None:
        q = q.filter(Listing.purity_pct >= min_purity)
    if min_volume is not None:
        q = q.filter(Listing.volume_t >= min_volume)
    if max_price is not None:
        q = q.filter(Listing.price_per_t <= max_price)
    if source_type:
        q = q.filter(Listing.source_type == source_type)
    if form:
        q = q.filter(Listing.form == form)

    rows = q.order_by(Listing.storage_full.desc(), Listing.purity_pct.desc()).all()
    return {
        "region": region,
        "count": len(rows),
        "listings": [listing_out(r, reveal_phone=_reveal_for(db, r, user)) for r in rows],
    }


@router.get("/listings/mine")
def my_listings(
    user: User = Depends(require_role("emitter")), db: Session = Depends(get_db)
):
    from ..models import Bid

    rows = (
        db.query(Listing)
        .filter(Listing.company_id == user.company_id)
        .order_by(Listing.id.desc())
        .all()
    )
    out = []
    for r in rows:
        item = listing_out(r, reveal_phone=True)
        item["bid_count"] = db.query(Bid).filter(Bid.listing_id == r.id).count()
        item["thread_count"] = db.query(Thread).filter(Thread.listing_id == r.id).count()
        out.append(item)
    return {"listings": out}


@router.post("/listings")
def create_listing(
    body: ListingIn,
    user: User = Depends(require_role("emitter")),
    db: Session = Depends(get_db),
):
    address = db.get(Address, body.address_id)
    if address is None or address.company_id != user.company_id:
        raise HTTPException(400, "That pickup address does not belong to you")
    if not 0 < body.purity_pct <= 100:
        raise HTTPException(400, "Purity must be between 0 and 100")

    listing = Listing(
        company_id=user.company_id, address_id=address.id, volume_t=body.volume_t,
        purity_pct=body.purity_pct, form=body.form, price_per_t=body.price_per_t,
        available_from=body.available_from, source_type=body.source_type,
        lab_report=body.lab_report, storage_full=body.storage_full,
    )
    db.add(listing)
    db.flush()
    for c in body.contaminants:
        if c.species not in config.REMOVAL_COST_PER_T:
            raise HTTPException(400, f"Unknown species: {c.species}")
        db.add(Contaminant(listing_id=listing.id, species=c.species, ppm=c.ppm))
    db.commit()
    db.refresh(listing)
    return listing_out(listing, reveal_phone=True)


@router.get("/listings/{listing_id}")
def listing_detail(
    listing_id: int,
    requirement_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    listing = db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, "No such listing")
    out = listing_out(listing, reveal_phone=_reveal_for(db, listing, user))

    # Priced against one of the buyer's requirements, if they picked one.
    if requirement_id:
        req = db.get(Requirement, requirement_id)
        if req and req.company_id == user.company_id:
            out["evaluation"] = evaluate(
                supply_from_listing(listing), demand_from_requirement(req)
            )
            out["requirement"] = requirement_out(req)
    return out


@router.get("/requirements/mine")
def my_requirements(
    user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)
):
    rows = (
        db.query(Requirement)
        .filter(Requirement.company_id == user.company_id)
        .order_by(Requirement.id.desc())
        .all()
    )
    out = []
    for r in rows:
        item = requirement_out(r)
        item["match_count"] = len(
            rank(active_supplies(db, r.address.region), demand_from_requirement(r))
        )
        out.append(item)
    return {"requirements": out}


@router.post("/requirements")
def create_requirement(
    body: RequirementIn,
    user: User = Depends(require_role("buyer")),
    db: Session = Depends(get_db),
):
    address = db.get(Address, body.address_id)
    if address is None or address.company_id != user.company_id:
        raise HTTPException(400, "That delivery address does not belong to you")

    req = Requirement(
        company_id=user.company_id, address_id=address.id, volume_t=body.volume_t,
        min_purity_pct=body.min_purity_pct, budget_per_t=body.budget_per_t,
        use_case=body.use_case,
    )
    db.add(req)
    db.flush()
    for c in body.caps:
        db.add(ContaminantCap(requirement_id=req.id, species=c.species, max_ppm=c.max_ppm))
    db.commit()
    db.refresh(req)
    return requirement_out(req)


@router.get("/match/{requirement_id}")
def match(
    requirement_id: int,
    region: str | None = None,
    user: User = Depends(require_role("buyer")),
    db: Session = Depends(get_db),
):
    """The ranked market for one requirement. This is the product."""
    req = db.get(Requirement, requirement_id)
    if req is None or req.company_id != user.company_id:
        raise HTTPException(404, "No such requirement")

    supplies = active_supplies(db, region or req.address.region)
    demand: Demand = demand_from_requirement(req)
    matches = rank(supplies, demand)

    # Contact reveal state travels with each match so the UI can render the
    # right phone line without a second round trip.
    shared = {
        t.listing_id
        for t in db.query(Thread).filter(
            Thread.buyer_company_id == user.company_id, Thread.contact_shared.is_(True)
        )
    }
    for m in matches:
        m["contact_shared"] = m["listing_id"] in shared

    return {
        "requirement": requirement_out(req),
        "considered": len(supplies),
        "count": len(matches),
        "matches": matches,
    }
