"""Every tunable number in the product lives here.

Rule: tuning the demo must never mean editing logic. If a judge asks
"what if diesel goes up 20%", the answer is one edit in this file.
"""
from pathlib import Path

# ---------------------------------------------------------------- app
APP_NAME = "CarbonX"
BASE_DIR = Path(__file__).resolve().parent.parent
DB_URL = f"sqlite:///{BASE_DIR / 'carbonx.db'}"
JWT_ALGORITHM = "HS256"
JWT_TTL_HOURS = 24

# ---------------------------------------------------------------- regions
# One live region for the MVP. The rest exist so the UI reads as a
# rollout plan rather than a limitation.
REGIONS = [
    {"code": "west", "name": "West India (Gujarat + Maharashtra)", "enabled": True,
     "states": ["Gujarat", "Maharashtra"]},
    {"code": "south", "name": "South India", "enabled": False, "states": []},
    {"code": "north", "name": "North India", "enabled": False, "states": []},
    {"code": "east", "name": "East India", "enabled": False, "states": []},
]
DEFAULT_REGION = "west"
STATE_TO_REGION = {s: r["code"] for r in REGIONS for s in r["states"]}

# ---------------------------------------------------------------- trucks
# Liquid CO2 moves in insulated pressure tankers. Indian cryogenic
# trailers sell in the 5-30 kL range and liquid CO2 is ~1.03 kg/L at
# transport conditions, so kL ~= tonnes. Rates are Indian road-freight
# rates (Rs 20-40/km by capacity) with a ~1.5x cryogenic premium:
# specialised vessel, PESO/hazmat compliance, trained crew.
# Documented estimates, not quotes.
TRUCKS = [
    {"name": "Mini cryo tanker", "cap_t": 6, "rate_km": 34},
    {"name": "Medium cryo tanker", "cap_t": 12, "rate_km": 42},
    {"name": "Standard CO2 road tanker", "cap_t": 18, "rate_km": 55},
    {"name": "ISO-tank semi-trailer", "cap_t": 24, "rate_km": 68},
]
HANDLING_PER_TRIP = 1500   # loading + unloading, INR
RETURN_FACTOR = 1.8        # the tanker comes back empty
HAVERSINE_DETOUR = 1.25    # crow-flight -> road, for the offline fallback

# ---------------------------------------------------------------- purity
# Superlinear on purpose: the last points of purity cost the most.
PURIFICATION_BASE = 280
PURIFICATION_EXP = 1.35
PURITY_GAP_CEILING = 15.0  # more than this and the match is infeasible

# ---------------------------------------------------------------- contaminants
# All concentrations in ppm, one unit everywhere. 1% = 10,000 ppm.
SPECIES = [
    {"code": "N2", "label": "Nitrogen (N2)"},
    {"code": "O2", "label": "Oxygen (O2)"},
    {"code": "H2O", "label": "Moisture (H2O)"},
    {"code": "SO2", "label": "Sulphur dioxide (SO2)"},
    {"code": "NOx", "label": "Nitrogen oxides (NOx)"},
    {"code": "H2S", "label": "Hydrogen sulphide (H2S)"},
    {"code": "CO", "label": "Carbon monoxide (CO)"},
    {"code": "HC", "label": "Hydrocarbons / VOC"},
    {"code": "NH3", "label": "Ammonia (NH3)"},
]
REMOVAL_COST_PER_T = {
    "H2O": 150,   # drying
    "N2": 200,    # inerts, cryogenic separation
    "O2": 400,    # deoxo
    "SO2": 500,   # scrubbing
    "NOx": 480,
    "H2S": 600,   # poisons methanol catalysts, expensive to reach low ppm
    "CO": 450,
    "HC": 450,
    "NH3": 350,
}
CLEANUP_INFEASIBLE_MULTIPLE = 10   # >10x over cap: drop, don't price a fantasy
CLEANUP_FIT_SCALE = 900            # rupees of cleanup that zeroes contaminant_fit

# ---------------------------------------------------------------- scoring
SCORE_WEIGHTS = {
    "price": 0.28,
    "purity": 0.20,
    "distance": 0.18,
    "contaminant": 0.12,
    "volume": 0.12,
    "rating": 0.10,
}
DISTANCE_FIT_CEILING_KM = 800

# ---------------------------------------------------------------- taxonomy
EMITTER_CATEGORIES = [
    "Cement", "Steel", "Thermal power", "Refinery",
    "Chemicals & fertiliser", "Ethanol & brewery", "Other",
]
BUYER_CATEGORIES = [
    "Methanol & synfuel", "Urea / fertiliser", "Beverage carbonation",
    "Greenhouse / agriculture", "Algae cultivation", "Concrete curing",
    "Dry ice", "Welding & industrial gas",
]
CAPTURE_METHODS = [
    "Post-combustion amine", "Oxy-fuel", "Pre-combustion",
    "Flue-gas scrubbing", "Fermentation / bio-CO2", "Direct air capture",
]
PICKUP_SLOTS = ["06:00-09:00", "10:00-13:00", "14:00-17:00", "18:00-21:00"]

# ---------------------------------------------------------------- presets
# Indicative starting values for the demo, tuned for a readable market.
# NOT a standards citation: real caps come from ISBT / EIGA specs.
USE_CASE_PRESETS = {
    "Beverage carbonation": {
        "min_purity": 99.9,
        "caps": {"O2": 30, "H2S": 5, "HC": 20, "NH3": 2, "H2O": 20},
        "note": "Food-contact grade. Taste and odour fail long before safety does.",
    },
    "Methanol & synfuel": {
        "min_purity": 99.0,
        "caps": {"H2S": 3, "SO2": 10, "HC": 100},
        "note": "Sulphur poisons the synthesis catalyst. This is the expensive one.",
    },
    "Urea / fertiliser": {
        "min_purity": 98.5,
        "caps": {"H2S": 10, "HC": 200},
        "note": "Catalyst life and product quality.",
    },
    "Greenhouse / agriculture": {
        "min_purity": 99.0,
        "caps": {"NOx": 20, "CO": 50, "HC": 100},
        "note": "Plants are damaged by NOx and ethylene at ppm levels.",
    },
    "Concrete curing": {
        "min_purity": 95.0,
        "caps": {"SO2": 500},
        "note": "Tolerant use case, and the natural home for lower-grade streams.",
    },
    "Dry ice": {
        "min_purity": 99.5,
        "caps": {"H2O": 20, "O2": 50},
        "note": "Moisture wrecks block quality.",
    },
    "Welding & industrial gas": {
        "min_purity": 99.5,
        "caps": {"H2O": 30, "O2": 50},
        "note": "Moisture causes weld porosity.",
    },
    "Algae cultivation": {
        "min_purity": 96.0,
        "caps": {"SO2": 200, "NOx": 200},
        "note": "Tolerant, but sulphur and NOx stress the culture.",
    },
}

# ---------------------------------------------------------------- ola maps
OLA_BASE = "https://api.olamaps.io"
OLA_TOKEN_URL = "https://account.olakrutrim.com/realms/krutrim/protocol/openid-connect/token"
OLA_TIMEOUT_S = 6.0
OSRM_BASE = "https://router.project-osrm.org"

# ---------------------------------------------------------------- secrets
# Read from backend/.env, never committed. See .env.example.
import os
from dotenv import load_dotenv

load_dotenv(BASE_DIR / ".env")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-secret")
OLA_API_KEY = os.getenv("OLA_MAPS_API_KEY", "")
OLA_CLIENT_ID = os.getenv("OLA_CLIENT_ID", "")
OLA_CLIENT_SECRET = os.getenv("OLA_CLIENT_SECRET", "")
OLA_CONFIGURED = bool(OLA_API_KEY or (OLA_CLIENT_ID and OLA_CLIENT_SECRET))
