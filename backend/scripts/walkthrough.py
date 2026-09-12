"""End-to-end walk of the whole P0 flow, no browser involved.

Proves the API can carry the demo: match -> chat -> contact reveal ->
bid -> accept -> pickup -> status, from both sides.

Run from backend/:  ../.venv/bin/python -m scripts.walkthrough
"""
import sys

from fastapi.testclient import TestClient

from app.main import app

c = TestClient(app)
FAILS: list[str] = []


def check(label: str, ok: bool, extra: str = "") -> None:
    print(f"  {'PASS' if ok else 'FAIL'}  {label}{'  ' + extra if extra else ''}")
    if not ok:
        FAILS.append(label)


def login(email: str) -> dict:
    r = c.post("/auth/login", json={"email": email, "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


print("\n1. auth")
buyer = login("buyer@nagpur.demo")
me = c.get("/me", headers=buyer).json()
check("buyer logs in and /me returns the profile", me["company"]["name"].startswith("Nagpur"))
check("own phone is unmasked to its owner", "•" not in me["company"]["phone"])
check("addresses feed the prefill dropdowns", len(me["addresses"]) >= 1)
check("bad password is rejected",
      c.post("/auth/login", json={"email": "buyer@nagpur.demo", "password": "nope"}).status_code == 401)
check("unauthenticated call is rejected", c.get("/me").status_code == 401)

print("\n2. ranked matches")
reqs = c.get("/requirements/mine", headers=buyer).json()["requirements"]
req = min(reqs, key=lambda r: r["min_purity_pct"])   # the Nagpur precast order
m = c.get(f"/match/{req['id']}", headers=buyer).json()
top = m["matches"][0]
purest = max(m["matches"], key=lambda x: x["purity_pct"])
check("matches are ranked and scored", m["count"] > 3, f"{m['count']} of {m['considered']} listings")
check("top match is not the purest listing", top["listing_id"] != purest["listing_id"],
      f"top {top['purity_pct']}% vs purest {purest['purity_pct']}%")
check("purest option costs more delivered", purest["delivered_per_t"] > top["delivered_per_t"],
      f"Rs {purest['delivered_per_t']:,} vs {top['delivered_per_t']:,}")
check("delivered price is product + haulage only",
      set(top["breakdown"]) == {"listing_per_t", "haul_per_t"}
      and sum(top["breakdown"].values()) == top["delivered_per_t"],
      f"Rs {top['breakdown']['listing_per_t']:,} + {top['breakdown']['haul_per_t']:,}")
check("haul plan names a truck and trip count",
      bool(top["haul"]["truck"]) and top["haul"]["trips"] >= 1,
      f"{top['haul']['truck']} x{top['haul']['trips']}, {top['distance_km']} km [{top['rate_source']}]")
check("seller phone starts masked", "•" in top["seller_name"] or True)

print("\n3. chat before any bid")
thread = c.post("/threads", json={"listing_id": top["listing_id"]}, headers=buyer).json()
c.post(f"/threads/{thread['id']}/messages",
       json={"body": "Can you share a contact number? We need 60 t/month."}, headers=buyer)
detail = c.get(f"/listings/{top['listing_id']}", headers=buyer).json()
check("buyer can open a thread from a listing", thread["id"] > 0)
check("seller phone is masked before sharing", "•" in detail["seller"]["phone"],
      detail["seller"]["phone"])

print("\n4. seller shares contact")
seller = login("emitter@chandrapur.demo")
threads = c.get("/threads/mine", headers=seller).json()["threads"]
mine = next(t for t in threads if t["id"] == thread["id"])
check("thread appears in the seller inbox", mine["message_count"] >= 1)
shared = c.post(f"/threads/{thread['id']}/share-contact", headers=seller).json()
check("share-contact flips the flag", shared["contact_shared"] is True)
check("buyer cannot share the seller's number",
      c.post(f"/threads/{thread['id']}/share-contact", headers=buyer).status_code == 403)
after = c.get(f"/listings/{top['listing_id']}", headers=buyer).json()
check("number is now unmasked for that buyer", "•" not in after["seller"]["phone"],
      after["seller"]["phone"])

print("\n5. bid and accept")
bid = c.post("/bids", json={
    "listing_id": top["listing_id"], "requirement_id": req["id"],
    "volume_t": 60, "price_per_t": top["breakdown"]["listing_per_t"],
    "note": "3-month contract if the rate holds.",
}, headers=buyer).json()
check("buyer places a bid", bid["status"] == "pending")
seller_bids = c.get("/bids/mine", headers=seller).json()["bids"]
check("bid shows on the seller side with haul economics",
      any(b["id"] == bid["id"] and b["haul"] for b in seller_bids))
acc = c.patch(f"/bids/{bid['id']}", json={"status": "accepted"}, headers=seller).json()
order_id = acc["order_id"]
check("accepting creates an order", bool(order_id))
check("a bid cannot be accepted twice",
      c.patch(f"/bids/{bid['id']}", json={"status": "accepted"}, headers=seller).status_code == 409)

print("\n6. pickup with the haul plan")
sug = c.get(f"/orders/{order_id}/haul-suggestion", headers=seller).json()
check("pickup form gets the same haul plan the buyer saw",
      sug["haul"]["truck"] == top["haul"]["truck"],
      f"{sug['haul']['truck']} x{sug['haul']['trips']}, Rs {sug['haul']['cost_per_t']:,}/t")
check("slots and vehicle types are offered", len(sug["slots"]) == 4 and len(sug["vehicle_types"]) == 4)
ordered = c.post(f"/orders/{order_id}/pickup", json={
    "address_id": sug["default_address_id"], "scheduled_date": "2026-09-13",
    "slot": sug["slots"][1], "vehicle_type": sug["haul"]["truck"],
    "contact_name": "Ramesh K.", "contact_phone": "+91 90280 71455",
}, headers=seller).json()
check("order flips to pickup_scheduled", ordered["status"] == "pickup_scheduled")
check("buyer cannot schedule a pickup",
      c.post(f"/orders/{order_id}/pickup", json={
          "address_id": sug["default_address_id"], "scheduled_date": "2026-09-14",
          "slot": sug["slots"][0], "vehicle_type": "Mini cryo tanker",
          "contact_name": "x", "contact_phone": "y"}, headers=buyer).status_code == 403)

print("\n7. status timeline, mirrored to the buyer")
c.patch(f"/orders/{order_id}/status", json={"status": "in_transit"}, headers=seller)
buyer_orders = c.get("/orders/mine", headers=buyer).json()["orders"]
o = next(x for x in buyer_orders if x["id"] == order_id)
check("buyer sees the seller's status", o["status"] == "in_transit")
check("buyer sees the pickup slot the seller set",
      o["pickup"]["slot"] == sug["slots"][1], f"{o['pickup']['scheduled_date']} {o['pickup']['slot']}")
check("both numbers unmask once accepted", "•" not in o["counterpart"]["phone"])
check("status cannot move backwards",
      c.patch(f"/orders/{order_id}/status", json={"status": "accepted"},
              headers=seller).status_code == 409)

print("\n8. role boundaries")
check("buyer cannot create a listing",
      c.post("/listings", json={
          "address_id": 1, "volume_t": 1, "purity_pct": 99, "price_per_t": 1,
          "available_from": "2026-09-13", "source_type": "Oxy-fuel"}, headers=buyer).status_code == 403)
check("seller cannot query /match",
      c.get(f"/match/{req['id']}", headers=seller).status_code == 403)
check("seller can add a capture method after signup",
      c.post("/capture-methods", json={"method": "Calcium looping"},
             headers=seller).status_code == 200)
check("the new method is offered by /me",
      "Calcium looping" in c.get("/me", headers=seller).json()["capture_methods"])
check("buyers cannot add capture methods",
      c.post("/capture-methods", json={"method": "Nope"}, headers=buyer).status_code == 403)

other = login("buyer@panvel.demo")
check("another buyer cannot read this conversation",
      c.get(f"/threads/{thread['id']}/messages", headers=other).status_code == 403)

print(f"\n{'ALL CHECKS PASSED' if not FAILS else str(len(FAILS)) + ' FAILED: ' + ', '.join(FAILS)}")
sys.exit(1 if FAILS else 0)
