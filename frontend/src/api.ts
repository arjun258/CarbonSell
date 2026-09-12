import type { Region } from "./types";

const BASE = "/api";

export type Health = {
  status: string;
  app: string;
  regions: Region[];
  default_region: string;
  ola_configured: boolean;
};

export function token(): string | null {
  return localStorage.getItem("token");
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
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
