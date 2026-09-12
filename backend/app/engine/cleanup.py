"""What it costs to make a stream meet a buyer's spec.

Two separate problems: raising bulk CO2 purity, and removing a specific
contaminant below a cap. Neither hides a listing - both price it.
"""
from .. import config

INFEASIBLE = float("inf")


def purification_cost(purity: float, min_purity: float) -> tuple[float, float]:
    """Returns (cost_per_tonne, gap_in_points). Superlinear: the last
    points of purity cost the most."""
    gap = max(0.0, min_purity - purity)
    if gap == 0:
        return 0.0, 0.0
    if gap > config.PURITY_GAP_CEILING:
        return INFEASIBLE, gap
    return config.PURIFICATION_BASE * (gap ** config.PURIFICATION_EXP), gap


def contaminant_cleanup(
    profile: dict[str, float], caps: dict[str, float]
) -> tuple[float, list[dict]]:
    """Returns (cost_per_tonne, per-species detail for the UI).

    A species more than CLEANUP_INFEASIBLE_MULTIPLE over its cap drops the
    match: pricing that would be fiction.
    """
    total = 0.0
    detail: list[dict] = []
    for species, cap_ppm in caps.items():
        actual = float(profile.get(species, 0.0))
        row = {
            "species": species, "actual_ppm": actual, "cap_ppm": cap_ppm,
            "over": actual > cap_ppm, "cost_per_t": 0.0, "infeasible": False,
        }
        if actual > cap_ppm:
            if actual > cap_ppm * config.CLEANUP_INFEASIBLE_MULTIPLE:
                row["infeasible"] = True
                detail.append(row)
                return INFEASIBLE, detail
            over = (actual - cap_ppm) / max(cap_ppm, 1.0)
            cost = config.REMOVAL_COST_PER_T.get(species, 400) * (
                0.4 + 0.6 * min(over, 3.0) / 3.0
            )
            row["cost_per_t"] = round(cost)
            total += cost
        detail.append(row)
    return total, detail
