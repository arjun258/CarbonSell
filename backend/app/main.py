from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .routers import auth, chat, dashboard, deals, geo, market

app = FastAPI(title=f"{config.APP_NAME} API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
        "use_case_presets": config.USE_CASE_PRESETS,
        "trucks": config.TRUCKS,
    }
