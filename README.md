# CarbonSell

**Team Anomaly · Circular Carbon Ecosystem**

React + Vite · FastAPI · SQLite · Ola Maps


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
