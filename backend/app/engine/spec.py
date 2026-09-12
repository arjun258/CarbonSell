"""Whether a stream can be used at all.

There is no purification or cleanup pricing: a seller either meets the
buyer's spec or does not. Purity is a floor, and contaminant caps are a
filter only when the buyer has declared some.
"""


def meets_purity(purity_pct: float, min_purity_pct: float) -> bool:
    return purity_pct >= min_purity_pct


def contaminant_check(
    profile: dict[str, float], caps: dict[str, float]
) -> tuple[bool, list[dict]]:
    """Returns (passes, per-species detail for the UI).

    With no caps declared, contaminants are not considered at all - the
    buyer has said they do not care.
    """
    detail: list[dict] = []
    passes = True
    for species, cap_ppm in caps.items():
        actual = float(profile.get(species, 0.0))
        over = actual > cap_ppm
        if over:
            passes = False
        detail.append(
            {
                "species": species,
                "actual_ppm": actual,
                "cap_ppm": cap_ppm,
                "over": over,
            }
        )
    return passes, detail
