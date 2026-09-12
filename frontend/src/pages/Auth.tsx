import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { AddressRows, type Suggestion } from "../components/AddressPicker";
import { Button, Card, Field, Label, Pill, inputClass } from "../ui";

const DEMO = [
  { email: "buyer@nagpur.demo", who: "Nagpur CarbonCure — buyer" },
  { email: "emitter@chandrapur.demo", who: "Chandrapur Thermal — seller" },
  { email: "buyer@kutch.demo", who: "Kutch Methanol — buyer" },
  { email: "emitter@kutch.demo", who: "Kutch Cement — seller" },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { health } = useAuth();
  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
          Circular carbon ecosystem
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {health?.app ?? "CarbonSell"}
        </h1>
        <p className="mt-1 max-w-xl text-ink-2">
          A marketplace where captured CO<sub>2</sub> finds the buyer who can
          actually use it — priced all the way to the gate.
        </p>
      </div>
      {children}
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("buyer@nagpur.demo");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      nav("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="px-5 py-5">
          <h2 className="mb-4 font-semibold">Sign in</h2>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Field label="Email">
              <input
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && (
              <p className="border-l-3 border-stop bg-stop-soft px-3 py-2 text-sm">
                {error}
              </p>
            )}
            <Button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
            <p className="text-sm text-muted">
              New company?{" "}
              <Link to="/signup" className="text-accent underline">
                Create an account
              </Link>
            </p>
          </form>
        </Card>

        <Card className="px-5 py-5">
          <div className="mb-3 flex items-baseline gap-2">
            <Label>Demo accounts</Label>
            <span className="ml-auto font-mono text-[11px] text-muted">
              password demo1234
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                onClick={() => {
                  setEmail(d.email);
                  setPassword("demo1234");
                }}
                className="border border-rule px-3 py-2 text-left text-sm hover:border-accent hover:bg-accent-soft"
              >
                <span className="font-medium">{d.who}</span>
                <span className="block font-mono text-xs text-muted">
                  {d.email}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Passwords are bcrypt-hashed in our own database. The session is a
            24-hour JWT.
          </p>
        </Card>
      </div>
    </Shell>
  );
}

export function Signup() {
  const { signup, meta } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState<"emitter" | "buyer">("emitter");
  const [f, setF] = useState({
    company_name: "",
    category: "",
    phone: "",
    email: "",
    password: "",
  });
  const [sites, setSites] = useState<Suggestion[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const categories =
    role === "emitter"
      ? (meta?.emitter_categories ?? [])
      : (meta?.buyer_categories ?? []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!f.category) return setError("Pick a category.");
    if (sites.length === 0)
      return setError(
        role === "emitter"
          ? "Add at least one storage site."
          : "Add at least one delivery location.",
      );
    setBusy(true);
    try {
      await signup({
        ...f,
        role,
        addresses: sites.map((s, i) => ({ ...s, is_default: i === 0 })),
        capture_methods: role === "emitter" ? methods : [],
      });
      nav("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <Card className="px-5 py-5">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Label>I am</Label>
            {(["emitter", "buyer"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  setF({ ...f, category: "" });
                }}
                className={`border px-3 py-1.5 text-sm ${
                  role === r
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-rule-strong hover:border-accent"
                }`}
              >
                {r === "emitter" ? "Capturing CO₂ (seller)" : "Using CO₂ (buyer)"}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company name">
              <input
                required
                className={inputClass}
                value={f.company_name}
                onChange={(e) => setF({ ...f, company_name: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <select
                className={inputClass}
                value={f.category}
                onChange={(e) => setF({ ...f, category: e.target.value })}
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Phone"
              hint="Stays masked until you share it in a conversation"
            >
              <input
                required
                className={inputClass}
                placeholder="+91 98xxx xxxxx"
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
              />
            </Field>
            <Field label="Work email">
              <input
                required
                type="email"
                className={inputClass}
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </Field>
            <Field label="Password" hint="At least 6 characters">
              <input
                required
                type="password"
                minLength={6}
                className={inputClass}
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
              />
            </Field>
          </div>

          <div className="border-t border-rule pt-3">
            <p className="mb-2 text-sm text-ink-2">
              {role === "emitter"
                ? "Add your storage sites once — every listing you create will offer them as a dropdown."
                : "Add your delivery locations once — every requirement will offer them as a dropdown."}
            </p>
            <AddressRows rows={sites} setRows={setSites} />
          </div>

          {role === "emitter" && (
            <div className="border-t border-rule pt-3">
              <Label>How you capture CO₂</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(meta?.capture_methods ?? []).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      setMethods(
                        methods.includes(m)
                          ? methods.filter((x) => x !== m)
                          : [...methods, m],
                      )
                    }
                    className={`border px-2 py-1 text-xs ${
                      methods.includes(m)
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-rule-strong hover:border-accent"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                These become the source-type dropdown on your listing form.
              </p>
            </div>
          )}

          {error && (
            <p className="border-l-3 border-stop bg-stop-soft px-3 py-2 text-sm">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </Button>
            <Pill tone="good">✓ Govt verified on signup</Pill>
            <span className="text-xs text-muted">
              GSTIN format check and the verification API are wired in the
              design; demo companies are pre-verified.
            </span>
          </div>
          <p className="text-sm text-muted">
            Already registered?{" "}
            <Link to="/login" className="text-accent underline">
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </Shell>
  );
}
