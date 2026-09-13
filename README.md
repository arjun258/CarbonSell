# CarbonSell

**Team Anomaly · Circular Carbon Ecosystem**

React + Vite · FastAPI · SQLite · Ola Maps

**Live: [carbonsell.onrender.com](https://carbonsell.onrender.com)** — sign in
with any demo account below, password `demo1234`. It runs on a free Render
instance, so the first request after a quiet spell takes a minute to wake up.


## Run it

**Needs** Python 3.12+, Node 20+, and Ola Maps credentials from
[Krutrim Cloud](https://maps.olakrutrim.com) for address autocomplete and road
distance.

Set up once:

```bash
python3 -m venv .venv && ./.venv/bin/pip install -r backend/requirements.txt
```

```bash
cd frontend && npm install
```

```bash
cp backend/.env.example backend/.env    # then add your Ola credentials
```

```bash
cd backend && ../.venv/bin/python -m app.seed
```

Then start both, in two terminals:

```bash
cd backend && ../.venv/bin/uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend && npm run dev
```

Open **http://localhost:5173**. API docs at **http://localhost:8000/docs**.

To serve it to other machines on the same network, one command starts both and
prints the addresses:

```bash
./backend/scripts/serve_lan.sh
```

### Deploy on Render

`render.yaml` at the repo root defines both services. In Render: **New →
Blueprint**, point it at this repo, and it creates the API and the dashboard
together. Afterwards, add `OLA_MAPS_API_KEY`, `OLA_CLIENT_ID` and
`OLA_CLIENT_SECRET` to the **carbonsell-api** service and redeploy.

To wire it up by hand instead:

| | API | Dashboard |
|---|---|---|
| Type | Web service (Python) | Static site |
| Root directory | `backend` | `frontend` |
| Build | `pip install -r requirements.txt` | `npm install && npm run build` |
| Start / publish | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `dist` |

The dashboard needs `VITE_API_BASE` set to the API's hostname, and a rewrite
from `/*` to `/index.html` so a refresh on a deep link does not 404.

A free Render disk is wiped on every deploy, so the API seeds itself whenever
it starts against an empty database — the deployed app always comes up with a
populated marketplace.

### Demo logins

Password `demo1234` for all of them, and the sign-in screen has one-click
buttons. Each browser tab keeps its own session, so you can be signed in as a
buyer and a seller at the same time.

| Email | Who |
|---|---|
| `buyer@nagpur.demo` | Nagpur CarbonCure Concrete — buyer |
| `emitter@chandrapur.demo` | Chandrapur Super Thermal — seller |
| `buyer@kutch.demo` | Kutch Methanol — buyer |
| `emitter@kutch.demo` | Kutch Cement — seller |

### Reset the data

```bash
cd backend && ../.venv/bin/python -m app.seed
```
