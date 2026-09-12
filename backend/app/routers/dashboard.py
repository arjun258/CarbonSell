"""KPI rows. Cheap aggregates over data the other routers already own."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..loaders import active_supplies, demand_from_requirement
from ..engine import rank
from ..models import Address, Bid, Listing, Order, Requirement, Thread, User
from ..security import current_user

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Everything the overview page needs, in one call."""
    from ..schemas import order_out, thread_out
    from ..routers.deals import my_bids

    cid = user.company_id
    threads = (
        db.query(Thread)
        .filter(
            Thread.seller_company_id == cid
            if user.role == "emitter"
            else Thread.buyer_company_id == cid
        )
        .order_by(Thread.id.desc())
        .all()
    )
    bids = my_bids(user=user, db=db)["bids"]

    orders_q = db.query(Order).join(Bid, Order.bid_id == Bid.id)
    if user.role == "buyer":
        orders_q = orders_q.filter(Bid.buyer_company_id == cid)
    else:
        orders_q = orders_q.join(Listing, Bid.listing_id == Listing.id).filter(
            Listing.company_id == cid
        )
    orders = orders_q.order_by(Order.id.desc()).all()

    common = {
        "orders": [order_out(o, viewer_company_id=cid) for o in orders[:4]],
        "bids": bids,
        "threads": [thread_out(t, viewer_company_id=cid) for t in threads[:4]],
    }

    if user.role == "emitter":
        listings = db.query(Listing).filter(Listing.company_id == cid).all()
        closed = sum(o.bid.volume_t * o.bid.price_per_t for o in orders)
        return {
            "role": "emitter",
            "kpis": [
                {"label": "Active listings",
                 "value": sum(1 for l in listings if l.status == "active")},
                {"label": "Volume listed", "value": round(sum(l.volume_t for l in listings)),
                 "unit": "tonne"},
                {"label": "Open bids",
                 "value": sum(1 for b in bids if b["status"] == "pending")},
                {"label": "Orders in progress",
                 "value": sum(1 for o in orders if o.status != "delivered")},
                {"label": "Value closed", "value": round(closed), "unit": "INR"},
            ],
            **common,
        }

    reqs = db.query(Requirement).filter(Requirement.company_id == cid).all()
    best: list[dict] = []
    for r in reqs:
        matches = rank(active_supplies(db, r.address.region), demand_from_requirement(r))
        for m in matches[:2]:
            m["requirement_id"] = r.id
            m["use_case"] = r.address.city
            best.append(m)
    best.sort(key=lambda m: -m["score"])

    return {
        "role": "buyer",
        "kpis": [
            {"label": "Active requirements", "value": len(reqs)},
            {"label": "Bids pending",
             "value": sum(1 for b in bids if b["status"] == "pending")},
            {"label": "Orders in progress",
             "value": sum(1 for o in orders if o.status != "delivered")},
            {"label": "Conversations", "value": len(threads)},
        ],
        "best_matches": best[:3],
        **common,
    }
