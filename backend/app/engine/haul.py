"""Pick the cheapest way to physically move the gas.

A logistics provider charges for the truck, not for how full it is: a
part-loaded tanker costs exactly what a full one costs. So the bill is
simply trips x rate x distance.
"""
import math

from .. import config


def cheapest_haul(volume_t: float, road_km: float) -> dict:
    """Lowest total cost across the truck classes, with the plan behind it."""
    best: dict | None = None
    for truck in config.TRUCKS:
        trips = max(1, math.ceil(volume_t / truck["cap_t"]))
        cost = trips * truck["rate_km"] * road_km
        plan = {
            "truck": truck["name"],
            "capacity_t": truck["cap_t"],
            "trips": trips,
            "distance_km": round(road_km, 1),
            "total_cost": round(cost),
            "cost_per_t": round(cost / volume_t) if volume_t else 0,
        }
        if best is None or (plan["total_cost"], plan["trips"]) < (
            best["total_cost"], best["trips"]
        ):
            best = plan
    assert best is not None
    return best
