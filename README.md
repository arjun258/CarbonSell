# CarbonSell

**Team Anomaly · Circular Carbon Ecosystem**

React + Vite · FastAPI · SQLite · Ola Maps

## The problem

Cement plants, steel mills and power stations capture CO₂ and then pay to
compress, store and bury it. At the same time, methanol producers, fertiliser
plants, bottlers, greenhouses and concrete yards buy CO₂ as a raw material.
The two sides rarely find each other: there is no common place to see who has
gas, how pure it is, how far away it sits, or what it would actually cost to
get it through the gate. So captured carbon gets buried, and capture stays a
pure expense.

## The solution

A marketplace that prices CO₂ **delivered**, not at the gate.

- Emitters list what they capture — volume, purity, a full contaminant
  profile in ppm, and a pickup site.
- Buyers state what they need — volume, minimum purity, a price ceiling for
  the gas, and any contaminant limits that matter to their process.
- Every seller who qualifies is ranked by what they actually cost: the gas
  plus haulage, with the cheapest truck class and trip count worked out from
  real road distance. The answer is often a nearer, less pure stream than the
  purest gas on the platform — haulage decides these deals.
- A listing can run as an auction with a bidding window and a starting price,
  or sell directly. Sellers see every bidder and can accept, decline, chat,
  fill an order from several bidders, or let it award itself at the close.
- Buyers and sellers message each other from a listing, and a seller releases
  their phone number to a specific buyer when they choose to.

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
