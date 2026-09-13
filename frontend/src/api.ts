import type { Region } from "./types";

// Locally the Vite dev server proxies /api to port 8000. A deployed build has
// no proxy, so VITE_API_BASE points straight at the API service. Render hands
// that over as a bare hostname, so add the scheme when it is missing.
function apiBase(): string {
  const raw = String(import.meta.env.VITE_API_BASE ?? "").trim();
  if (!raw) return "/api";
  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

const BASE = apiBase();

export type Health = {
  status: string;
  app: string;
  regions: Region[];
  default_region: string;
  ola_configured: boolean;
};

/** Sessions are per tab, not per browser.
 *
 *  localStorage is shared by every tab on the origin, so signing in as a
 *  seller in one tab signed the buyer out of the other. sessionStorage is
 *  scoped to the tab, which lets both sides of a deal be open side by side
 *  - the whole point of a two-sided marketplace demo. A session lasts until
 *  its tab closes; a reload keeps it. */
export function token(): string | null {
  return sessionStorage.getItem("token");
}

export function setToken(t: string | null) {
  if (t) sessionStorage.setItem("token", t);
  else sessionStorage.removeItem("token");
  // Clear the old shared key so an existing login does not leak across tabs.
  localStorage.removeItem("token");
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail ?? `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const post = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });

export const patch = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });

/** Indian-format number. Whole values print whole; anything with a
 *  fraction keeps it, so a figure is never quietly rounded off. */
export function inr(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Number.isInteger(n)
    ? n.toLocaleString("en-IN")
    : n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export function ppm(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(2)}%`;
  return `${inr(n)} ppm`;
}
