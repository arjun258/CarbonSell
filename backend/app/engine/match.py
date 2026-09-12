"""Scoring and ranking. The product's whole argument lives in this file.

A match is never silently dropped for being imperfect: purity gaps and
over-cap contaminants are priced into the delivered cost and shown. Only
genuinely impossible matches disappear.
"""
from dataclasses import dataclass, field

from .. import config
from .cleanup import INFEASIBLE, contaminant_cleanup, purification_cost
from .distance import road_km
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
    lat: float
    lng: float
    storage_full: bool = False
    contaminants: dict[str, float] = field(default_factory=dict)


@dataclass
class Demand:
    volume_t: float
    min_purity_pct: float
    budget_per_t: float
    use_case: str
    lat: float
    lng: float
    caps: dict[str, float] = field(default_factory=dict)


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def evaluate(supply: Supply, demand: Demand) -> dict | None:
    """Full economics for one supply/demand pair. None means infeasible."""
    km, source = road_km(supply.lat, supply.lng, demand.lat, demand.lng)
    moved_t = min(supply.volume_t, demand.volume_t)
    haul = cheapest_haul(moved_t, km)

    purify_per_t, purity_gap = purification_cost(supply.purity_pct, demand.min_purity_pct)
    if purify_per_t == INFEASIBLE:
        return None

    cleanup_per_t, contaminant_detail = contaminant_cleanup(supply.contaminants, demand.caps)
    if cleanup_per_t == INFEASIBLE:
        return None

    delivered = supply.price_per_t + haul["cost_per_t"] + purify_per_t + cleanup_per_t

    price_fit = _clamp01((demand.budget_per_t - delivered) / demand.budget_per_t)
    purity_fit = 1.0 if purity_gap == 0 else _clamp01(1 - purity_gap / config.PURITY_GAP_CEILING)
    contaminant_fit = (
        1.0 if cleanup_per_t == 0
        else _clamp01(1 - cleanup_per_t / config.CLEANUP_FIT_SCALE)
    )
    volume_fit = _clamp01(supply.volume_t / demand.volume_t)
    distance_fit = _clamp01(1 - km / config.DISTANCE_FIT_CEILING_KM)
    rating_fit = _clamp01(supply.seller_rating / 5)

    if price_fit == 0 or purity_fit == 0 or contaminant_fit == 0:
        return None

    w = config.SCORE_WEIGHTS
    score = 100 * (
        w["price"] * price_fit
        + w["purity"] * purity_fit
        + w["distance"] * distance_fit
        + w["contaminant"] * contaminant_fit
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
        "purity_pct": supply.purity_pct,
        "volume_t": supply.volume_t,
        "form": supply.form,
        "source_type": supply.source_type,
        "storage_full": supply.storage_full,
        "score": round(score, 1),
        "delivered_per_t": round(delivered),
        "covers_t": round(moved_t, 1),
        "covers_requirement": supply.volume_t >= demand.volume_t,
        "breakdown": {
            "listing_per_t": round(supply.price_per_t),
            "haul_per_t": haul["cost_per_t"],
            "purification_per_t": round(purify_per_t),
            "cleanup_per_t": round(cleanup_per_t),
        },
        "purity_gap": round(purity_gap, 2),
        "haul": haul,
        "distance_km": km,
        "rate_source": source,
        "contaminants": supply.contaminants,
        "contaminant_detail": contaminant_detail,
        "fits": {
            "price": round(price_fit, 3),
            "purity": round(purity_fit, 3),
            "distance": round(distance_fit, 3),
            "contaminant": round(contaminant_fit, 3),
            "volume": round(volume_fit, 3),
            "rating": round(rating_fit, 3),
        },
    }


def rank(supplies: list[Supply], demand: Demand) -> list[dict]:
    scored = [m for s in supplies if (m := evaluate(s, demand)) is not None]
    # Emergency offers surface first among equals: an emitter with full
    # storage is discounting for a reason.
    scored.sort(key=lambda m: (-m["score"], not m["storage_full"]))
    return scored
