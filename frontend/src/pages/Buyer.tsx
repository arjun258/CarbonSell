import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, inr, patch, post } from "../api";
import { useAuth } from "../auth";
import { AddressPicker } from "../components/AddressPicker";
import { ContaminantCaps, type Cap } from "../components/Contaminants";
import { ChatPanel } from "../components/ChatPanel";
import {
  Button,
  Card,
  ContactLine,
  ContaminantCompare,
  ContaminantTable,
  CostBreakdown,
  Empty,
  Field,
  HaulPlanCard,
  KpiRow,
  Label,
  Pill,
  Rating,
  ScoreBars,
  SectionTitle,
  StatusTimeline,
  Verified,
  inputClass,
} from "../ui";
import type {
  Bid,
  Dashboard,
  Listing,
  Match,
  Order,
  Requirement,
  Thread,
} from "../types";

/* --------------------------------------------------------------- overview */

export function BuyerOverview() {
  const [d, setD] = useState<Dashboard | null>(null);
  useEffect(() => {
    api<Dashboard>("/dashboard").then(setD);
  }, []);
  if (!d) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <KpiRow kpis={d.kpis} />
      <div>
        <SectionTitle right={<Link to="/requirements" className="text-accent underline">All requirements</Link>}>
          Best matches right now
        </SectionTitle>
        {d.best_matches?.length ? (
          <div className="flex flex-col gap-3">
            {d.best_matches.map((m) => (
              <Card key={`${m.requirement_id}-${m.listing_id}`} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{m.seller_name}</span>
                  <Pill>{m.city}</Pill>
                  <span className="tnum ml-auto text-right">
                    <span className="text-lg font-semibold">
                      ₹{inr(m.delivered_per_t)}
                    </span>
                    <span className="text-xs font-normal text-muted">/t delivered</span>
                    <span className="block text-xs text-muted">
                      ₹{inr(m.total_cost)} total
                    </span>
                  </span>
                </div>
                <p className="tnum mt-1 text-sm text-muted">
                  {m.purity_pct}% · {m.address_line} ·{" "}
                  {inr(m.distance_km)} km · feasibility {m.score}
                </p>
                <Link
                  to={`/requirements/${m.requirement_id}/matches`}
                  className="mt-2 inline-block text-sm text-accent underline"
                >
                  See the ranking →
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Empty
            title="No matches yet"
            hint="Create a requirement and the platform will rank every seller in your region."
          />
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- requirements */

export function Requirements() {
  const [rows, setRows] = useState<Requirement[]>([]);
  const [open, setOpen] = useState(false);

  const load = () =>
    api<{ requirements: Requirement[] }>("/requirements/mine").then((r) =>
      setRows(r.requirements),
    );
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        right={
          <Button onClick={() => setOpen(!open)}>
            {open ? "Close" : "+ New requirement"}
          </Button>
        }
      >
        My requirements
      </SectionTitle>

      {open && <RequirementForm onSaved={() => { setOpen(false); load(); }} />}

      {rows.length === 0 && !open && (
        <Empty
          title="No requirements yet"
          hint="Tell us what you need and we rank every seller by delivered cost."
        />
      )}

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <Card key={r.id} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-medium">
{inr(r.volume_t)} tonne · min {r.min_purity_pct}%
              </span>
              <Pill>{r.address.city}</Pill>
              <span className="tnum text-sm text-muted">
                up to ₹{inr(r.budget_per_t)}/t for the gas · {r.address.label}
              </span>
              <Link
                to={`/requirements/${r.id}/matches`}
                className="ml-auto text-sm text-accent underline"
              >
                {r.match_count ?? 0} matches →
              </Link>
            </div>
            <p className="tnum mt-1 text-xs text-muted">
              {r.caps.length > 0
                ? `limits: ${r.caps.map((c) => `${c.species} ≤ ${c.max_ppm} ppm`).join(" · ")}`
                : "no contaminant limits set"}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RequirementForm({ onSaved }: { onSaved: () => void }) {
  const [addressId, setAddressId] = useState<number | null>(null);
  const [f, setF] = useState({
    volume_t: 50,
    min_purity_pct: 99,
    budget_per_t: 8000,
  });
  const [caps, setCaps] = useState<Cap[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!addressId) return setError("Pick a delivery location.");
    try {
      await post("/requirements", { ...f, address_id: addressId, caps });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Card className="px-4 py-4">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <AddressPicker
            label="Delivery location"
            value={addressId}
            onChange={setAddressId}
          />
          <Field label="Volume needed (tonne)">
            <input
              type="number"
              className={inputClass}
              value={f.volume_t}
              onChange={(e) => setF({ ...f, volume_t: Number(e.target.value) })}
            />
          </Field>
          <Field label="Minimum CO₂ purity (%)">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={f.min_purity_pct}
              onChange={(e) =>
                setF({ ...f, min_purity_pct: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Budget (₹/tonne for the CO₂)"
            hint="The most you will pay for the gas itself — haulage is quoted separately on every match"
          >
            <input
              type="number"
              className={inputClass}
              value={f.budget_per_t}
              onChange={(e) =>
                setF({ ...f, budget_per_t: Number(e.target.value) })
              }
            />
          </Field>
        </div>

        <ContaminantCaps caps={caps} setCaps={setCaps} />

        {error && (
          <p className="border-l-3 border-stop bg-stop-soft px-3 py-2 text-sm">
            {error}
          </p>
        )}
        <Button className="self-start">Save requirement</Button>
      </form>
    </Card>
  );
}

/* --------------------------------------------------------------- matches */

export function Matches() {
  const { id } = useParams();
  const [data, setData] = useState<{
    requirement: Requirement;
    matches: Match[];
    considered: number;
    count: number;
  } | null>(null);

  useEffect(() => {
    api<typeof data>(`/match/${id}`).then(setData);
  }, [id]);

  if (!data) return <p className="text-sm text-muted">Ranking the market…</p>;
  const r = data.requirement;

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle right={`${data.count} feasible of ${data.considered} listings`}>
        {inr(r.volume_t)} tonne into {r.address.city}
      </SectionTitle>

      <p className="tnum text-sm text-muted">
        min purity {r.min_purity_pct}% · up to ₹{inr(r.budget_per_t)}/t for the gas ·{" "}
        {r.caps.length > 0
          ? `limits ${r.caps.map((c) => `${c.species}≤${c.max_ppm}`).join(", ")}`
          : "no contaminant limits"}
      </p>

      {data.matches.length === 0 && (
        <Empty
          title="Nothing clears your spec at this budget"
          hint="Lower the minimum purity, raise the price you will pay for the gas, or relax a contaminant limit."
        />
      )}

      <div className="flex flex-col gap-3">
        {data.matches.map((m, i) => (
          <MatchCard key={m.listing_id} m={m} rank={i + 1} requirementId={r.id} />
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  m,
  rank,
  requirementId,
}: {
  m: Match;
  rank: number;
  requirementId: number;
}) {
  return (
    <Card className="px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="tnum font-mono text-sm text-muted">#{rank}</span>
        <span className="font-medium">{m.seller_name}</span>
        <span className="text-xs text-muted">{m.seller_category}</span>
        {m.verified && <Pill tone="good">✓ verified</Pill>}
        <Rating value={m.seller_rating} />
        {m.storage_full && <Pill tone="warn">storage nearly full</Pill>}
        <span className="ml-auto flex items-baseline gap-3">
          <span className="tnum text-right">
            <span className="text-xl font-semibold">
              ₹{inr(m.delivered_per_t)}
            </span>
            <span className="text-xs font-normal text-muted">/t delivered</span>
            <span className="block text-xs text-muted">
              ₹{inr(m.total_cost)} for {inr(m.covers_t)} tonne
            </span>
          </span>
          <span className="flex flex-col items-center">
            <span className="font-mono text-[9px] tracking-[0.1em] text-muted uppercase">
              Feasibility
            </span>
            <span className="tnum border border-accent px-2 py-0.5 font-mono text-sm text-accent">
              {m.score}
            </span>
          </span>
        </span>
      </div>

      <p className="tnum mt-1 text-sm text-ink-2">
        {m.purity_pct}% purity · {inr(m.volume_t)} tonne available ·{" "}
        {inr(m.distance_km)} km · {m.form} · {m.source_type}
        {!m.covers_requirement && (
          <span className="text-accent">
            {" "}
            — covers {inr(m.covers_t)} tonne, pair with another seller
          </span>
        )}
      </p>
      <p className="mt-0.5 text-sm text-muted">{m.address_line}</p>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <CostBreakdown m={m} />
        <div className="flex flex-col gap-3">
          <HaulPlanCard haul={m.haul} />
          <ContaminantCompare m={m} />
        </div>
      </div>

      <div className="mt-3 border-t border-rule pt-3">
        <ScoreBars fits={m.fits} />
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          to={`/listings/${m.listing_id}?requirement=${requirementId}`}
          className="border border-rule-strong px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
        >
          View listing
        </Link>
        <Link
          to={`/listings/${m.listing_id}?requirement=${requirementId}#chat`}
          className="border border-rule-strong px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
        >
          Message seller
        </Link>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- browse */

export function Browse() {
  const { region } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [reqId, setReqId] = useState<number | "">("");
  const [f, setF] = useState({ min_purity: "", min_volume: "", max_price: "", form: "" });

  useEffect(() => {
    api<{ requirements: Requirement[] }>("/requirements/mine").then((r) => {
      setReqs(r.requirements);
      setReqId((id) => (id === "" ? (r.requirements[0]?.id ?? "") : id));
    });
  }, []);

  useEffect(() => {
    // Requirement selection arrives a tick after the first fetch, so an
    // earlier unpriced response can land last and clobber the priced one.
    let cancelled = false;
    const qs = new URLSearchParams({ region });
    if (reqId !== "") qs.set("requirement_id", String(reqId));
    Object.entries(f).forEach(([k, v]) => v && qs.set(k, v));
    api<{ listings: Listing[] }>(`/listings?${qs}`).then((r) => {
      if (!cancelled) setListings(r.listings);
    });
    return () => {
      cancelled = true;
    };
  }, [region, reqId, f]);

  const active = reqs.find((r) => r.id === reqId);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle right={`${listings.length} listings`}>Marketplace</SectionTitle>

      <Card className="flex flex-wrap items-end gap-3 px-4 py-3">
        <div className="flex flex-col gap-1">
          <Label>Price it for</Label>
          <select
            className={inputClass}
            value={reqId}
            onChange={(e) =>
              setReqId(e.target.value === "" ? "" : Number(e.target.value))
            }
          >
            <option value="">No requirement — ex-works prices only</option>
            {reqs.map((r) => (
              <option key={r.id} value={r.id}>
                {inr(r.volume_t)} t into {r.address.city} (min {r.min_purity_pct}%)
              </option>
            ))}
          </select>
        </div>
        <Field label="Min purity %">
          <input
            className={`${inputClass} w-24`}
            value={f.min_purity}
            onChange={(e) => setF({ ...f, min_purity: e.target.value })}
          />
        </Field>
        <Field label="Min volume t">
          <input
            className={`${inputClass} w-24`}
            value={f.min_volume}
            onChange={(e) => setF({ ...f, min_volume: e.target.value })}
          />
        </Field>
        <Field label="Max ₹/t for the gas">
          <input
            className={`${inputClass} w-28`}
            value={f.max_price}
            onChange={(e) => setF({ ...f, max_price: e.target.value })}
          />
        </Field>
        <Field label="Form">
          <select
            className={inputClass}
            value={f.form}
            onChange={(e) => setF({ ...f, form: e.target.value })}
          >
            <option value="">Any</option>
            <option value="liquid">Liquid</option>
            <option value="gas">Gas</option>
          </select>
        </Field>
      </Card>

      {active ? (
        <p className="text-sm text-muted">
          Totals below are for <strong>{inr(active.volume_t)} t</strong> delivered
          to {active.address.city}.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Pick a requirement above to see haulage and a delivered total on every
          listing.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {listings.map((l) => {
          const ev = l.evaluation;
          return (
            <Card key={l.id} className="px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{l.seller.name}</span>
                {l.seller.is_verified && <Pill tone="good">✓</Pill>}
                {l.storage_full && <Pill tone="warn">urgent</Pill>}
                <span className="tnum ml-auto text-sm">
                  ₹{inr(l.price_per_t)}
                  <span className="text-xs text-muted">/t for the gas</span>
                </span>
              </div>
              <p className="tnum mt-1 text-sm text-muted">
                {l.purity_pct}% purity · {inr(l.volume_t)} tonne available ·{" "}
                {l.form} · {l.source_type}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {[l.address.line1, l.address.city, l.address.state, l.address.pincode]
                  .filter(Boolean)
                  .filter((x, i, a) => a.findIndex((y) => y.toLowerCase().includes(x.toLowerCase())) === i)
                  .join(", ")}
              </p>

              {ev ? (
                <table className="tnum mt-2 w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-0.5 pr-3 text-muted">Product</td>
                      <td className="py-0.5 text-right">
                        ₹{inr(ev.breakdown.listing_per_t)}/t
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5 pr-3 text-muted">
                        Haulage · {inr(ev.distance_km)} km
                      </td>
                      <td className="py-0.5 text-right">
                        ₹{inr(ev.breakdown.haul_per_t)}/t
                      </td>
                    </tr>
                    <tr className="border-t border-rule-strong font-semibold">
                      <td className="py-1 pr-3">
                        Total for {inr(ev.covers_t)} tonne
                      </td>
                      <td className="py-1 text-right">
                        ₹{inr(ev.total_cost)}
                        <span className="ml-1 text-xs font-normal text-muted">
                          (₹{inr(ev.delivered_per_t)}/t)
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                reqId !== "" && (
                  <p className="mt-2 text-xs text-accent">
                    Does not meet this requirement — purity, a contaminant limit
                    or your price ceiling.
                  </p>
                )
              )}

              <div className="mt-2 flex gap-2">
                <Link
                  to={`/listings/${l.id}${reqId !== "" ? `?requirement=${reqId}` : ""}`}
                  className="text-sm text-accent underline"
                >
                  View &amp; message →
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------- listing detail */

export function ListingDetail() {
  const { id } = useParams();
  const requirementId = new URLSearchParams(window.location.search).get("requirement");
  const [l, setL] = useState<Listing | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [bidOpen, setBidOpen] = useState(false);

  const load = () =>
    api<Listing>(
      `/listings/${id}${requirementId ? `?requirement_id=${requirementId}` : ""}`,
    ).then(setL);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openChat = async () => {
    const t = await post<Thread>("/threads", { listing_id: Number(id) });
    setThread(t);
  };

  if (!l) return <p className="text-sm text-muted">Loading…</p>;
  const caps = Object.fromEntries(
    (l.requirement?.caps ?? []).map((c) => [c.species, c.max_ppm]),
  );

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle right={`listing #${l.id}`}>
        {l.purity_pct}% CO₂ · {inr(l.volume_t)} tonne · {l.address.city}
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          {l.evaluation && (
            <Card className="px-4 py-3">
              <Label>Delivered cost for your requirement</Label>
              <div className="mt-2 grid gap-4 lg:grid-cols-2">
                <CostBreakdown m={l.evaluation} />
                <HaulPlanCard haul={l.evaluation.haul} />
              </div>
            </Card>
          )}

          <Card className="px-4 py-3">
            <Label>Gas analysis</Label>
            <div className="mt-2">
              <ContaminantTable
                rows={l.contaminants}
                caps={l.requirement ? caps : undefined}
              />
            </div>
            <p className="tnum mt-2 text-xs text-muted">
              Unaccounted balance {inr(l.unaccounted_ppm)} ppm · lab report{" "}
              {l.lab_report || "—"}
            </p>
          </Card>

          <Card className="px-4 py-3 text-sm">
            <Label>Supply terms</Label>
            <p className="tnum mt-2 text-ink-2">
              ₹{inr(l.price_per_t)}/t ex-works · available from{" "}
              {l.available_from} · {l.form} · captured by {l.source_type} ·{" "}
              pickup at {l.address.label}, {l.address.city}
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="px-4 py-3">
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{l.seller.name}</span>
              <Rating value={l.seller.rating} />
            </div>
            <p className="text-xs text-muted">{l.seller.category}</p>
            <div className="mt-2">
              <Verified company={l.seller} />
            </div>
            <div className="mt-3">
              <ContactLine company={l.seller} />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="ghost" onClick={openChat}>
                Message seller
              </Button>
              {l.requirement && (
                <Button onClick={() => setBidOpen(!bidOpen)}>
                  {bidOpen ? "Close" : "Place bid"}
                </Button>
              )}
            </div>
          </Card>

          {bidOpen && l.requirement && (
            <BidForm
              listing={l}
              requirementId={l.requirement.id}
              onDone={() => setBidOpen(false)}
            />
          )}
        </div>
      </div>

      {thread && (
        <Card className="h-[26rem]" >
          <ChatPanel threadId={thread.id} onThreadChange={() => load()} />
        </Card>
      )}
    </div>
  );
}

function BidForm({
  listing,
  requirementId,
  onDone,
}: {
  listing: Listing;
  requirementId: number;
  onDone: () => void;
}) {
  const [volume, setVolume] = useState(
    Math.min(listing.volume_t, listing.requirement?.volume_t ?? listing.volume_t),
  );
  const [price, setPrice] = useState(listing.price_per_t);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await post("/bids", {
        listing_id: listing.id,
        requirement_id: requirementId,
        volume_t: volume,
        price_per_t: price,
        note,
      });
      setMsg("Bid sent. The seller sees it on their dashboard.");
      setTimeout(onDone, 1200);
    } catch (err) {
      setMsg((err as Error).message);
    }
  };

  return (
    <Card className="px-4 py-3">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Label>Place a bid</Label>
        <Field label="Volume (t)">
          <input
            type="number"
            className={inputClass}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </Field>
        <Field label="Your price (₹/t ex-works)" hint={`Asking ₹${inr(listing.price_per_t)}`}>
          <input
            type="number"
            className={inputClass}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </Field>
        <Field label="Note">
          <input
            className={inputClass}
            placeholder="3-month contract if the rate holds"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        {msg && <p className="text-sm text-good">{msg}</p>}
        <Button>Send bid</Button>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------ bids/orders */

export function BuyerBids() {
  const [bids, setBids] = useState<Bid[]>([]);
  useEffect(() => {
    api<{ bids: Bid[] }>("/bids/mine").then((r) => setBids(r.bids));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>My bids</SectionTitle>
      {bids.length === 0 && <Empty title="No bids yet" hint="Open a match and place one." />}
      <div className="flex flex-col gap-3">
        {bids.map((b) => (
          <Card key={b.id} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium">{b.seller.name}</span>
              <span className="text-xs text-muted">
                listing #{b.listing.id} · {b.listing.purity_pct}% ·{" "}
                {b.listing.city}
              </span>
              <Pill
                tone={
                  b.status === "accepted"
                    ? "good"
                    : b.status === "rejected"
                      ? "stop"
                      : "neutral"
                }
              >
                {b.status}
              </Pill>
              <span className="tnum ml-auto text-sm">
                {inr(b.volume_t)} t @ ₹{inr(b.price_per_t)}/t
              </span>
            </div>
            {b.haul && (
              <p className="tnum mt-1 text-xs text-muted">
                {b.haul.truck} × {b.haul.trips} · {inr(b.distance_km)} km ·
                delivered ₹{inr(b.delivered_per_t)}/t
              </p>
            )}
            {b.note && <p className="mt-1 text-sm text-ink-2">“{b.note}”</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function OrdersPage({ seller = false }: { seller?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const load = () => api<{ orders: Order[] }>("/orders/mine").then((r) => setOrders(r.orders));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle right={`${orders.length} orders`}>
        {seller ? "Approved orders" : "My orders"}
      </SectionTitle>
      {orders.length === 0 && (
        <Empty
          title="No orders yet"
          hint={seller ? "Accept a bid and it appears here." : "Once a seller accepts your bid it appears here."}
        />
      )}
      <div className="flex flex-col gap-4">
        {orders.map((o) => (
          <OrderCard key={o.id} o={o} onChange={load} />
        ))}
      </div>
    </div>
  );
}

export function OrderCard({ o, onChange }: { o: Order; onChange: () => void }) {
  const [pickupOpen, setPickupOpen] = useState(false);
  const next = { accepted: "pickup_scheduled", pickup_scheduled: "in_transit", in_transit: "delivered" }[
    o.status
  ];

  return (
    <Card className="px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-sm text-muted">#{o.id}</span>
        <span className="font-medium">{o.counterpart.name}</span>
        <span className="text-xs text-muted">{o.counterpart.category}</span>
        <Rating value={o.counterpart.rating} />
        <Pill tone={o.status === "delivered" ? "good" : "warn"}>
          {o.status.replace("_", " ")}
        </Pill>
        <span className="tnum ml-auto text-sm">
          {inr(o.volume_t)} t @ ₹{inr(o.price_per_t)}/t · ₹{inr(o.total_value)}
        </span>
      </div>

      <div className="mt-4 max-w-md">
        <StatusTimeline status={o.status} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {o.haul && <HaulPlanCard haul={o.haul} />}
        <div className="flex flex-col gap-2">
          <div className="border border-rule bg-surface-2 px-3 py-2">
            <Label>Pickup</Label>
            {o.pickup ? (
              <>
                <p className="mt-1 text-sm font-medium">
                  {o.pickup.scheduled_date}, {o.pickup.slot}
                </p>
                <p className="text-sm text-ink-2">
                  {o.pickup.address.label}, {o.pickup.address.city} ·{" "}
                  {o.pickup.vehicle_type}
                </p>
                <p className="tnum text-xs text-muted">
                  {o.pickup.contact_name} · {o.pickup.contact_phone}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">
                {o.viewer_is_seller
                  ? "Not scheduled yet — set a date and slot."
                  : "The seller has not scheduled the pickup yet."}
              </p>
            )}
          </div>
          <div className="border-l-3 border-cool bg-cool-soft px-3 py-2 text-sm">
            <span className="tnum font-mono">{o.counterpart.phone}</span>
            <Pill tone="good">unmasked — deal accepted</Pill>
          </div>
        </div>
      </div>

      {o.viewer_is_seller && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-rule pt-3">
          <Button variant="ghost" onClick={() => setPickupOpen(!pickupOpen)}>
            {o.pickup ? "Reschedule pickup" : "Schedule pickup"}
          </Button>
          {next && (
            <Button
              onClick={async () => {
                await patch(`/orders/${o.id}/status`, { status: next });
                onChange();
              }}
              disabled={!o.pickup && next !== "pickup_scheduled"}
            >
              Mark {next.replace("_", " ")} →
            </Button>
          )}
        </div>
      )}

      {pickupOpen && (
        <PickupForm
          orderId={o.id}
          onDone={() => {
            setPickupOpen(false);
            onChange();
          }}
        />
      )}
    </Card>
  );
}

function PickupForm({ orderId, onDone }: { orderId: number; onDone: () => void }) {
  const [sug, setSug] = useState<import("../types").HaulSuggestion | null>(null);
  const [f, setF] = useState({
    address_id: 0,
    scheduled_date: new Date(Date.now() + 864e5).toISOString().slice(0, 10),
    slot: "",
    vehicle_type: "",
    contact_name: "",
    contact_phone: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<import("../types").HaulSuggestion>(`/orders/${orderId}/haul-suggestion`).then((s) => {
      setSug(s);
      setF((x) => ({
        ...x,
        address_id: s.default_address_id,
        slot: s.slots[1] ?? s.slots[0],
        vehicle_type: s.haul?.truck ?? s.vehicle_types[0],
      }));
    });
  }, [orderId]);

  if (!sug) return <p className="mt-3 text-sm text-muted">Loading haul plan…</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await post(`/orders/${orderId}/pickup`, f);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 border-t border-rule pt-3">
      <p className="mb-2 text-sm text-ink-2">
        Same haul plan the buyer priced — the tanker type is pre-selected from it.
      </p>
      {sug.haul && <HaulPlanCard haul={sug.haul} />}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Date">
          <input
            type="date"
            className={inputClass}
            value={f.scheduled_date}
            onChange={(e) => setF({ ...f, scheduled_date: e.target.value })}
          />
        </Field>
        <Field label="Time slot">
          <select
            className={inputClass}
            value={f.slot}
            onChange={(e) => setF({ ...f, slot: e.target.value })}
          >
            {sug.slots.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Pickup site">
          <select
            className={inputClass}
            value={f.address_id}
            onChange={(e) => setF({ ...f, address_id: Number(e.target.value) })}
          >
            {sug.pickup_addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} — {a.city}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tanker type">
          <select
            className={inputClass}
            value={f.vehicle_type}
            onChange={(e) => setF({ ...f, vehicle_type: e.target.value })}
          >
            {sug.vehicle_types.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="On-site contact">
          <input
            required
            className={inputClass}
            placeholder="Ramesh K."
            value={f.contact_name}
            onChange={(e) => setF({ ...f, contact_name: e.target.value })}
          />
        </Field>
        <Field label="Contact phone">
          <input
            required
            className={inputClass}
            placeholder="+91 ..."
            value={f.contact_phone}
            onChange={(e) => setF({ ...f, contact_phone: e.target.value })}
          />
        </Field>
      </div>
      {error && (
        <p className="mt-2 border-l-3 border-stop bg-stop-soft px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <Button className="mt-3">Confirm pickup</Button>
    </form>
  );
}

/* ------------------------------------------------------ capture methods */

/** Sellers add capture routes after signup — from here, or inline while
 *  writing a listing. */
export function CaptureMethods() {
  const { me, meta, refresh } = useAuth();
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!me) return null;
  const rows = me.capture_method_rows ?? [];
  const suggestions = (meta?.capture_methods ?? []).filter(
    (m) => !me.capture_methods.includes(m),
  );

  const save = async () => {
    const method = (value === "__custom" ? custom : value).trim();
    if (!method) return;
    setError(null);
    try {
      await post("/capture-methods", { method });
      await refresh();
      setValue("");
      setCustom("");
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (id: number) => {
    await api(`/capture-methods/${id}`, { method: "DELETE" });
    await refresh();
  };

  return (
    <Card className="px-4 py-3">
      <div className="flex items-baseline">
        <Label>Capture methods</Label>
        <span className="ml-auto text-xs text-muted">
          these fill the “captured by” dropdown on every listing
        </span>
      </div>

      {rows.length === 0 && (
        <p className="mt-2 text-sm text-muted">
          None yet — add one and it becomes selectable on your listing form.
        </p>
      )}

      <ul className="mt-2 flex flex-wrap gap-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-2 border border-rule px-2 py-1 text-sm"
          >
            {r.method}
            <button
              type="button"
              className="text-xs text-stop"
              onClick={() => remove(r.id)}
              title="Remove"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Method">
            <select
              className={inputClass}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            >
              <option value="">Select…</option>
              {suggestions.map((m) => (
                <option key={m}>{m}</option>
              ))}
              <option value="__custom">Something else…</option>
            </select>
          </Field>
          {value === "__custom" && (
            <Field label="Name it">
              <input
                autoFocus
                className={inputClass}
                placeholder="e.g. Calcium looping"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            </Field>
          )}
          <Button onClick={save}>Save</Button>
          <Button variant="ghost" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="ghost" className="mt-3" onClick={() => setAdding(true)}>
          + Add capture method
        </Button>
      )}

      {error && (
        <p className="mt-2 border-l-3 border-stop bg-stop-soft px-3 py-2 text-sm">
          {error}
        </p>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------- profile */

export function Profile() {
  const { me } = useAuth();
  const nav = useNavigate();
  if (!me) return null;
  const isSeller = me.user.role === "emitter";

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Company profile</SectionTitle>
      <Card className="px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-semibold">{me.company.name}</span>
          <Verified company={me.company} />
          <Rating value={me.company.rating} />
        </div>
        <p className="tnum mt-1 text-sm text-muted">
          {me.company.category} · {me.company.phone} · GSTIN {me.company.gstin} ·{" "}
          {me.user.email}
        </p>
      </Card>

      <Card className="px-4 py-3">
        <div className="flex items-baseline">
          <Label>{isSeller ? "Storage sites" : "Delivery locations"}</Label>
          <span className="ml-auto text-xs text-muted">
            these fill the dropdowns on every form
          </span>
        </div>
        <ul className="mt-2">
          {me.addresses.map((a) => (
            <li
              key={a.id}
              className="tnum flex items-baseline gap-2 border-b border-rule py-1.5 text-sm last:border-0"
            >
              <span className="font-medium">{a.label}</span>
              <span className="text-muted">
                {a.city}, {a.state} · {a.lat.toFixed(3)}, {a.lng.toFixed(3)}
              </span>
              {a.is_default && <Pill>default</Pill>}
            </li>
          ))}
        </ul>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => nav(isSeller ? "/listings/new" : "/requirements")}
        >
          Add one while creating {isSeller ? "a listing" : "a requirement"}
        </Button>
      </Card>

      {isSeller && <CaptureMethods />}
    </div>
  );
}
