"""ORM -> engine dataclasses. Keeps the engine free of SQLAlchemy."""
from sqlalchemy.orm import Session

from .engine import Demand, Supply
from .models import Listing, Requirement


def supply_from_listing(listing: Listing) -> Supply:
    return Supply(
        id=listing.id,
        seller_id=listing.company_id,
        seller_name=listing.company.name,
        seller_category=listing.company.category,
        seller_rating=listing.company.rating,
        verified=listing.company.is_verified,
        purity_pct=listing.purity_pct,
        volume_t=listing.volume_t,
        price_per_t=listing.price_per_t,
        form=listing.form,
        source_type=listing.source_type,
        city=listing.address.city,
        lat=listing.address.lat,
        lng=listing.address.lng,
        storage_full=listing.storage_full,
        contaminants={c.species: c.ppm for c in listing.contaminants},
    )


def demand_from_requirement(req: Requirement) -> Demand:
    return Demand(
        volume_t=req.volume_t,
        min_purity_pct=req.min_purity_pct,
        budget_per_t=req.budget_per_t,
        lat=req.address.lat,
        lng=req.address.lng,
        caps={c.species: c.max_ppm for c in req.caps},
    )


def active_supplies(db: Session, region: str) -> list[Supply]:
    from .models import Address

    rows = (
        db.query(Listing)
        .join(Address, Listing.address_id == Address.id)
        .filter(Listing.status == "active", Address.region == region)
        .all()
    )
    return [supply_from_listing(r) for r in rows]
