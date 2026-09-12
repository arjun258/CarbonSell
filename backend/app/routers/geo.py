"""Ola Maps proxy. The key stays server-side: a key in frontend JS is a
key on a projector."""
import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

from .. import config
from ..engine.distance import _ola_bearer, road_km

router = APIRouter(tags=["geo"])
log = logging.getLogger("carbonsell.geo")


@router.get("/geo/autocomplete")
def autocomplete(q: str = Query(min_length=3)):
    """Address suggestions with coordinates. Falls back to an empty list so
    the signup form degrades to manual entry instead of breaking."""
    if not config.OLA_CONFIGURED:
        return {"configured": False, "results": []}

    params = {"input": q}
    headers = {}
    if config.OLA_API_KEY:
        params["api_key"] = config.OLA_API_KEY
    else:
        tok = _ola_bearer()
        if not tok:
            return {"configured": False, "results": []}
        headers["Authorization"] = f"Bearer {tok}"

    try:
        res = httpx.get(
            f"{config.OLA_BASE}/places/v1/autocomplete",
            params=params, headers=headers, timeout=config.OLA_TIMEOUT_S,
        )
        if res.status_code != 200:
            log.warning("ola autocomplete -> %s %s", res.status_code, res.text[:200])
            return {"configured": True, "results": [], "error": res.status_code}
        out = []
        for p in res.json().get("predictions", []):
            loc = (p.get("geometry") or {}).get("location") or {}
            terms = p.get("terms") or []
            out.append({
                "label": p.get("structured_formatting", {}).get("main_text")
                         or p.get("description", ""),
                "line1": p.get("description", ""),
                "city": terms[-3]["value"] if len(terms) >= 3 else "",
                "state": terms[-2]["value"] if len(terms) >= 2 else "",
                "lat": loc.get("lat"), "lng": loc.get("lng"),
            })
        return {"configured": True, "results": [r for r in out if r["lat"]]}
    except Exception as exc:
        log.warning("ola autocomplete failed: %s", exc)
        return {"configured": True, "results": [], "error": str(exc)}


@router.get("/geo/distance")
def distance(lat1: float, lng1: float, lat2: float, lng2: float):
    km, source = road_km(lat1, lng1, lat2, lng2)
    return {"road_km": km, "rate_source": source}


@router.get("/geo/regions")
def regions():
    return {"regions": config.REGIONS, "default": config.DEFAULT_REGION}
