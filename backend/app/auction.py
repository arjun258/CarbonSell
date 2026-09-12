"""The bidding window, and what happens when it shuts.

A listing with no dates is a direct sale and none of this applies. With
dates, buyers compete inside the window and the seller stays in charge:
they may accept any bid, not only the highest, and may stop early.

There is no scheduler. A listing past its end date settles the moment
anyone loads it, which is honest enough without a background worker.
"""
import json
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from .models import Bid, Listing, Order


def now() -> str:
    """Local wall-clock, to the minute - the precision a seller sets."""
    return datetime.now().isoformat(timespec="minutes")


def parse_moment(value: str, *, end_of_day: bool = False) -> datetime | None:
    """Accepts '2026-09-19T14:30' and plain '2026-09-19'.

    A bare date means the whole of that day, so an end date without a time
    runs until 23:59 rather than expiring at midnight.
    """
    if not value:
        return None
    if "T" in value:
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    try:
        day = date.fromisoformat(value)
    except ValueError:
        return None
    return datetime.combine(
        day,
        datetime.max.time().replace(microsecond=0) if end_of_day else datetime.min.time(),
    )


def is_auction(listing: Listing) -> bool:
    return bool(listing.bid_start and listing.bid_end)


def minutes_until(value: str) -> int | None:
    moment = parse_moment(value, end_of_day=True)
    if moment is None:
        return None
    return int((moment - datetime.now()).total_seconds() // 60)


def window_state(listing: Listing) -> str:
    """upcoming | open | closed | direct"""
    if not is_auction(listing):
        return "direct"
    if listing.bidding_closed or listing.settled:
        return "closed"

    moment = datetime.now()
    opens = parse_moment(listing.bid_start)
    closes = parse_moment(listing.bid_end, end_of_day=True)
    if opens is not None and moment < opens:
        return "upcoming"
    if closes is not None and moment > closes:
        return "closed"
    return "open"


def listing_bids(db: Session, listing_id: int) -> list[Bid]:
    return (
        db.query(Bid)
        .filter(Bid.listing_id == listing_id)
        .order_by(Bid.price_per_t.desc(), Bid.id)
        .all()
    )


def accepted_volume(bids: list[Bid]) -> float:
    return sum(b.volume_t for b in bids if b.status == "accepted")


def award(db: Session, listing: Listing) -> list[Bid]:
    """Take the highest bids until the quantity is filled.

    A single bid covering the whole listing wins outright; otherwise the
    best bids are stacked until there is nothing left to sell. Everything
    not taken is declined.
    """
    bids = listing_bids(db, listing.id)
    pending = [b for b in bids if b.status == "pending"]
    remaining = listing.volume_t - accepted_volume(bids)
    won: list[Bid] = []

    outright = next((b for b in pending if b.volume_t >= remaining > 0), None)
    if outright is not None:
        outright.status = "accepted"
        won.append(outright)
        remaining = 0
    else:
        for b in pending:
            if remaining <= 0:
                break
            b.status = "accepted"
            won.append(b)
            remaining -= b.volume_t

    for b in pending:
        if b.status == "pending":
            b.status = "rejected"

    for b in won:
        _order_for(db, b)
    return won


def _order_for(db: Session, bid: Bid) -> None:
    """A bid that wins becomes an order, whether it was accepted by hand or
    awarded automatically at the close."""
    from .engine import cheapest_haul, evaluate
    from .loaders import demand_from_requirement, supply_from_listing

    if db.query(Order).filter(Order.bid_id == bid.id).count():
        return
    ev = evaluate(supply_from_listing(bid.listing), demand_from_requirement(bid.requirement))
    haul = ev["haul"] if ev else cheapest_haul(bid.volume_t, 0)
    db.add(Order(
        bid_id=bid.id,
        status="accepted",
        delivered_per_t=ev["delivered_per_t"] if ev else bid.price_per_t,
        haul_json=json.dumps(haul),
    ))
    db.flush()


def settle_if_due(db: Session, listing: Listing) -> list[Bid]:
    """Close an auction whose end date has passed. Only a listing set to
    award automatically picks winners; the rest simply stop taking bids."""
    if not is_auction(listing) or listing.settled:
        return []
    if window_state(listing) != "closed":
        return []

    won: list[Bid] = []
    if listing.auto_award:
        won = award(db, listing)
    else:
        for b in listing_bids(db, listing.id):
            if b.status == "pending" and listing.bidding_closed:
                continue  # a seller who stopped early still decides by hand
    listing.settled = True
    db.flush()
    return won


def bidding_block(db: Session, listing: Listing, viewer_company_id: int | None) -> dict:
    """What both sides are allowed to see about the bidding.

    Amounts and counts are public. Who placed them is not: only the seller
    sees names, and that is on their own manage-bids screen.
    """
    bids = listing_bids(db, listing.id)
    live = [b for b in bids if b.status in ("pending", "accepted")]
    prices = [b.price_per_t for b in live]
    mine = [b for b in bids if b.buyer_company_id == viewer_company_id]
    taken = accepted_volume(bids)

    return {
        "mode": "auction" if is_auction(listing) else "direct",
        "state": window_state(listing),
        "start": listing.bid_start,
        "end": listing.bid_end,
        "closed_by_seller": listing.bidding_closed,
        "auto_award": listing.auto_award,
        "settled": listing.settled,
        "starting_price": listing.price_per_t,
        "bid_count": len(live),
        "highest": max(prices) if prices else None,
        "lowest": min(prices) if prices else None,
        "accepted_t": round(taken, 2),
        "remaining_t": round(max(0.0, listing.volume_t - taken), 2),
        "opens_at": listing.bid_start,
        "closes_at": listing.bid_end,
        "closes_in_minutes": minutes_until(listing.bid_end) if is_auction(listing) else None,
        "my_bids": [
            {
                "id": b.id,
                "volume_t": b.volume_t,
                "price_per_t": b.price_per_t,
                "status": b.status,
                "leading": bool(prices) and b.price_per_t == max(prices),
            }
            for b in mine
        ],
    }
