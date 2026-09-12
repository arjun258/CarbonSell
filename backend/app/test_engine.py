"""The ranking is the product, so it gets verified before any UI exists.

Run:  python -m app.test_engine        (prints the market)
      pytest app/test_engine.py -q    (asserts the headline case)
"""
from .db import SessionLocal
from .engine import cheapest_haul, rank
from .loaders import active_supplies, demand_from_requirement
from .models import Company, Requirement


def market_for(company_fragment: str):
    """Rank the market for the first requirement of a named buyer."""
    db = SessionLocal()
    req = (
        db.query(Requirement)
        .join(Company, Requirement.company_id == Company.id)
        .filter(Company.name.like(f"%{company_fragment}%"))
        .order_by(Requirement.id)
        .first()
    )
    assert req is not None, f"no seeded requirement for {company_fragment}"
    matches = rank(active_supplies(db, "west"), demand_from_requirement(req))
    caps = ", ".join(f"{c.species}<={c.max_ppm:.0f}" for c in req.caps) or "no caps"
    label = (
        f"{req.company.name} — {req.company.category} — {req.volume_t:.0f} t/mo, "
        f"min {req.min_purity_pct}%, budget Rs {req.budget_per_t:,.0f}/t, {caps}"
    )
    db.close()
    return label, matches


def show(company_fragment: str, limit: int = 6) -> None:
    label, matches = market_for(company_fragment)
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
            f"\n   #1 breakdown/t: listing {b['listing_per_t']:,}"
            f" + haul {b['haul_per_t']:,} = {matches[0]['delivered_per_t']:,}"
            f"   [{matches[0]['rate_source']}]"
        )


def test_haul_prefers_bigger_trucks_on_long_hauls():
    assert cheapest_haul(50, 340)["capacity_t"] >= 18
    assert cheapest_haul(5, 40)["capacity_t"] == 6


def test_haul_penalises_small_volumes_per_tonne():
    """The empty return leg is why pooling matters."""
    assert cheapest_haul(5, 300)["cost_per_t"] > cheapest_haul(60, 300)["cost_per_t"]


def test_headline_case_transport_beats_purity():
    """Nagpur precast concrete. The claim the whole product rests on: the
    best delivered price is a nearby lower-purity stream, not the purest
    gas on the platform - because haulage dominates the bill."""
    _, matches = market_for("Nagpur")
    assert matches, "no feasible matches for the Nagpur requirement"
    top = matches[0]
    purest = max(matches, key=lambda m: m["purity_pct"])

    assert top["listing_id"] != purest["listing_id"], "top match is also the purest: no story"
    assert purest["delivered_per_t"] > top["delivered_per_t"], "the purest option must cost more"
    assert top["haul"]["cost_per_t"] < purest["haul"]["cost_per_t"], "haulage should be the reason"


def test_delivered_price_is_only_product_plus_haulage():
    _, matches = market_for("Nagpur")
    for m in matches:
        assert set(m["breakdown"]) == {"listing_per_t", "haul_per_t"}
        assert sum(m["breakdown"].values()) == m["delivered_per_t"]


def test_purity_is_a_floor_not_a_charge():
    """Nothing below the buyer's minimum appears at any price."""
    db = SessionLocal()
    req = (
        db.query(Requirement).join(Company, Requirement.company_id == Company.id)
        .filter(Company.name.like("%Nagpur%")).order_by(Requirement.id).first()
    )
    floor = req.min_purity_pct
    db.close()
    _, matches = market_for("Nagpur")
    assert all(m["purity_pct"] >= floor for m in matches)


def test_declared_caps_filter_and_absent_caps_do_not():
    """A buyer who declares caps gets them enforced; a buyer who declares
    none is not filtered on contaminants at all."""
    _, capped = market_for("Vadodara")          # H2S <= 10 ppm
    assert capped
    for m in capped:
        assert m["contaminant_detail"], "caps should be reported back"
        assert all(not d["over"] for d in m["contaminant_detail"])

    _, uncapped = market_for("Bhavnagar Algae")  # no caps declared
    assert uncapped
    assert all(m["contaminant_detail"] == [] for m in uncapped)


if __name__ == "__main__":
    for buyer in ("Nagpur", "Kutch Methanol", "Panvel"):
        show(buyer)
