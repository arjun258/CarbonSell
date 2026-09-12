import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, inr, patch, post } from "../api";
import { useAuth } from "../auth";
import { AddressPicker } from "../components/AddressPicker";
import { ContaminantRows, type Row } from "../components/Contaminants";
import {
  Button,
  Card,
  ContaminantTable,
  Empty,
  Field,
  HaulPlanCard,
  KpiRow,
  Label,
  Pill,
  Rating,
  SectionTitle,
  inputClass,
} from "../ui";
import type { Bid, Dashboard, Listing } from "../types";

/* -------------------------------------------------------------- overview */

export function SellerOverview() {
  const [d, setD] = useState<Dashboard | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);

  useEffect(() => {
    api<Dashboard>("/dashboard").then(setD);
    api<{ bids: Bid[] }>("/bids/mine").then((r) => setBids(r.bids));
  }, []);

  if (!d) return <p className="text-sm text-muted">Loading…</p>;
  const pending = bids.filter((b) => b.status === "pending");

  return (
    <div className="flex flex-col gap-6">
      <KpiRow kpis={d.kpis} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle
            right={<Link to="/orders" className="text-accent underline">All orders</Link>}
          >
            Approved orders
          </SectionTitle>
          {d.orders.length ? (
            <div className="flex flex-col gap-3">
              {d.orders.map((o) => (
                <Card key={o.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-xs text-muted">#{o.id}</span>
                    <span className="font-medium">{o.counterpart.name}</span>
                    <Pill tone={o.status === "delivered" ? "good" : "warn"}>
                      {o.status.replace("_", " ")}
                    </Pill>
                    <span className="tnum ml-auto text-sm">
                      {inr(o.volume_t)} tonne · ₹{inr(o.total_value)}
                    </span>
                  </div>
                  <p className="tnum mt-1 text-xs text-muted">
                    {o.pickup
                      ? `pickup ${o.pickup.scheduled_date}, ${o.pickup.slot}`
                      : "needs a pickup date"}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Empty title="No orders yet" hint="Accept a bid and it lands here." />
          )}
        </div>

        <div>
          <SectionTitle
            right={<Link to="/messages" className="text-accent underline">All messages</Link>}
          >
            Conversations
          </SectionTitle>
          {d.threads.length ? (
            <div className="flex flex-col gap-3">
              {d.threads.map((t) => (
                <Card key={t.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{t.counterpart.name}</span>
                    <Pill tone={t.contact_shared ? "good" : "neutral"}>
                      {t.contact_shared ? "number shared" : "number hidden"}
                    </Pill>
                    <span className="tnum ml-auto text-xs text-muted">
                      {t.message_count} message{t.message_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-ink-2">
                    {t.last_message || "No messages yet"}
                  </p>
                  <Link
                    to="/messages"
                    className="mt-1 inline-block text-xs text-accent underline"
                  >
                    Open →
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <Empty
              title="No conversations"
              hint="Buyers start these from your listings."
            />
          )}
        </div>
      </div>

      <div>
        <SectionTitle
          right={<Link to="/listings/new" className="text-accent underline">+ New listing</Link>}
        >
          Bids waiting on you
        </SectionTitle>
        {pending.length === 0 ? (
          <Empty
            title="No open bids"
            hint="Buyers in your region are searching — keep your listings current."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {pending.slice(0, 3).map((b) => (
              <Card key={b.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{b.buyer.name}</span>
                  <Pill>{b.use_case}</Pill>
                  <span className="tnum ml-auto text-sm">
                    {inr(b.volume_t)} t @ ₹{inr(b.price_per_t)}/t
                  </span>
                </div>
                <Link to="/bids" className="mt-2 inline-block text-sm text-accent underline">
                  Review →
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- listings */

export function SellerListings() {
  const [rows, setRows] = useState<Listing[]>([]);
  useEffect(() => {
    api<{ listings: Listing[] }>("/listings/mine").then((r) => setRows(r.listings));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        right={
          <Link to="/listings/new">
            <Button>+ New listing</Button>
          </Link>
        }
      >
        My listings
      </SectionTitle>

      {rows.length === 0 && (
        <Empty
          title="No listings yet"
          hint="Post what you capture and buyers within 800 km will see it ranked by delivered cost."
        />
      )}

      <div className="overflow-x-auto border border-rule bg-surface">
        <table className="w-full min-w-[54rem] text-sm">
          <thead>
            <tr className="border-b border-rule-strong bg-surface-2">
              {["Purity", "Volume", "Form", "₹/t", "Pickup site", "From", "Bids", "Chats", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left font-mono text-[10px] tracking-wider text-muted uppercase"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-b border-rule last:border-0">
                <td className="tnum px-3 py-2 font-medium">
                  {l.purity_pct}%
                  {l.storage_full && (
                    <span className="ml-2">
                      <Pill tone="warn">urgent</Pill>
                    </span>
                  )}
                </td>
                <td className="tnum px-3 py-2">{inr(l.volume_t)} t</td>
                <td className="px-3 py-2">{l.form}</td>
                <td className="tnum px-3 py-2">₹{inr(l.price_per_t)}</td>
                <td className="px-3 py-2">{l.address.label}</td>
                <td className="px-3 py-2 text-muted">{l.available_from}</td>
                <td className="tnum px-3 py-2">{l.bid_count ?? 0}</td>
                <td className="tnum px-3 py-2">{l.thread_count ?? 0}</td>
                <td className="px-3 py-2">
                  <Link to={`/listings/${l.id}`} className="text-accent underline">
                    view
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function NewListing() {
  const { me } = useAuth();
  const nav = useNavigate();
  const [addressId, setAddressId] = useState<number | null>(
    me?.addresses.find((a) => a.is_default)?.id ?? null,
  );
  const [f, setF] = useState({
    volume_t: 100,
    purity_pct: 95,
    form: "liquid",
    price_per_t: 2000,
    available_from: new Date().toISOString().slice(0, 10),
    source_type: me?.capture_methods[0] ?? "",
    lab_report: "",
    storage_full: false,
  });
  const [rows, setRows] = useState<Row[]>([
    { species: "N2", ppm: 40000 },
    { species: "O2", ppm: 6000 },
    { species: "H2O", ppm: 300 },
    { species: "SO2", ppm: 250 },
    { species: "NOx", ppm: 220 },
    { species: "H2S", ppm: 3 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!addressId) return setError("Pick a pickup site.");
    if (!f.source_type) return setError("Pick how this CO₂ was captured.");
    try {
      const saved = await post<Listing>("/listings", {
        ...f,
        address_id: addressId,
        contaminants: rows,
      });
      nav(`/listings/${saved.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const site = me?.addresses.find((a) => a.id === addressId);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle right="everything here is prefilled from your profile">
        New supply listing
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <Card className="px-4 py-4">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <AddressPicker
                label="Pickup site"
                value={addressId}
                onChange={setAddressId}
              />
              <div className="flex flex-col gap-1">
                <Label>Captured by</Label>
                <select
                  className={`${inputClass} w-full`}
                  value={f.source_type}
                  onChange={(e) => setF({ ...f, source_type: e.target.value })}
                >
                  <option value="">Select…</option>
                  {(me?.capture_methods ?? []).map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMethodOpen(true)}
                  className="self-start text-xs text-accent underline"
                >
                  + Add a new capture method
                </button>
              </div>
              <Field label="Volume available (tonne)">
                <input
                  type="number"
                  className={inputClass}
                  value={f.volume_t}
                  onChange={(e) => setF({ ...f, volume_t: Number(e.target.value) })}
                />
              </Field>
              <Field label="CO₂ purity (%)">
                <input
                  type="number"
                  step="0.1"
                  max={100}
                  className={inputClass}
                  value={f.purity_pct}
                  onChange={(e) => setF({ ...f, purity_pct: Number(e.target.value) })}
                />
              </Field>
              <Field label="Form">
                <select
                  className={inputClass}
                  value={f.form}
                  onChange={(e) => setF({ ...f, form: e.target.value })}
                >
                  <option value="liquid">Liquid</option>
                  <option value="gas">Gas</option>
                </select>
              </Field>
              <Field label="Price (₹/tonne ex-works)">
                <input
                  type="number"
                  className={inputClass}
                  value={f.price_per_t}
                  onChange={(e) => setF({ ...f, price_per_t: Number(e.target.value) })}
                />
              </Field>
              <Field label="Available from">
                <input
                  type="date"
                  className={inputClass}
                  value={f.available_from}
                  onChange={(e) => setF({ ...f, available_from: e.target.value })}
                />
              </Field>
              <Field label="Lab report reference">
                <input
                  className={inputClass}
                  placeholder="lab-2026-09.pdf"
                  value={f.lab_report}
                  onChange={(e) => setF({ ...f, lab_report: e.target.value })}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={f.storage_full}
                onChange={(e) => setF({ ...f, storage_full: e.target.checked })}
              />
              Storage nearly full — flag this as an urgent discounted offer
            </label>

            <div className="border-t border-rule pt-3">
              <ContaminantRows
                purity={f.purity_pct}
                rows={rows}
                setRows={setRows}
              />
            </div>

            {error && (
              <p className="border-l-3 border-stop bg-stop-soft px-3 py-2 text-sm">
                {error}
              </p>
            )}
            <Button className="self-start">Publish listing</Button>
          </form>

          {methodOpen && (
            <AddCaptureMethodModal
              onClose={() => setMethodOpen(false)}
              onSaved={(method) => setF((x) => ({ ...x, source_type: method }))}
            />
          )}
        </Card>

        <Card className="px-4 py-3">
          <Label>How buyers will see it</Label>
          <div className="mt-2 border border-rule px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{me?.company.name}</span>
              {me?.company.is_verified && <Pill tone="good">✓</Pill>}
            </div>
            <p className="tnum mt-1 text-sm text-muted">
              {f.purity_pct}% · {inr(f.volume_t)} tonne · {f.form}
              {site && ` · ${site.city}`}
            </p>
            <p className="tnum mt-1 text-sm">
              ₹{inr(f.price_per_t)}
              <span className="text-xs text-muted">/t ex-works</span>
            </p>
            {f.storage_full && (
              <div className="mt-1">
                <Pill tone="warn">urgent — storage nearly full</Pill>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            Buyers see a delivered price, not this one: haulage from{" "}
            {site?.city ?? "your site"} plus any purification or cleanup their
            spec needs.
          </p>
          <div className="mt-3">
            <ContaminantTable rows={rows} />
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Same idea as the address modal: never leave a half-written listing to
 *  record a capture method. */
function AddCaptureMethodModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (method: string) => void;
}) {
  const { me, meta, refresh } = useAuth();
  const [value, setValue] = useState("");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const suggestions = (meta?.capture_methods ?? []).filter(
    (m) => !(me?.capture_methods ?? []).includes(m),
  );

  const save = async () => {
    const method = (value === "__custom" ? custom : value).trim();
    if (!method) return setError("Pick a method or name your own.");
    setBusy(true);
    setError(null);
    try {
      await post("/capture-methods", { method });
      await refresh();
      onSaved(method);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-24">
      <div className="w-full max-w-md border border-rule-strong bg-surface shadow-lg">
        <div className="flex items-baseline gap-3 border-b border-rule px-4 py-3">
          <h3 className="font-semibold">Add a capture method</h3>
          <span className="ml-auto text-xs text-muted">
            Stays on this page
          </span>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4">
          <Field label="Method">
            <select
              autoFocus
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
                className={inputClass}
                placeholder="e.g. Calcium looping"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            </Field>
          )}
          {error && (
            <p className="border-l-3 border-stop bg-stop-soft px-3 py-2 text-sm">
              {error}
            </p>
          )}
          <p className="text-xs text-muted">
            It is saved to your profile, so every future listing offers it too.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-rule px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save method"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ bids */

export function SellerBids() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const nav = useNavigate();

  const load = () => api<{ bids: Bid[] }>("/bids/mine").then((r) => setBids(r.bids));
  useEffect(() => {
    load();
  }, []);

  const respond = async (id: number, status: "accepted" | "rejected") => {
    setBusy(id);
    try {
      const r = await patch<{ order_id: number | null }>(`/bids/${id}`, { status });
      await load();
      if (r.order_id) nav("/orders");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle right={`${bids.filter((b) => b.status === "pending").length} pending`}>
        Incoming bids
      </SectionTitle>

      {bids.length === 0 && (
        <Empty title="No bids yet" hint="They arrive from buyers browsing your listings." />
      )}

      <div className="flex flex-col gap-3">
        {bids.map((b) => (
          <Card key={b.id} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium">{b.buyer.name}</span>
              <span className="text-xs text-muted">{b.buyer.category}</span>
              <Rating value={b.buyer.rating} />
              {b.buyer.is_verified && <Pill tone="good">✓ verified</Pill>}
              <Pill
                tone={
                  b.status === "accepted" ? "good" : b.status === "rejected" ? "stop" : "neutral"
                }
              >
                {b.status}
              </Pill>
              <span className="tnum ml-auto text-sm">
                {inr(b.volume_t)} t @ ₹{inr(b.price_per_t)}/t
                <span className="text-muted"> vs ask ₹{inr(b.listing.ask_per_t)}</span>
              </span>
            </div>

            <p className="tnum mt-1 text-sm text-ink-2">
              for {b.use_case} into {b.delivery_city}
              {b.distance_km !== null && ` · ${inr(b.distance_km)} km`} · listing #
              {b.listing.id} at {b.listing.purity_pct}%
            </p>

            {b.note && <p className="mt-1 text-sm text-ink-2">“{b.note}”</p>}

            {b.haul && (
              <div className="mt-3 max-w-md">
                <HaulPlanCard haul={b.haul} />
              </div>
            )}

            {b.status === "pending" && (
              <div className="mt-3 flex gap-2 border-t border-rule pt-3">
                <Button onClick={() => respond(b.id, "accepted")} disabled={busy === b.id}>
                  Accept
                </Button>
                <Button
                  variant="danger"
                  onClick={() => respond(b.id, "rejected")}
                  disabled={busy === b.id}
                >
                  Reject
                </Button>
                <Link to="/messages">
                  <Button variant="ghost">Message buyer</Button>
                </Link>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
