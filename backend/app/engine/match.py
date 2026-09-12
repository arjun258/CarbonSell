"""Scoring and ranking. The product's whole argument lives in this file.

A match is never silently dropped for being imperfect: purity gaps and
over-cap contaminants are priced into the delivered cost and shown. Only
genuinely impossible matches disappear.
"""
from dataclasses import dataclass, field

from .. import config
from .distance import road_km
from .spec import contaminant_check, meets_purity
from .haul import cheapest_haul


@dataclass
class Supply:
    id: int
    seller_id: int
    seller_name: str
    seller_category: str
    seller_rating: float
    verified: bool
    purity_pct: float
    volume_t: float
    price_per_t: float
    form: str
    source_type: str
    city: str
    address_label: str
    address_line: str
    lat: float
    lng: float
    storage_full: bool = False
    contaminants: dict[str, float] = field(default_factory=dict)


@dataclass
class Demand:
    volume_t: float
    min_purity_pct: float
    budget_per_t: float
    lat: float
    lng: float
    caps: dict[str, float] = field(default_factory=dict)


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def evaluate(supply: Supply, demand: Demand) -> dict | None:
    """Full economics for one supply/demand pair. None means it cannot be used.

    Delivered cost is the seller's price plus haulage. Purity, contaminant
    caps and the buyer's price ceiling are pass/fail: we do not price a
    clean-up we are not offering to do.
    """
    if not meets_purity(supply.purity_pct, demand.min_purity_pct):
        return None

    # budget_per_t is what the buyer will pay for the gas itself. Haulage
    # is quoted on top and shown separately.
    if supply.price_per_t > demand.budget_per_t:
        return None

    passes, contaminant_detail = contaminant_check(supply.contaminants, demand.caps)
    if not passes:
        return None

    km, source = road_km(supply.lat, supply.lng, demand.lat, demand.lng)
    moved_t = min(supply.volume_t, demand.volume_t)
    haul = cheapest_haul(moved_t, km)

    delivered = supply.price_per_t + haul["cost_per_t"]
    total_cost = delivered * moved_t

    # Purity and distance are scored by closeness to what the buyer asked
    # for. Price is not: there is no such thing as gas that is too cheap,
    # so the further under the ceiling, the better.
    price_fit = _clamp01(
        (demand.budget_per_t - supply.price_per_t) / demand.budget_per_t
    )

    headroom = 100.0 - demand.min_purity_pct
    purity_fit = (
        1.0
        if headroom <= 0
        else _clamp01(1 - (supply.purity_pct - demand.min_purity_pct) / headroom)
    )
    volume_fit = _clamp01(supply.volume_t / demand.volume_t)
    distance_fit = _clamp01(1 - km / config.DISTANCE_FIT_CEILING_KM)
    rating_fit = _clamp01(supply.seller_rating / 5)

    w = config.SCORE_WEIGHTS
    score = 100 * (
        w["price"] * price_fit
        + w["distance"] * distance_fit
        + w["purity"] * purity_fit
        + w["volume"] * volume_fit
        + w["rating"] * rating_fit
    )

    return {
        "listing_id": supply.id,
        "seller_id": supply.seller_id,
        "seller_name": supply.seller_name,
        "seller_category": supply.seller_category,
        "seller_rating": supply.seller_rating,
        "verified": supply.verified,
        "city": supply.city,
        "address_label": supply.address_label,
        "address_line": supply.address_line,
        "purity_pct": supply.purity_pct,
        "volume_t": supply.volume_t,
        "form": supply.form,
        "source_type": supply.source_type,
        "storage_full": supply.storage_full,
        "score": round(score, 1),
        "delivered_per_t": round(delivered, 2),
        "total_cost": round(total_cost, 2),
        "covers_t": round(moved_t, 2),
        "covers_requirement": supply.volume_t >= demand.volume_t,
        "breakdown": {
            "listing_per_t": round(supply.price_per_t, 2),
            "haul_per_t": haul["cost_per_t"],
        },
        "haul": haul,
        "distance_km": km,
        "rate_source": source,
        "contaminants": supply.contaminants,
        "contaminant_detail": contaminant_detail,
        "fits": {
            "price": round(price_fit, 3),
            "distance": round(distance_fit, 3),
            "purity": round(purity_fit, 3),
            "volume": round(volume_fit, 3),
            "rating": round(rating_fit, 3),
        },
    }


def rank(supplies: list[Supply], demand: Demand) -> list[dict]:
    scored = [m for s in supplies if (m := evaluate(s, demand)) is not None]

    # Distance is the one factor the buyer sets no target for, so it is
    # scored against the closest seller who actually qualifies: the nearest
    # option is 1.0 and everything else is judged by how near it comes.
    if scored:
        nearest = min(m["distance_km"] for m in scored) or 1.0
        w = config.SCORE_WEIGHTS
        for m in scored:
            m["fits"]["distance"] = round(
                _clamp01(nearest / m["distance_km"]) if m["distance_km"] else 1.0, 3
            )
            m["score"] = round(
                100 * sum(w[k] * m["fits"][k] for k in w), 1
            )

    # Emergency offers surface first among equals: an emitter with full
    # storage is discounting for a reason.
    scored.sort(key=lambda m: (-m["score"], not m["storage_full"]))
    return scored
