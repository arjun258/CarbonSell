"""Demo data for one region: West India (Gujarat + Maharashtra).

Dense beats broad. 25 listings inside one corridor looks like a market;
the same 25 scattered across India looks like an empty product.

Run:  python -m app.seed
"""
from . import config
from .db import Base, SessionLocal, engine
from .models import (
    Address, Bid, CaptureMethod, Company, Contaminant, ContaminantCap,
    Listing, Message, Order, Requirement, Thread, User,
)
from .security import hash_password

PASSWORD = "demo1234"

# Contaminant fingerprints by capture route, in ppm. N2 is computed to
# close the mass balance against the declared purity, so every seeded
# listing has an honest profile.
PROFILES = {
    "refinery": {"O2": 500, "H2O": 25, "SO2": 8, "NOx": 12, "H2S": 1, "CO": 20, "HC": 60},
    "cement_scrub": {"O2": 12000, "H2O": 400, "SO2": 320, "NOx": 280, "H2S": 4, "CO": 150, "HC": 90},
    "cement_oxy": {"O2": 9000, "H2O": 250, "SO2": 180, "NOx": 90, "H2S": 2, "CO": 60, "HC": 50},
    "thermal": {"O2": 6000, "H2O": 300, "SO2": 250, "NOx": 220, "H2S": 3, "CO": 120, "HC": 70},
    "chem_pre": {"O2": 200, "H2O": 15, "SO2": 2, "NOx": 4, "H2S": 1, "CO": 30, "HC": 40},
    "fermentation": {"O2": 80, "H2O": 20, "SO2": 0, "NOx": 0, "H2S": 1, "CO": 5, "HC": 30},
    "steel": {"O2": 8000, "H2O": 350, "SO2": 300, "NOx": 200, "H2S": 12, "CO": 900, "HC": 120},
}

# (name, category, rating, phone, [(label, city, state, lat, lng)], [capture methods])
EMITTERS = [
    ("Jamnagar Refinery CO2 Unit", "Refinery", 4.5, "+91 98240 11901",
     [("Refinery Gate 3", "Jamnagar", "Gujarat", 22.4707, 70.0577),
      ("Sikka Terminal", "Sikka", "Gujarat", 22.4331, 69.8421)],
     ["Post-combustion amine"]),
    ("Kutch Cement Works", "Cement", 4.1, "+91 98252 40118",
     [("Bhuj Plant Gate 2", "Bhuj", "Gujarat", 23.2530, 69.6693),
      ("Anjar Grinding Unit", "Anjar", "Gujarat", 23.1120, 70.0270)],
     ["Flue-gas scrubbing", "Oxy-fuel"]),
    ("Dahej Petrochem", "Chemicals & fertiliser", 4.6, "+91 98795 22043",
     [("Dahej PCPIR Block C", "Dahej", "Gujarat", 21.7051, 72.5807),
      ("Ankleshwar Unit 2", "Ankleshwar", "Gujarat", 21.6279, 73.0143)],
     ["Pre-combustion"]),
    ("Ukai Thermal Power", "Thermal power", 3.9, "+91 98259 60712",
     [("Ukai Station Yard", "Ukai", "Gujarat", 21.2470, 73.5990)],
     ["Post-combustion amine"]),
    ("Bhavnagar Ethanol Works", "Ethanol & brewery", 4.4, "+91 99045 33820",
     [("Distillery Loading Bay", "Bhavnagar", "Gujarat", 21.7645, 72.1519)],
     ["Fermentation / bio-CO2"]),
    ("Chandrapur Super Thermal", "Thermal power", 4.0, "+91 90280 71455",
     [("CSTPS Gate 1", "Chandrapur", "Maharashtra", 19.9500, 79.2961)],
     ["Post-combustion amine"]),
    ("Solapur Cement", "Cement", 4.2, "+91 90110 28374",
     [("Solapur Kiln Yard", "Solapur", "Maharashtra", 17.6599, 75.9064)],
     ["Oxy-fuel"]),
    ("Dolvi Steel Works", "Steel", 4.3, "+91 98192 44560",
     [("Dolvi Plant North Gate", "Dolvi", "Maharashtra", 18.6500, 73.0500)],
     ["Flue-gas scrubbing"]),
]

BUYERS = [
    ("Kutch Methanol Ltd", "Methanol & synfuel", 4.4, "+91 98214 40210",
     [("Mundra SEZ Plot 14", "Mundra", "Gujarat", 22.8394, 69.7219),
      ("Anjar Receiving Station", "Anjar", "Gujarat", 23.1100, 70.0300)]),
    ("Panvel Beverage Bottlers", "Beverage carbonation", 4.7, "+91 98330 66112",
     [("Panvel Bottling Line", "Panvel", "Maharashtra", 18.9894, 73.1175)]),
    ("Nashik Greenhouse Cluster", "Greenhouse / agriculture", 4.2, "+91 94220 58907",
     [("Ozar Greenhouse Block", "Nashik", "Maharashtra", 19.9975, 73.7898)]),
    ("Bhavnagar Algae Farms", "Algae cultivation", 3.8, "+91 99783 12044",
     [("Ghogha Pond Facility", "Bhavnagar", "Gujarat", 21.7600, 72.1500)]),
    ("Nagpur CarbonCure Concrete", "Concrete curing", 4.3, "+91 90965 77320",
     [("Hingna Precast Yard", "Nagpur", "Maharashtra", 21.1458, 79.0882)]),
    ("Mumbai Dry Ice Co", "Dry ice", 4.0, "+91 98201 90455",
     [("Taloja MIDC Unit 7", "Taloja", "Maharashtra", 19.0800, 73.1000)]),
    ("Vadodara Urea Plant", "Urea / fertiliser", 4.5, "+91 98240 77301",
     [("Vadodara Ammonia Block", "Vadodara", "Gujarat", 22.3072, 73.1812)]),
]

# (emitter index, address index, volume_t, purity, form, price, profile, available, storage_full)
LISTINGS = [
    (0, 0, 220, 99.2, "liquid", 3100, "refinery", "2026-09-15", False),
    (0, 0, 90, 98.4, "gas", 2450, "refinery", "2026-09-20", False),
    (0, 1, 140, 99.0, "liquid", 3000, "refinery", "2026-10-01", False),
    (1, 0, 180, 92.0, "gas", 1550, "cement_scrub", "2026-09-14", False),
    (1, 0, 60, 96.4, "liquid", 2250, "cement_oxy", "2026-09-18", False),
    (1, 1, 120, 91.5, "gas", 1420, "cement_scrub", "2026-09-16", True),
    (2, 0, 260, 99.5, "liquid", 3350, "chem_pre", "2026-09-13", False),
    (2, 0, 110, 99.7, "liquid", 3400, "chem_pre", "2026-09-25", False),
    (2, 1, 95, 99.3, "liquid", 3150, "chem_pre", "2026-10-05", False),
    (3, 0, 300, 95.5, "gas", 1780, "thermal", "2026-09-15", False),
    (3, 0, 75, 94.2, "gas", 1600, "thermal", "2026-09-22", True),
    (4, 0, 85, 99.7, "liquid", 3250, "fermentation", "2026-09-14", False),
    (4, 0, 40, 99.5, "liquid", 3050, "fermentation", "2026-10-02", False),
    (5, 0, 340, 94.0, "gas", 1650, "thermal", "2026-09-13", False),
    (5, 0, 120, 95.8, "liquid", 2050, "thermal", "2026-09-19", False),
    (6, 0, 200, 96.5, "liquid", 2100, "cement_oxy", "2026-09-15", False),
    (6, 0, 80, 93.8, "gas", 1500, "cement_oxy", "2026-09-21", False),
    (7, 0, 160, 93.5, "gas", 1620, "steel", "2026-09-14", False),
    (7, 0, 55, 97.2, "liquid", 2400, "steel", "2026-09-28", False),
    (0, 1, 70, 99.6, "liquid", 3300, "refinery", "2026-09-17", False),
    (2, 1, 150, 98.9, "gas", 2700, "chem_pre", "2026-09-24", False),
    (3, 0, 45, 96.8, "liquid", 2300, "thermal", "2026-10-08", False),
    (1, 1, 65, 95.2, "liquid", 1950, "cement_oxy", "2026-09-27", False),
    (5, 0, 90, 96.2, "liquid", 2150, "thermal", "2026-10-03", False),
    (7, 0, 40, 92.8, "gas", 1480, "steel", "2026-09-30", True),
]

# (buyer index, address index, volume, min_purity, budget, use_case)
REQUIREMENTS = [
    (0, 0, 50, 99.0, 8500, "Methanol & synfuel"),
    (0, 1, 120, 98.5, 8000, "Methanol & synfuel"),
    (1, 0, 30, 99.9, 9500, "Beverage carbonation"),
    (2, 0, 25, 99.0, 8000, "Greenhouse / agriculture"),
    (3, 0, 40, 96.0, 6500, "Algae cultivation"),
    (4, 0, 60, 95.0, 6500, "Concrete curing"),
    (5, 0, 20, 99.5, 9000, "Dry ice"),
    (6, 0, 80, 98.5, 7500, "Urea / fertiliser"),
]


def build_profile(purity: float, fingerprint: str) -> dict[str, float]:
    """Close the mass balance: N2 soaks up whatever purity leaves over."""
    others = dict(PROFILES[fingerprint])
    budget_ppm = (100.0 - purity) * 10_000
    n2 = max(0.0, budget_ppm - sum(others.values()))
    return {"N2": round(n2), **others}


def email_for(name: str, role: str) -> str:
    slug = name.lower().split()[0].replace(",", "")
    return f"{role}@{slug}.demo"


def run() -> None:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    db = SessionLocal()

    emitters: list[Company] = []
    buyers: list[Company] = []

    def add_company(name, ctype, category, rating, phone, sites, kind, methods=()):
        c = Company(
            name=name, type=ctype, category=category, rating=rating, phone=phone,
            gstin=f"24{abs(hash(name)) % 10**9:09d}1Z5", is_verified=True,
        )
        db.add(c)
        db.flush()
        for i, (label, city, state, lat, lng) in enumerate(sites):
            db.add(Address(
                company_id=c.id, kind=kind, label=label, city=city, state=state,
                region=config.STATE_TO_REGION.get(state, config.DEFAULT_REGION),
                lat=lat, lng=lng, is_default=(i == 0),
                line1=f"{label}, {city}",
            ))
        for m in methods:
            db.add(CaptureMethod(company_id=c.id, method=m))
        db.flush()
        db.add(User(
            company_id=c.id, email=email_for(name, ctype),
            password_hash=hash_password(PASSWORD), role=ctype,
        ))
        return c

    for name, category, rating, phone, sites, methods in EMITTERS:
        emitters.append(add_company(name, "emitter", category, rating, phone, sites, "pickup", methods))
    for name, category, rating, phone, sites in BUYERS:
        buyers.append(add_company(name, "buyer", category, rating, phone, sites, "delivery"))
    db.flush()

    listings: list[Listing] = []
    for ei, ai, vol, purity, form, price, fp, avail, full in LISTINGS:
        company = emitters[ei]
        addr = sorted(company.addresses, key=lambda a: a.id)[ai]
        method = sorted(company.capture_methods, key=lambda m: m.id)
        source = method[0].method if fp != "cement_oxy" or len(method) == 1 else method[-1].method
        listing = Listing(
            company_id=company.id, address_id=addr.id, volume_t=vol, purity_pct=purity,
            form=form, price_per_t=price, available_from=avail, source_type=source,
            lab_report=f"lab-{company.id}-{len(listings)+1}.pdf", storage_full=full,
        )
        db.add(listing)
        db.flush()
        for species, ppm in build_profile(purity, fp).items():
            db.add(Contaminant(listing_id=listing.id, species=species, ppm=ppm))
        listings.append(listing)

    requirements: list[Requirement] = []
    for bi, ai, vol, min_purity, budget, use_case in REQUIREMENTS:
        company = buyers[bi]
        addr = sorted(company.addresses, key=lambda a: a.id)[ai]
        req = Requirement(
            company_id=company.id, address_id=addr.id, volume_t=vol,
            min_purity_pct=min_purity, budget_per_t=budget, use_case=use_case,
        )
        db.add(req)
        db.flush()
        for species, cap in config.USE_CASE_PRESETS[use_case]["caps"].items():
            db.add(ContaminantCap(requirement_id=req.id, species=species, max_ppm=cap))
        requirements.append(req)

    # A little history so no dashboard opens empty.
    # Demo path: Nagpur concrete curing <-> Chandrapur thermal, the pair the
    # ranking picks. An open conversation with the number still hidden, so
    # the contact-reveal step has something to reveal.
    thread = Thread(
        listing_id=listings[13].id, buyer_company_id=buyers[4].id,
        seller_company_id=listings[13].company_id, contact_shared=False,
    )
    db.add(thread)
    db.flush()
    db.add(Message(thread_id=thread.id, sender_company_id=buyers[4].id,
                   body="Can you hold 60 t/month on a rolling contract? We cure precast daily."))
    db.add(Message(thread_id=thread.id, sender_company_id=listings[13].company_id,
                   body="Yes, 60 t is comfortable off this stream. Purity holds at 94% +/- 0.4."))

    bid = Bid(
        listing_id=listings[14].id, requirement_id=requirements[5].id,
        buyer_company_id=buyers[4].id, volume_t=60, price_per_t=2050,
        status="pending", note="Can you hold this rate for a 3-month contract?",
    )
    db.add(bid)

    accepted = Bid(
        listing_id=listings[9].id, requirement_id=requirements[7].id,
        buyer_company_id=buyers[6].id, volume_t=80, price_per_t=1780, status="accepted",
    )
    db.add(accepted)
    db.flush()
    db.add(Order(bid_id=accepted.id, status="accepted", delivered_per_t=4120))

    db.commit()

    counts = {
        "companies": db.query(Company).count(),
        "addresses": db.query(Address).count(),
        "users": db.query(User).count(),
        "listings": db.query(Listing).count(),
        "contaminant rows": db.query(Contaminant).count(),
        "requirements": db.query(Requirement).count(),
        "caps": db.query(ContaminantCap).count(),
        "bids": db.query(Bid).count(),
        "orders": db.query(Order).count(),
        "threads": db.query(Thread).count(),
        "messages": db.query(Message).count(),
    }
    print("seeded West India (Gujarat + Maharashtra)")
    for k, v in counts.items():
        print(f"  {v:>4}  {k}")
    print(f"\n  login: any of these / {PASSWORD}")
    for u in db.query(User).order_by(User.id).all():
        print(f"    {u.email:<34} {u.role:<8} {u.company.name}")
    db.close()


if __name__ == "__main__":
    run()
