from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .routers import auth, chat, dashboard, deals, geo, market

app = FastAPI(title=f"{config.APP_NAME} API", version="0.1.0")

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

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=LAN_ORIGIN,
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
