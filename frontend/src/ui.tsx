import type { ReactNode } from "react";
import { inr, ppm } from "./api";
import type { Company, Haul, Kpi, Match } from "./types";

/* ------------------------------------------------------------ primitives */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-rule bg-surface ${className}`}>{children}</div>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-3 border-b border-rule-strong pb-2">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {right && <div className="ml-auto text-sm text-muted">{right}</div>}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "border border-rule-strong bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent";

export function Button({
  children,
  variant = "primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-ink text-white hover:bg-ink-2",
    ghost: "border border-rule-strong bg-surface hover:border-accent hover:text-accent",
    danger: "border border-stop text-stop hover:bg-stop-soft",
  }[variant];
  return (
    <button
      {...rest}
      className={`px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "stop" | "accent";
}) {
  const tones = {
    neutral: "border-rule-strong text-muted",
    good: "border-good text-good bg-good-soft",
    warn: "border-accent text-accent bg-accent-soft",
    stop: "border-stop text-stop bg-stop-soft",
    accent: "border-accent text-accent",
  }[tone];
  return (
    <span
      className={`inline-block border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase ${tones}`}
    >
      {children}
    </span>
  );
}

export function Verified({ company }: { company: Company }) {
  if (!company.is_verified) return null;
  return <Pill tone="good">✓ Govt verified</Pill>;
}

export function Rating({ value }: { value: number }) {
  return (
    <span className="tnum text-xs text-muted">★ {value.toFixed(1)}</span>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="px-5 py-8 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </Card>
  );
}

export function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-5">
      {kpis.map((k) => (
        <div key={k.label} className="bg-surface px-4 py-3">
          <Label>{k.label}</Label>
          <p className="tnum mt-1 text-2xl font-semibold">
            {k.unit === "INR" ? "₹" : ""}
            {inr(k.value)}
            {k.unit && k.unit !== "INR" && (
              <span className="ml-1 text-xs font-normal text-muted">{k.unit}</span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------ contact reveal */

export function ContactLine({
  company,
  note,
}: {
  company: Company;
  note?: string;
}) {
  return (
    <div className="border-l-3 border-cool bg-cool-soft px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="tnum font-mono">{company.phone}</span>
        {company.phone_revealed ? (
          <Pill tone="good">shared</Pill>
        ) : (
          <Pill tone="neutral">hidden</Pill>
        )}
      </div>
      {!company.phone_revealed && (
        <p className="mt-1 text-xs text-ink-2">
          {note ??
            "Numbers are shared by the seller — ask for theirs in chat."}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------- match pieces */

const FIT_LABELS: Record<string, string> = {
  price: "Price",
  distance: "Distance",
  volume: "Volume",
  rating: "Rating",
};

export function ScoreBars({ fits }: { fits: Record<string, number> }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <Label>Feasibility score</Label>
        <span className="text-xs text-muted">
          how this match compares with the rest of the market
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
      {Object.entries(fits).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-16 font-mono text-[10px] tracking-wider text-muted uppercase">
            {FIT_LABELS[k] ?? k}
          </span>
          <span className="h-1.5 flex-1 bg-rule">
            <span
              className="block h-full bg-accent"
              style={{ width: `${Math.round(v * 100)}%` }}
            />
          </span>
          <span className="tnum w-7 text-right text-[10px] text-muted">
            {Math.round(v * 100)}
          </span>
        </div>
      ))}
      </div>
    </div>
  );
}

export function CostBreakdown({ m }: { m: Match }) {
  const rows = [
    ["Product", m.breakdown.listing_per_t, `${m.purity_pct}% CO₂, ex-works`],
    [
      "Haulage",
      m.breakdown.haul_per_t,
      `${m.haul.truck} (${m.haul.capacity_t} t) × ${m.haul.trips}`,
    ],
  ] as const;

  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value, note]) => (
          <tr key={label} className={value === 0 ? "text-muted" : ""}>
            <td className="py-0.5 pr-3 whitespace-nowrap">{label}</td>
            <td className="tnum py-0.5 pr-3 text-right whitespace-nowrap">
              ₹{inr(value)}
            </td>
            <td className="py-0.5 text-xs text-muted">{note}</td>
          </tr>
        ))}
        <tr className="border-t border-rule-strong font-semibold">
          <td className="py-1 pr-3">Delivered</td>
          <td className="tnum py-1 pr-3 text-right">₹{inr(m.delivered_per_t)}</td>
          <td className="py-1 text-xs font-normal text-muted">per tonne</td>
        </tr>
        <tr className="font-semibold">
          <td className="py-1 pr-3">Total</td>
          <td className="tnum py-1 pr-3 text-right">₹{inr(m.total_cost)}</td>
          <td className="py-1 text-xs font-normal text-muted">
            for {inr(m.covers_t)} tonne
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function HaulPlanCard({ haul }: { haul: Haul }) {
  return (
    <div className="border border-rule bg-surface-2 px-3 py-2">
      <div className="flex items-baseline gap-2">
        <Label>Haul plan</Label>
      </div>
      <p className="mt-1 text-sm font-medium">
        {haul.truck} ({haul.capacity_t} t) × {haul.trips}{" "}
        {haul.trips === 1 ? "trip" : "trips"}
      </p>
      <p className="tnum mt-0.5 text-sm text-ink-2">
        {inr(haul.distance_km)} km · ₹{inr(haul.total_cost)} total · ₹
        {inr(haul.cost_per_t)}/t
      </p>
    </div>
  );
}

export function ContaminantCompare({ m }: { m: Match }) {
  // Nothing to say when the buyer set no limits.
  if (!m.contaminant_detail.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {m.contaminant_detail.map((d) => (
        <span key={d.species} className="tnum">
          <span className="font-medium">{d.species}</span>{" "}
          <span className={d.over ? "text-accent" : "text-muted"}>
            {Math.round(d.actual_ppm)}
          </span>
          <span className="text-good"> ✓ under {d.cap_ppm}</span>
        </span>
      ))}
    </div>
  );
}

export function ContaminantTable({
  rows,
  caps,
}: {
  rows: { species: string; ppm: number }[];
  caps?: Record<string, number>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-rule-strong">
          <th className="py-1 text-left font-mono text-[10px] tracking-wider text-muted uppercase">
            Species
          </th>
          <th className="py-1 text-right font-mono text-[10px] tracking-wider text-muted uppercase">
            Measured
          </th>
          {caps && (
            <th className="py-1 text-right font-mono text-[10px] tracking-wider text-muted uppercase">
              Your cap
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const cap = caps?.[r.species];
          const over = cap !== undefined && r.ppm > cap;
          return (
            <tr key={r.species} className="border-b border-rule last:border-0">
              <td className="py-1">{r.species}</td>
              <td className={`tnum py-1 text-right ${over ? "text-accent" : ""}`}>
                {ppm(r.ppm)}
              </td>
              {caps && (
                <td className="tnum py-1 text-right text-muted">
                  {cap === undefined ? "—" : `${cap} ppm`}
                  {over && <span className="ml-1 text-accent">⚠</span>}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------ order timeline */

export const ORDER_FLOW = [
  "accepted",
  "pickup_scheduled",
  "in_transit",
  "delivered",
] as const;

const FLOW_LABEL: Record<string, string> = {
  accepted: "Accepted",
  pickup_scheduled: "Pickup scheduled",
  in_transit: "In transit",
  delivered: "Delivered",
};

export function StatusTimeline({ status }: { status: string }) {
  const at = ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]);
  return (
    <div className="flex items-start">
      {ORDER_FLOW.map((s, i) => (
        <div key={s} className="flex flex-1 items-start last:flex-none">
          <div className="flex flex-col items-center">
            <span
              className={`size-2.5 rounded-full border ${
                i <= at ? "border-accent bg-accent" : "border-rule-strong bg-surface"
              }`}
            />
            <span
              className={`mt-1 max-w-20 text-center text-[10px] leading-tight ${
                i <= at ? "text-ink" : "text-muted"
              }`}
            >
              {FLOW_LABEL[s]}
            </span>
          </div>
          {i < ORDER_FLOW.length - 1 && (
            <span
              className={`mt-[5px] h-px flex-1 ${i < at ? "bg-accent" : "bg-rule"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
