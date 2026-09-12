"""Request bodies, and the serializers that decide what leaves the server.

Phone masking happens here and nowhere else. A masked number must never
be sent to the browser in full - CSS is not privacy.
"""
from pydantic import BaseModel, EmailStr, Field

from .models import Address, Company, Listing, Order, Requirement, Thread


# ------------------------------------------------------------------ in
class AddressIn(BaseModel):
    label: str
    city: str
    state: str
    line1: str = ""
    pincode: str = ""
    lat: float
    lng: float
    is_default: bool = False
    kind: str | None = None


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: str                      # emitter | buyer
    company_name: str
    category: str
    phone: str
    addresses: list[AddressIn] = []
    capture_methods: list[str] = []


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ContaminantIn(BaseModel):
    species: str
    ppm: float


class ListingIn(BaseModel):
    address_id: int
    volume_t: float
    purity_pct: float
    form: str = "liquid"
    price_per_t: float            # the starting price when bidding is open
    available_from: str
    source_type: str
    lab_report: str = ""
    storage_full: bool = False
    contaminants: list[ContaminantIn] = []
    bid_start: str = ""
    bid_end: str = ""
    auto_award: bool = False


class ListingPatch(BaseModel):
    """What a seller can change on a live listing."""
    price_per_t: float | None = None
    bid_start: str | None = None
    bid_end: str | None = None
    auto_award: bool | None = None
    bidding_closed: bool | None = None
    status: str | None = None


class CapIn(BaseModel):
    species: str
    max_ppm: float


class RequirementIn(BaseModel):
    address_id: int
    volume_t: float
    min_purity_pct: float
    budget_per_t: float
    caps: list[CapIn] = []


class CaptureMethodIn(BaseModel):
    method: str = Field(min_length=2, max_length=60)


class BidIn(BaseModel):
    listing_id: int
    requirement_id: int
    volume_t: float
    price_per_t: float
    note: str = ""


class PickupIn(BaseModel):
    address_id: int
    scheduled_date: str
    slot: str
    vehicle_type: str
    contact_name: str
    contact_phone: str


class MessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class ThreadIn(BaseModel):
    listing_id: int
    buyer_company_id: int | None = None   # sellers opening a thread with a bidder


class StatusIn(BaseModel):
    status: str


# ------------------------------------------------------------------ out
def mask_phone(phone: str) -> str:
    """+91 98214 40210 -> +91 98••• ••210"""
    digits = [c for c in phone if c.isdigit()]
    if len(digits) < 6:
        return "•••"
    return f"+91 {''.join(digits[-10:-8])}••• ••{''.join(digits[-3:])}"


def address_out(a: Address) -> dict:
    return {
        "id": a.id, "kind": a.kind, "label": a.label, "line1": a.line1,
        "city": a.city, "state": a.state, "region": a.region,
        "pincode": a.pincode, "lat": a.lat, "lng": a.lng,
        "is_default": a.is_default,
    }


def company_out(c: Company, *, reveal_phone: bool = False) -> dict:
    return {
        "id": c.id, "name": c.name, "type": c.type, "category": c.category,
        "rating": c.rating, "is_verified": c.is_verified, "gstin": c.gstin,
        "phone": c.phone if reveal_phone else mask_phone(c.phone),
        "phone_revealed": reveal_phone,
    }


def listing_out(l: Listing, *, reveal_phone: bool = False) -> dict:
    return {
        "id": l.id,
        "seller": company_out(l.company, reveal_phone=reveal_phone),
        "address": address_out(l.address),
        "volume_t": l.volume_t, "purity_pct": l.purity_pct, "form": l.form,
        "price_per_t": l.price_per_t, "available_from": l.available_from,
        "source_type": l.source_type, "lab_report": l.lab_report,
        "storage_full": l.storage_full, "status": l.status,
        "bid_start": l.bid_start, "bid_end": l.bid_end,
        "bidding_closed": l.bidding_closed, "auto_award": l.auto_award,
        "contaminants": [
            {"species": c.species, "ppm": c.ppm}
            for c in sorted(l.contaminants, key=lambda c: -c.ppm)
        ],
        "unaccounted_ppm": round(
            (100.0 - l.purity_pct) * 10_000 - sum(c.ppm for c in l.contaminants)
        ),
    }


def requirement_out(r: Requirement) -> dict:
    return {
        "id": r.id, "company_id": r.company_id, "address": address_out(r.address),
        "volume_t": r.volume_t, "min_purity_pct": r.min_purity_pct,
        "budget_per_t": r.budget_per_t,
        "caps": [{"species": c.species, "max_ppm": c.max_ppm} for c in r.caps],
    }


def thread_out(t: Thread, *, viewer_company_id: int) -> dict:
    reveal = t.contact_shared
    counterpart = t.seller if viewer_company_id == t.buyer_company_id else t.buyer
    return {
        "id": t.id,
        "listing_id": t.listing_id,
        "listing_purity": t.listing.purity_pct,
        "listing_city": t.listing.address.city,
        "buyer_company_id": t.buyer_company_id,
        "seller_company_id": t.seller_company_id,
        "contact_shared": t.contact_shared,
        "counterpart": company_out(counterpart, reveal_phone=reveal),
        "viewer_is_seller": viewer_company_id == t.seller_company_id,
        "last_message": t.messages[-1].body if t.messages else "",
        "message_count": len(t.messages),
    }


def order_out(o: Order, *, viewer_company_id: int) -> dict:
    import json

    bid = o.bid
    listing = bid.listing
    # Both numbers unmask once a deal is accepted: they are doing business.
    other = listing.company if viewer_company_id == bid.buyer_company_id else bid.buyer
    return {
        "id": o.id, "status": o.status, "created_at": o.created_at.isoformat(),
        "volume_t": bid.volume_t, "price_per_t": bid.price_per_t,
        "delivered_per_t": o.delivered_per_t,
        "total_value": round(bid.volume_t * bid.price_per_t),
        "haul": json.loads(o.haul_json) if o.haul_json else None,
        "listing": {
            "id": listing.id, "purity_pct": listing.purity_pct,
            "city": listing.address.city, "form": listing.form,
        },
        "counterpart": company_out(other, reveal_phone=True),
        "viewer_is_seller": viewer_company_id == listing.company_id,
        "pickup": None if o.pickup is None else {
            "scheduled_date": o.pickup.scheduled_date, "slot": o.pickup.slot,
            "vehicle_type": o.pickup.vehicle_type,
            "contact_name": o.pickup.contact_name,
            "contact_phone": o.pickup.contact_phone,
            "address": address_out(o.pickup.address),
        },
    }
