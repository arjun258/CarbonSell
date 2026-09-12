"""The ranking is the product, so it gets verified before any UI exists.

Run:  python -m app.test_engine        (prints the market)
      pytest app/test_engine.py -q    (asserts the headline case)
"""
from .db import SessionLocal
from .engine import cheapest_haul, rank
from .loaders import active_supplies, demand_from_requirement
from .models import Requirement


def market_for(use_case: str):
    db = SessionLocal()
    req = db.query(Requirement).filter(Requirement.use_case == use_case).first()
    assert req is not None, f"no seeded requirement for {use_case}"
    matches = rank(active_supplies(db, "west"), demand_from_requirement(req))
    label = (
        f"{req.company.name} — {use_case} — {req.volume_t:.0f} t/mo, "
        f"min {req.min_purity_pct}%, budget Rs {req.budget_per_t:,.0f}/t"
    )
    db.close()
    return label, matches


def show(use_case: str, limit: int = 6) -> None:
    label, matches = market_for(use_case)
    print(f"\n{label}")
    print(f"{len(matches)} feasible matches\n")
    head = f"{'#':>2} {'seller':<28}{'city':<12}{'pur%':>6}{'km':>6}{'truck':>26}{'trips':>6}{'dlvd/t':>9}{'score':>7}"
    print(head)
    print("-" * len(head))
    for i, m in enumerate(matches[:limit], 1):
        print(
            f"{i:>2} {m['seller_name'][:27]:<28}{m['city'][:11]:<12}"
            f"{m['purity_pct']:>6.1f}{m['distance_km']:>6.0f}"
            f"{m['haul']['truck']:>26}{m['haul']['trips']:>6}"
            f"{m['delivered_per_t']:>9,}{m['score']:>7.1f}"
        )
    if matches:
        b = matches[0]["breakdown"]
        print(
            f"\n   #1 breakdown/t: listing {b['listing_per_t']:,} + haul {b['haul_per_t']:,}"
            f" + purify {b['purification_per_t']:,} + cleanup {b['cleanup_per_t']:,}"
            f" = {matches[0]['delivered_per_t']:,}   [{matches[0]['rate_source']}]"
        )


def test_haul_prefers_bigger_trucks_on_long_hauls():
    assert cheapest_haul(50, 340)["capacity_t"] >= 18
    assert cheapest_haul(5, 40)["capacity_t"] == 6


def test_haul_penalises_small_volumes_per_tonne():
    """The empty return leg is why pooling matters."""
    assert cheapest_haul(5, 300)["cost_per_t"] > cheapest_haul(60, 300)["cost_per_t"]


def test_headline_case_transport_beats_purity():
    """Concrete curing in Nagpur. The claim the whole product rests on:
    the best delivered price is a nearby mid-purity stream, not the
    purest gas on the platform - because haulage dominates the bill."""
    _, matches = market_for("Concrete curing")
    assert matches, "no feasible matches for concrete curing"
    top = matches[0]
    purest = max(matches, key=lambda m: m["purity_pct"])

    assert top["listing_id"] != purest["listing_id"], "top match is also the purest: no story"
    assert purest["delivered_per_t"] > top["delivered_per_t"], "the purest option must cost more"
    assert top["haul"]["cost_per_t"] < purest["haul"]["cost_per_t"], "haulage should be the reason"
    # And a sub-spec stream needing purification still beats the far clean one.
    sub_spec = [m for m in matches if m["purity_gap"] > 0]
    assert sub_spec, "no purification case in the market"
    assert sub_spec[0]["delivered_per_t"] < purest["delivered_per_t"]


def test_contaminant_gate_drops_impossible_streams():
    """Beverage caps are single-digit ppm; a cement scrubber stream is
    orders of magnitude over and must not appear at any price."""
    _, matches = market_for("Beverage carbonation")
    assert matches
    assert not any("Cement" in m["seller_name"] for m in matches), [
        m["seller_name"] for m in matches
    ]


if __name__ == "__main__":
    for uc in ("Concrete curing", "Methanol & synfuel", "Beverage carbonation"):
        show(uc)
