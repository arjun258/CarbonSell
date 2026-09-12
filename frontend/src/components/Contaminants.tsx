import { useAuth } from "../auth";
import { Label, Pill, inputClass } from "../ui";

export type Row = { species: string; ppm: number };
export type Cap = { species: string; max_ppm: number };

/** Seller side: declare what the gas actually is.
 *  The unaccounted balance is the honesty check — it shows before publish. */
export function ContaminantRows({
  purity,
  rows,
  setRows,
}: {
  purity: number;
  rows: Row[];
  setRows: (r: Row[]) => void;
}) {
  const { meta } = useAuth();
  const species = meta?.species ?? [];
  const declared = rows.reduce((s, r) => s + (Number(r.ppm) || 0), 0);
  const budget = Math.max(0, (100 - purity) * 10_000);
  const unaccounted = Math.round(budget - declared);
  const clean = Math.abs(unaccounted) <= 1000;

  const available = species.filter((s) => !rows.some((r) => r.species === s.code));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <Label>Contaminant profile</Label>
        <span className="text-xs text-muted">
          everything in ppm · 1% = 10,000 ppm
        </span>
      </div>

      {rows.length > 0 && (
        <div className="border border-rule">
          {rows.map((r, i) => (
            <div
              key={r.species}
              className="flex items-center gap-2 border-b border-rule px-3 py-1.5 last:border-0"
            >
              <span className="w-28 text-sm font-medium">{r.species}</span>
              <span className="flex-1 text-xs text-muted">
                {species.find((s) => s.code === r.species)?.label}
              </span>
              <input
                type="number"
                min={0}
                className={`${inputClass} tnum w-28 text-right`}
                value={r.ppm}
                onChange={(e) =>
                  setRows(
                    rows.map((x, j) =>
                      j === i ? { ...x, ppm: Number(e.target.value) } : x,
                    ),
                  )
                }
              />
              <span className="w-8 text-xs text-muted">ppm</span>
              <button
                type="button"
                className="text-xs text-stop"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            className={inputClass}
            value=""
            onChange={(e) =>
              e.target.value &&
              setRows([...rows, { species: e.target.value, ppm: 0 }])
            }
          >
            <option value="">+ Add contaminant…</option>
            {available.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        className={`flex items-center gap-2 border-l-3 px-3 py-2 text-sm ${
          clean ? "border-good bg-good-soft" : "border-accent bg-accent-soft"
        }`}
      >
        <span className="tnum">
          Unaccounted balance: <strong>{unaccounted.toLocaleString("en-IN")} ppm</strong>
        </span>
        {clean ? (
          <Pill tone="good">balanced</Pill>
        ) : (
          <span className="text-xs text-ink-2">
            buyers filter on this — declare what is in the stream
          </span>
        )}
      </div>
    </div>
  );
}

/** Buyer side: the buyer's own ppm limits. Declaring none is normal and
 *  means contaminants are not used to filter at all. */
export function ContaminantCaps({
  caps,
  setCaps,
}: {
  caps: Cap[];
  setCaps: (c: Cap[]) => void;
}) {
  const { meta } = useAuth();
  const species = meta?.species ?? [];
  const available = species.filter((s) => !caps.some((c) => c.species === s.code));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <Label>Contaminant limits</Label>
        <span className="text-xs text-muted">optional · maximum ppm you accept</span>
      </div>

      {caps.length === 0 && (
        <p className="border border-rule bg-surface-2 px-3 py-2 text-sm text-ink-2">
          No limits set. Every stream that meets your purity floor will be
          matched — add a limit only if a specific contaminant matters to your
          process.
        </p>
      )}

      {caps.length > 0 && (
        <div className="border border-rule">
          {caps.map((c, i) => (
            <div
              key={c.species}
              className="flex items-center gap-2 border-b border-rule px-3 py-1.5 last:border-0"
            >
              <span className="w-28 text-sm font-medium">{c.species}</span>
              <span className="flex-1 text-xs text-muted">
                {species.find((s) => s.code === c.species)?.label} ≤
              </span>
              <input
                type="number"
                min={0}
                className={`${inputClass} tnum w-28 text-right`}
                value={c.max_ppm}
                onChange={(e) =>
                  setCaps(
                    caps.map((x, j) =>
                      j === i ? { ...x, max_ppm: Number(e.target.value) } : x,
                    ),
                  )
                }
              />
              <span className="w-8 text-xs text-muted">ppm</span>
              <button
                type="button"
                className="text-xs text-stop"
                onClick={() => setCaps(caps.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <select
          className={inputClass}
          value=""
          onChange={(e) =>
            e.target.value &&
            setCaps([...caps, { species: e.target.value, max_ppm: 100 }])
          }
        >
          <option value="">+ Add a limit…</option>
          {available.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      <p className="text-xs text-muted">
        A stream over any limit you set will not be offered to you.
      </p>
    </div>
  );
}
