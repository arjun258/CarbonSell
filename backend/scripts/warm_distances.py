"""Precompute every pickup-to-delivery distance and persist the cache.

Run once after seeding. Turns a 90-call cold start into an instant one and
makes the demo independent of the venue's wifi.

Run from backend/:  ../.venv/bin/python -m scripts.warm_distances
"""
import time

from app.db import SessionLocal
from app.engine.distance import CACHE_PATH, road_km
from app.models import Address

db = SessionLocal()
pickups = db.query(Address).filter(Address.kind == "pickup").all()
deliveries = db.query(Address).filter(Address.kind == "delivery").all()
pairs = [(p, d) for p in pickups for d in deliveries]

print(f"warming {len(pairs)} pairs ({len(pickups)} pickup x {len(deliveries)} delivery)")
sources: dict[str, int] = {}
started = time.time()
for i, (p, d) in enumerate(pairs, 1):
    km, source = road_km(p.lat, p.lng, d.lat, d.lng)
    sources[source] = sources.get(source, 0) + 1
    if i % 20 == 0:
        print(f"  {i}/{len(pairs)}  {time.time() - started:.0f}s")

print(f"done in {time.time() - started:.0f}s: {sources}")
print(f"cache -> {CACHE_PATH}")
db.close()
