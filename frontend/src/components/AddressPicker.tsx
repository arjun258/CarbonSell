import { useEffect, useRef, useState } from "react";
import { api, post } from "../api";
import { useAuth } from "../auth";
import { Button, Field, Label, inputClass } from "../ui";
import type { Address } from "../types";

type Suggestion = {
  label: string;
  line1: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
};

/** Ola autocomplete, debounced. Degrades to manual entry rather than
 *  blocking the form when the key is missing or the call fails. */
function useAutocomplete(q: string) {
  const [results, setResults] = useState<Suggestion[]>([]);
  const [configured, setConfigured] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        const r = await api<{ configured: boolean; results: Suggestion[] }>(
          `/geo/autocomplete?q=${encodeURIComponent(q)}`,
        );
        setConfigured(r.configured);
        setResults(r.results ?? []);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => window.clearTimeout(timer.current);
  }, [q]);

  return { results, configured };
}

export function AddAddressModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (a: Address) => void;
}) {
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    label: "",
    line1: "",
    city: "",
    state: "Gujarat",
    pincode: "",
    lat: "",
    lng: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { results, configured } = useAutocomplete(q);

  const pick = (s: Suggestion) => {
    setForm({
      label: s.label.slice(0, 60),
      line1: s.line1,
      city: s.city,
      state: s.state || form.state,
      pincode: "",
      lat: String(s.lat),
      lng: String(s.lng),
    });
    setQ("");
  };

  const save = async () => {
    setError(null);
    if (!form.label || !form.city || !form.lat || !form.lng) {
      setError("Label, city and coordinates are required.");
      return;
    }
    setSaving(true);
    try {
      const saved = await post<Address>("/addresses", {
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
        is_default: false,
      });
      onSaved(saved);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-16">
      <div className="w-full max-w-lg border border-rule-strong bg-surface shadow-lg">
        <div className="flex items-baseline gap-3 border-b border-rule px-4 py-3">
          <h3 className="font-semibold">Add an address</h3>
          <span className="ml-auto text-xs text-muted">
            Stays on this page — nothing you typed is lost
          </span>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4">
          <Field
            label="Search"
            hint={
              configured
                ? "Ola Maps autocomplete — pick a result to fill coordinates"
                : "Ola key not configured on the server: enter the address manually below"
            }
          >
            <input
              autoFocus
              className={inputClass}
              placeholder="e.g. Hazira Industrial Area, Surat"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>

          {results.length > 0 && (
            <ul className="max-h-44 overflow-y-auto border border-rule">
              {results.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => pick(s)}
                    className="block w-full border-b border-rule px-3 py-2 text-left text-sm last:border-0 hover:bg-accent-soft"
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="block text-xs text-muted">{s.line1}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Label">
              <input
                className={inputClass}
                placeholder="Plant Gate 2"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </Field>
            <Field label="City">
              <input
                className={inputClass}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </Field>
            <Field label="State">
              <select
                className={inputClass}
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              >
                <option>Gujarat</option>
                <option>Maharashtra</option>
              </select>
            </Field>
            <Field label="Pincode">
              <input
                className={inputClass}
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              />
            </Field>
            <Field label="Latitude">
              <input
                className={inputClass}
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
              />
            </Field>
            <Field label="Longitude">
              <input
                className={inputClass}
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
              />
            </Field>
          </div>

          {error && (
            <p className="border-l-3 border-stop bg-stop-soft px-3 py-2 text-sm">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-rule px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save address"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Dropdown of saved addresses that can grow without leaving the form. */
export function AddressPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (id: number) => void;
}) {
  const { me, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const addresses = me?.addresses ?? [];

  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <select
          className={`${inputClass} flex-1`}
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          <option value="" disabled>
            Select a site…
          </option>
          {addresses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} — {a.city}
              {a.is_default ? " (default)" : ""}
            </option>
          ))}
        </select>
        <Button variant="ghost" type="button" onClick={() => setOpen(true)}>
          + Add new address
        </Button>
      </div>
      {open && (
        <AddAddressModal
          onClose={() => setOpen(false)}
          onSaved={async (a) => {
            await refresh();
            onChange(a.id);
          }}
        />
      )}
    </div>
  );
}

/** Signup variant: addresses are collected before a company exists, so
 *  rows are held in local state and posted with the signup body. */
export function AddressRows({
  rows,
  setRows,
}: {
  rows: Suggestion[];
  setRows: (r: Suggestion[]) => void;
}) {
  const [q, setQ] = useState("");
  const { results, configured } = useAutocomplete(q);
  const [manual, setManual] = useState(false);

  const add = (s: Suggestion) => {
    setRows([...rows, s]);
    setQ("");
  };

  return (
    <div className="flex flex-col gap-2">
      <Field
        label="Sites"
        hint={
          configured
            ? "Type a plant, warehouse or unit name — Ola autocomplete fills the coordinates"
            : "Server has no Ola key: add sites manually"
        }
      >
        <input
          className={inputClass}
          placeholder="e.g. Dahej PCPIR, Bharuch"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Field>

      {results.length > 0 && (
        <ul className="max-h-40 overflow-y-auto border border-rule">
          {results.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => add(s)}
                className="block w-full border-b border-rule px-3 py-2 text-left text-sm last:border-0 hover:bg-accent-soft"
              >
                <span className="font-medium">{s.label}</span>
                <span className="block text-xs text-muted">{s.line1}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <ul className="border border-rule">
          {rows.map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-2 border-b border-rule px-3 py-2 text-sm last:border-0"
            >
              <span className="font-medium">{r.label}</span>
              <span className="text-xs text-muted">
                {r.city}, {r.state} · {r.lat.toFixed(3)}, {r.lng.toFixed(3)}
              </span>
              <button
                type="button"
                className="ml-auto text-xs text-stop"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {manual ? (
        <ManualRow onAdd={add} />
      ) : (
        <button
          type="button"
          className="self-start text-xs text-accent underline"
          onClick={() => setManual(true)}
        >
          enter a site manually instead
        </button>
      )}
    </div>
  );
}

function ManualRow({ onAdd }: { onAdd: (s: Suggestion) => void }) {
  const [f, setF] = useState({
    label: "",
    city: "",
    state: "Gujarat",
    lat: "",
    lng: "",
  });
  return (
    <div className="grid grid-cols-5 items-end gap-2 border border-rule p-2">
      {(["label", "city", "lat", "lng"] as const).map((k) => (
        <Field key={k} label={k}>
          <input
            className={inputClass}
            value={f[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
          />
        </Field>
      ))}
      <Button
        variant="ghost"
        type="button"
        onClick={() => {
          if (!f.label || !f.city || !f.lat || !f.lng) return;
          onAdd({
            label: f.label,
            line1: `${f.label}, ${f.city}`,
            city: f.city,
            state: f.state,
            lat: Number(f.lat),
            lng: Number(f.lng),
          });
          setF({ label: "", city: "", state: f.state, lat: "", lng: "" });
        }}
      >
        Add site
      </Button>
    </div>
  );
}

export type { Suggestion };
