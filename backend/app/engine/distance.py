"""Road distance with a degradation ladder.

Ola Directions -> OSRM public server -> haversine x detour factor.
Every result is labelled with its source so the UI can be honest about
where the number came from. Results are cached per coordinate pair:
re-ranking the same market costs nothing.
"""
import json
import logging
import math
import time

import httpx

from .. import config

log = logging.getLogger("carbonsell.distance")

CACHE_PATH = config.BASE_DIR / "distance_cache.json"
_token: dict[str, float | str] = {}


def _load_cache() -> dict[tuple, tuple[float, str]]:
    """Survives restarts on purpose: a live demo should never wait on 90
    routing calls because someone touched a Python file."""
    if not CACHE_PATH.exists():
        return {}
    try:
        raw = json.loads(CACHE_PATH.read_text())
        return {
            tuple(float(x) for x in k.split(",")): (v[0], v[1]) for k, v in raw.items()
        }
    except Exception as exc:
        log.warning("distance cache unreadable: %s", exc)
        return {}


def _save_cache() -> None:
    try:
        CACHE_PATH.write_text(
            json.dumps({",".join(map(str, k)): list(v) for k, v in _cache.items()}, indent=0)
        )
    except Exception as exc:
        log.warning("distance cache not saved: %s", exc)


_cache: dict[tuple, tuple[float, str]] = _load_cache()


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _ola_bearer() -> str | None:
    """OAuth2 client-credentials token. Preferred server-side: no Referer
    to whitelist, unlike the API key."""
    if not (config.OLA_CLIENT_ID and config.OLA_CLIENT_SECRET):
        return None
    if _token.get("value") and float(_token.get("expires", 0)) > time.time() + 30:
        return str(_token["value"])
    try:
        res = httpx.post(
            config.OLA_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": config.OLA_CLIENT_ID,
                "client_secret": config.OLA_CLIENT_SECRET,
                "scope": "openid",
            },
            timeout=config.OLA_TIMEOUT_S,
        )
        res.raise_for_status()
        body = res.json()
        _token["value"] = body["access_token"]
        _token["expires"] = time.time() + float(body.get("expires_in", 300))
        return str(_token["value"])
    except Exception as exc:
        log.warning("ola token failed: %s", exc)
        return None


def _ola_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float | None:
    if not config.OLA_CONFIGURED:
        return None
    params = {"origin": f"{lat1},{lng1}", "destination": f"{lat2},{lng2}"}
    headers = {}
    if config.OLA_API_KEY:
        params["api_key"] = config.OLA_API_KEY
    else:
        tok = _ola_bearer()
        if not tok:
            return None
        headers["Authorization"] = f"Bearer {tok}"

    url = f"{config.OLA_BASE}/routing/v1/directions"
    for method in ("post", "get"):
        try:
            res = getattr(httpx, method)(
                url, params=params, headers=headers, timeout=config.OLA_TIMEOUT_S
            )
            if res.status_code != 200:
                log.warning("ola %s %s -> %s %s", method, url, res.status_code, res.text[:180])
                continue
            body = res.json()
            routes = body.get("routes") or []
            if not routes:
                continue
            legs = routes[0].get("legs") or []
            metres = routes[0].get("distance") or sum(l.get("distance", 0) for l in legs)
            if metres:
                return float(metres) / 1000.0
        except Exception as exc:
            log.warning("ola %s failed: %s", method, exc)
    return None


def _osrm_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float | None:
    try:
        res = httpx.get(
            f"{config.OSRM_BASE}/route/v1/driving/{lng1},{lat1};{lng2},{lat2}",
            params={"overview": "false"},
            timeout=config.OLA_TIMEOUT_S,
        )
        if res.status_code != 200:
            return None
        routes = res.json().get("routes") or []
        return float(routes[0]["distance"]) / 1000.0 if routes else None
    except Exception as exc:
        log.warning("osrm failed: %s", exc)
        return None


def road_km(lat1: float, lng1: float, lat2: float, lng2: float) -> tuple[float, str]:
    """Returns (kilometres, source) where source is ola | osrm | estimate."""
    key = (round(lat1, 4), round(lng1, 4), round(lat2, 4), round(lng2, 4))
    if key in _cache:
        return _cache[key]

    for fn, label in ((_ola_km, "ola"), (_osrm_km, "osrm")):
        km = fn(lat1, lng1, lat2, lng2)
        if km:
            _cache[key] = (round(km, 1), label)
            _save_cache()
            return _cache[key]

    # Not cached to disk: an estimate should be retried once the network
    # or the key comes back.
    km = haversine_km(lat1, lng1, lat2, lng2) * config.HAVERSINE_DETOUR
    return round(km, 1), "estimate"
