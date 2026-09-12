# CarbonSell — Carbon Capture-to-Product Marketplace

Team Anomaly · Circular Carbon Ecosystem

A two-sided marketplace where industrial emitters list captured CO₂ and
utilisers find it
React + Vite · FastAPI · SQLite · Ola Maps

---

## Prerequisites

- Python 3.12+
- Node 20+

## First-time setup

```bash
python3 -m venv .venv && ./.venv/bin/pip install -r backend/requirements.txt
```

```bash
cd frontend && npm install
```

Create `backend/.env` from the template (the app runs without real keys —
distances fall back to OSRM, and address autocomplete is simply disabled):

```bash
cp backend/.env.example backend/.env
```

Seed the database:

```bash
cd backend && ../.venv/bin/python -m app.seed
```

## Run it

Two terminals.

```bash
cd backend && ../.venv/bin/uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend && npm run dev
```

Open **http://localhost:5173**. API docs at **http://localhost:8000/docs**.

The frontend proxies `/api` to port 8000, so the browser only ever talks to
:5173.

## Demo logins

Password `demo1234` for all of them — the sign-in screen has one-click buttons.

| Email | Who |
|---|---|
| `buyer@nagpur.demo` | Nagpur CarbonCure Concrete — buyer |
| `emitter@chandrapur.demo` | Chandrapur Super Thermal — seller |
| `buyer@kutch.demo` | Kutch Methanol — buyer with a hard sulphur cap |
| `emitter@kutch.demo` | Kutch Cement — seller with a dirty flue-gas stream |

Try: sign in as `buyer@nagpur.demo` → **My requirements** → *Concrete curing*
→ **matches**. The top match is not the purest gas available, and the
breakdown says why.

## Reset and verify

```bash
cd backend && ../.venv/bin/python -m app.seed
```

```bash
cd backend && ../.venv/bin/python -m pytest app/test_engine.py -q
```

```bash
cd backend && ../.venv/bin/python -m scripts.walkthrough
```

`seed` drops and recreates everything (no migrations — reseeding takes two
seconds). `pytest` asserts the ranking behaviour. `walkthrough` drives the
whole flow through the API with no browser, including the permission
boundaries; it mutates data, so reseed afterwards.

Print the ranked market as a terminal table:

```bash
cd backend && ../.venv/bin/python -m app.test_engine
```

## Ola Maps (optional)

Put Krutrim Cloud credentials in `backend/.env`:

```
OLA_MAPS_API_KEY=...
OLA_CLIENT_ID=...
OLA_CLIENT_SECRET=...
```

Whitelist `http://localhost:5173`, `http://localhost:8000` and
`http://127.0.0.1:5173` on the credential's detail page in Krutrim Cloud.
Nothing needs enabling per API.

The key never reaches the browser — the frontend calls `/geo/autocomplete` and
`/geo/distance` on this API, which proxies to Ola. Road distance degrades
Ola → OSRM public server → haversine × 1.25, and every result is labelled with
its source in the UI.

Successful lookups persist to `backend/distance_cache.json`, so a restart never
waits on the network. To precompute every pickup-to-delivery pair (about a
minute, once):

```bash
cd backend && ../.venv/bin/python -m scripts.warm_distances
```

## Layout

```
backend/app/
  config.py      every tunable number: truck rates, score weights, presets
  models.py      13 tables
  schemas.py     request bodies + the serializers that mask phone numbers
  security.py    bcrypt + JWT + get_current_user
  engine/        distance, cheapest_haul, cleanup costs, scoring
  routers/       auth, geo, market, deals, chat, dashboard
  seed.py        West India demo data
frontend/src/
  ui.tsx         ScoreBars, CostBreakdown, HaulPlanCard, StatusTimeline…
  components/    AddressPicker (+ inline add modal), Contaminants, ChatPanel
  pages/         Auth, Buyer, Seller
```

Truck rates and contaminant caps in `config.py` are documented estimates tuned
for a readable demo, not quotes or standards citations.
