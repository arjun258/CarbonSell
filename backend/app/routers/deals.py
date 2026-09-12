"""Bids, orders, status timeline and pickup scheduling."""
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import config
from ..db import get_db
from ..auction import (
    accepted_volume, bidding_block, listing_bids, parse_moment, settle_if_due,
    window_state,
)
from ..engine import cheapest_haul, evaluate
from ..loaders import demand_from_requirement, supply_from_listing
from ..models import Address, Bid, Listing, Order, Pickup, Requirement, User
from ..schemas import (
    BidIn, PickupIn, StatusIn, address_out, company_out, order_out,
)
from ..security import current_user, require_role

router = APIRouter(tags=["deals"])

ORDER_FLOW = ["accepted", "pickup_scheduled", "in_transit", "delivered"]


@router.post("/bids")
def place_bid(
    body: BidIn,
    user: User = Depends(require_role("buyer")),
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, body.listing_id)
    req = db.get(Requirement, body.requirement_id)
    if listing is None or req is None:
        raise HTTPException(404, "Listing or requirement not found")
    if req.company_id != user.company_id:
        raise HTTPException(403, "That requirement is not yours")
    settle_if_due(db, listing)
    state = window_state(listing)
    if state == "upcoming":
        opens = parse_moment(listing.bid_start)
        when = opens.strftime("%-d %b at %H:%M") if opens else listing.bid_start
        raise HTTPException(409, f"Bidding on this listing opens {when}")
    if state == "closed":
        raise HTTPException(409, "Bidding on this listing has closed")
    if body.price_per_t < listing.price_per_t:
        raise HTTPException(
            400,
            f"The starting price is Rs {listing.price_per_t:,.2f}/tonne - bid at least that",
        )

    remaining = listing.volume_t - accepted_volume(listing_bids(db, listing.id))
    if body.volume_t > remaining:
        raise HTTPException(
            400, f"Only {remaining:,.2f} tonne of this listing is still unsold"
        )

    bid = Bid(
        listing_id=listing.id, requirement_id=req.id, buyer_company_id=user.company_id,
        volume_t=body.volume_t, price_per_t=body.price_per_t, note=body.note,
    )
    db.add(bid)
    db.commit()
    db.refresh(bid)
    return {"id": bid.id, "status": bid.status}


@router.get("/bids/mine")
def my_bids(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Buyers see the bids they placed; sellers see bids on their listings."""
    if user.role == "buyer":
        rows = (
            db.query(Bid)
            .filter(Bid.buyer_company_id == user.company_id)
            .order_by(Bid.id.desc()).all()
        )
    else:
        rows = (
            db.query(Bid)
            .join(Listing, Bid.listing_id == Listing.id)
            .filter(Listing.company_id == user.company_id)
            .order_by(Bid.status.desc(), Bid.id.desc()).all()
        )

    out = []
    for b in rows:
        listing, req = b.listing, b.requirement
        ev = evaluate(supply_from_listing(listing), demand_from_requirement(req))
        out.append({
            "id": b.id, "status": b.status, "note": b.note,
            "requirement_id": b.requirement_id,
            "volume_t": b.volume_t, "price_per_t": b.price_per_t,
            "created_at": b.created_at.isoformat(),
            "listing": {
                "id": listing.id, "purity_pct": listing.purity_pct,
                "city": listing.address.city, "ask_per_t": listing.price_per_t,
                "volume_t": listing.volume_t, "form": listing.form,
            },
            "buyer": company_out(b.buyer, reveal_phone=(b.status == "accepted")),
            "seller": company_out(listing.company, reveal_phone=(b.status == "accepted")),
            "use_case": b.buyer.category,
            "delivery_city": req.address.city,
            "distance_km": ev["distance_km"] if ev else None,
            "haul": ev["haul"] if ev else None,
            "delivered_per_t": ev["delivered_per_t"] if ev else None,
        })
    return {"bids": out}


@router.patch("/bids/{bid_id}")
def respond_to_bid(
    bid_id: int,
    body: StatusIn,
    user: User = Depends(require_role("emitter")),
    db: Session = Depends(get_db),
):
    bid = db.get(Bid, bid_id)
    if bid is None or bid.listing.company_id != user.company_id:
        raise HTTPException(404, "No such bid on your listings")
    if body.status not in ("accepted", "rejected"):
        raise HTTPException(400, "status must be accepted or rejected")
    if bid.status != "pending":
        raise HTTPException(409, f"This bid is already {bid.status}")

    listing = bid.listing
    bid.status = body.status
    order_id = None
    filled = False
    remaining = listing.volume_t - accepted_volume(listing_bids(db, listing.id))

    if body.status == "accepted":
        ev = evaluate(supply_from_listing(listing), demand_from_requirement(bid.requirement))
        haul = ev["haul"] if ev else cheapest_haul(bid.volume_t, 0)
        order = Order(
            bid_id=bid.id, status="accepted",
            delivered_per_t=ev["delivered_per_t"] if ev else bid.price_per_t,
            haul_json=json.dumps(haul),
        )
        db.add(order)
        db.flush()
        order_id = order.id

        # A bid that takes the whole quantity ends it. One that takes part of
        # it leaves the listing open so the rest can be filled by someone
        # else - the seller is told how much is left and can stop whenever.
        remaining = listing.volume_t - accepted_volume(listing_bids(db, listing.id))
        filled = remaining <= 0
        if filled:
            for other in listing_bids(db, listing.id):
                if other.status == "pending":
                    other.status = "rejected"
            listing.bidding_closed = True
            listing.settled = True

    db.commit()
    db.refresh(listing)
    return {
        "bid_id": bid.id,
        "status": bid.status,
        "order_id": order_id,
        "filled": filled,
        "remaining_t": round(max(0.0, remaining), 2),
        "bidding": bidding_block(db, listing, user.company_id),
    }


@router.get("/orders/mine")
def my_orders(user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(Order).join(Bid, Order.bid_id == Bid.id)
    if user.role == "buyer":
        q = q.filter(Bid.buyer_company_id == user.company_id)
    else:
        q = q.join(Listing, Bid.listing_id == Listing.id).filter(
            Listing.company_id == user.company_id
        )
    rows = q.order_by(Order.id.desc()).all()
    return {"orders": [order_out(o, viewer_company_id=user.company_id) for o in rows]}


def _own_order(db: Session, order_id: int, user: User) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(404, "No such order")
    parties = (order.bid.buyer_company_id, order.bid.listing.company_id)
    if user.company_id not in parties:
        raise HTTPException(403, "Not your order")
    return order


@router.get("/orders/{order_id}/haul-suggestion")
def haul_suggestion(
    order_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    """What the pickup form shows: the same haul plan the buyer saw."""
    order = _own_order(db, order_id, user)
    stored = json.loads(order.haul_json) if order.haul_json else None
    if stored is None:
        ev = evaluate(
            supply_from_listing(order.bid.listing),
            demand_from_requirement(order.bid.requirement),
        )
        stored = ev["haul"] if ev else None
    return {
        "haul": stored,
        "delivered_per_t": order.delivered_per_t,
        "slots": config.PICKUP_SLOTS,
        "vehicle_types": [t["name"] for t in config.TRUCKS],
        "pickup_addresses": [
            address_out(a) for a in order.bid.listing.company.addresses
        ],
        "default_address_id": order.bid.listing.address_id,
    }


@router.post("/orders/{order_id}/pickup")
def schedule_pickup(
    order_id: int,
    body: PickupIn,
    user: User = Depends(require_role("emitter")),
    db: Session = Depends(get_db),
):
    order = _own_order(db, order_id, user)
    if order.bid.listing.company_id != user.company_id:
        raise HTTPException(403, "Only the seller schedules the pickup")
    address = db.get(Address, body.address_id)
    if address is None or address.company_id != user.company_id:
        raise HTTPException(400, "That pickup address does not belong to you")
    if body.slot not in config.PICKUP_SLOTS:
        raise HTTPException(400, f"slot must be one of {config.PICKUP_SLOTS}")

    if order.pickup is not None:
        db.delete(order.pickup)
        db.flush()
    db.add(Pickup(
        order_id=order.id, address_id=address.id, scheduled_date=body.scheduled_date,
        slot=body.slot, vehicle_type=body.vehicle_type,
        contact_name=body.contact_name, contact_phone=body.contact_phone,
    ))
    if order.status == "accepted":
        order.status = "pickup_scheduled"
    db.commit()
    db.refresh(order)
    return order_out(order, viewer_company_id=user.company_id)


@router.patch("/orders/{order_id}/status")
def advance_status(
    order_id: int,
    body: StatusIn,
    user: User = Depends(require_role("emitter")),
    db: Session = Depends(get_db),
):
    order = _own_order(db, order_id, user)
    if body.status not in ORDER_FLOW:
        raise HTTPException(400, f"status must be one of {ORDER_FLOW}")
    if ORDER_FLOW.index(body.status) <= ORDER_FLOW.index(order.status):
        raise HTTPException(409, f"Order is already {order.status}")
    if body.status != "pickup_scheduled" and order.pickup is None:
        raise HTTPException(409, "Schedule a pickup before moving the order on")

    order.status = body.status
    db.commit()
    db.refresh(order)
    return order_out(order, viewer_company_id=user.company_id)
