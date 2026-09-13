import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .routers import auth, chat, dashboard, deals, geo, market

log = logging.getLogger("carbonsell")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Create the schema, and seed it if the database is empty.

    Hosts like Render give a free service an ephemeral disk, so the SQLite
    file is gone after every deploy and restart. Seeding on boot means the
    deployed app always comes up with a populated marketplace instead of an
    empty one. An existing database is left alone.
    """
    from .db import Base, SessionLocal, engine
    from .models import Company

    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        if db.query(Company).count() == 0:
            from .seed import run

            log.warning("empty database - seeding")
            run()
    finally:
        db.close()
    yield


app = FastAPI(title=f"{config.APP_NAME} API", version="0.1.0", lifespan=lifespan)

# Reachable from the machine it runs on and from anything on the same
# private network - a demo usually means a second laptop and a phone. Public
# addresses are not matched.
LAN_ORIGIN = (
    r"http://(localhost|127\.0\.0\.1|\[::1\]"
    r"|10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
    r"|192\.168\.\d{1,3}\.\d{1,3}"
    r"|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}"
    r"|[A-Za-z0-9-]+\.local)"
    r"(:\d+)?"
)

# Plus wherever this is deployed. ALLOWED_ORIGINS is a comma-separated list;
# *.onrender.com is matched by default so a Render static site just works.
DEPLOYED_ORIGIN = r"https://[A-Za-z0-9-]+\.onrender\.com"
ORIGIN_REGEX = f"({LAN_ORIGIN}|{DEPLOYED_ORIGIN})"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()
    ],
    allow_origin_regex=ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


for r in (auth.router, geo.router, market.router, deals.router, chat.router, dashboard.router):
    app.include_router(r)


@app.get("/health")
def health():
    """Cheap liveness probe, and it tells the UI what the server is configured for."""
    return {
        "status": "ok",
        "app": config.APP_NAME,
        "regions": config.REGIONS,
        "default_region": config.DEFAULT_REGION,
        "ola_configured": config.OLA_CONFIGURED,
    }


@app.get("/meta")
def meta():
    """Everything the frontend needs to render dropdowns without hardcoding."""
    return {
        "emitter_categories": config.EMITTER_CATEGORIES,
        "buyer_categories": config.BUYER_CATEGORIES,
        "capture_methods": config.CAPTURE_METHODS,
        "species": config.SPECIES,
        "pickup_slots": config.PICKUP_SLOTS,
        "trucks": config.TRUCKS,
    }
