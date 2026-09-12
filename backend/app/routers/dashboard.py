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
    cid = user.company_id

    if user.role == "emitter":
        listings = db.query(Listing).filter(Listing.company_id == cid).all()
        bids = (
            db.query(Bid).join(Listing, Bid.listing_id == Listing.id)
            .filter(Listing.company_id == cid).all()
        )
        orders = (
            db.query(Order).join(Bid, Order.bid_id == Bid.id)
            .join(Listing, Bid.listing_id == Listing.id)
            .filter(Listing.company_id == cid).all()
        )
        closed = sum(o.bid.volume_t * o.bid.price_per_t for o in orders)
        return {
            "role": "emitter",
            "kpis": [
                {"label": "Active listings",
                 "value": sum(1 for l in listings if l.status == "active")},
                {"label": "Volume listed", "value": round(sum(l.volume_t for l in listings)),
                 "unit": "t/mo"},
                {"label": "Open bids",
                 "value": sum(1 for b in bids if b.status == "pending")},
                {"label": "Orders in progress",
                 "value": sum(1 for o in orders if o.status != "delivered")},
                {"label": "Value closed", "value": round(closed), "unit": "INR"},
            ],
            "unread_threads": db.query(Thread).filter(Thread.seller_company_id == cid).count(),
        }

    reqs = db.query(Requirement).filter(Requirement.company_id == cid).all()
    bids = db.query(Bid).filter(Bid.buyer_company_id == cid).all()
    orders = (
        db.query(Order).join(Bid, Order.bid_id == Bid.id)
        .filter(Bid.buyer_company_id == cid).all()
    )
    best: list[dict] = []
    for r in reqs:
        matches = rank(active_supplies(db, r.address.region), demand_from_requirement(r))
        for m in matches[:2]:
            m["requirement_id"] = r.id
            m["use_case"] = r.use_case
            best.append(m)
    best.sort(key=lambda m: -m["score"])
    delivered = [o.delivered_per_t for o in orders if o.delivered_per_t]

    return {
        "role": "buyer",
        "kpis": [
            {"label": "Active requirements", "value": len(reqs)},
            {"label": "Matches available", "value": len(best)},
            {"label": "Bids pending",
             "value": sum(1 for b in bids if b.status == "pending")},
            {"label": "Orders in progress",
             "value": sum(1 for o in orders if o.status != "delivered")},
            {"label": "Avg delivered",
             "value": round(sum(delivered) / len(delivered)) if delivered else 0,
             "unit": "INR/t"},
        ],
        "best_matches": best[:3],
        "unread_threads": db.query(Thread).filter(Thread.buyer_company_id == cid).count(),
    }
