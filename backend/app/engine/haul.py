"""Pick the cheapest way to physically move the gas."""
import math

from .. import config


def cheapest_haul(volume_t: float, road_km: float) -> dict:
    """Lowest total cost across the truck classes, with the plan that produced it.

    Bigger tankers win on longer hauls; small volumes are punished by the
    empty return leg, which is exactly the argument for shared-truck pooling.
    """
    best: dict | None = None
    for truck in config.TRUCKS:
        trips = max(1, math.ceil(volume_t / truck["cap_t"]))
        cost = trips * (
            truck["rate_km"] * road_km * config.RETURN_FACTOR + config.HANDLING_PER_TRIP
        )
        plan = {
            "truck": truck["name"],
            "capacity_t": truck["cap_t"],
            "trips": trips,
            "distance_km": round(road_km, 1),
            "total_cost": round(cost),
            "cost_per_t": round(cost / volume_t),
            "utilisation": round(volume_t / (trips * truck["cap_t"]) * 100),
        }
        if best is None or (plan["total_cost"], plan["trips"]) < (
            best["total_cost"], best["trips"]
        ):
            best = plan
    assert best is not None
    return best
