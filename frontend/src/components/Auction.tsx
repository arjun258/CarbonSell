import { inr } from "../api";
import { Label, Pill } from "../ui";
import type { Bidding } from "../types";

/** "19 Sep 2026, 5:00 pm" — a bare date renders as the whole day. */
export function moment(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return value.includes("T")
    ? `${day}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
    : day;
}

/** How long is left, in the largest unit that still says something useful. */
export function countdown(minutes: number): string {
  if (minutes <= 0) return "closing now";
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m left` : `${hours}h left`;
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days}d ${rest}h left` : `${days} day${days === 1 ? "" : "s"} left`;
}

export function windowLabel(b: Bidding): string {
  if (b.mode === "direct") return "Direct sale — no bidding window";
  if (b.state === "upcoming") return `Bidding opens ${moment(b.start)}`;
  if (b.state === "open") {
    const left = b.closes_in_minutes;
    return left === null
      ? `Bidding closes ${moment(b.end)}`
      : `Closes ${moment(b.end)} · ${countdown(left)}`;
  }
  if (b.closed_by_seller) return "The seller stopped accepting bids";
  return `Bidding closed ${moment(b.end)}`;
}

export function StateChip({ b }: { b: Bidding }) {
  if (b.mode === "direct") return <Pill>direct sale</Pill>;
  if (b.state === "open") return <Pill tone="good">bidding open</Pill>;
  if (b.state === "upcoming")
    return <Pill tone="warn">opens {moment(b.start)}</Pill>;
  return <Pill tone="stop">bidding closed</Pill>;
}

/** The three numbers everyone is allowed to see: what it opened at, what the
 *  best bid is, and how many people are in. Identities stay with the seller. */
export function BiddingPanel({ b }: { b: Bidding }) {
  const figures: [string, string][] = [
    ["Starting price", `₹${inr(b.starting_price)}/t`],
    ["Highest bid", b.highest === null ? "—" : `₹${inr(b.highest)}/t`],
    ["Lowest bid", b.lowest === null ? "—" : `₹${inr(b.lowest)}/t`],
    ["Bids placed", String(b.bid_count)],
  ];

  return (
    <div className="border border-rule bg-surface-2 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <Label>Bidding</Label>
        <StateChip b={b} />
        <span className="ml-auto text-xs text-muted">{windowLabel(b)}</span>
      </div>

      {b.mode === "auction" && (
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          {figures.map(([label, value]) => (
            <div key={label}>
              <p className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
                {label}
              </p>
              <p className="tnum text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {b.accepted_t > 0 && (
        <p className="tnum mt-3 border-t border-rule pt-2 text-sm text-ink-2">
          {inr(b.accepted_t)} tonne sold · {inr(b.remaining_t)} tonne still on
          offer
        </p>
      )}

      {b.mode === "auction" && b.auto_award && b.state !== "closed" && (
        <p className="mt-2 text-xs text-muted">
          At the close this listing awards itself to the best bids that fill the
          quantity.
        </p>
      )}

      {b.my_bids.length > 0 && (
        <div className="mt-3 border-t border-rule pt-2">
          <Label>Your bids</Label>
          <ul className="mt-1 flex flex-col gap-1">
            {b.my_bids.map((m) => (
              <li key={m.id} className="tnum flex items-center gap-2 text-sm">
                {inr(m.volume_t)} tonne @ ₹{inr(m.price_per_t)}/t
                <Pill
                  tone={
                    m.status === "accepted"
                      ? "good"
                      : m.status === "rejected"
                        ? "stop"
                        : m.leading
                          ? "good"
                          : "warn"
                  }
                >
                  {m.status === "pending"
                    ? m.leading
                      ? "leading"
                      : "outbid"
                    : m.status}
                </Pill>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
