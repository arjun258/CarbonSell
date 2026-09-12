import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { Messages } from "./components/ChatPanel";
import { Login, Signup } from "./pages/Auth";
import {
  Browse,
  BuyerBids,
  BuyerOverview,
  ListingDetail,
  Matches,
  OrdersPage,
  Profile,
  Requirements,
} from "./pages/Buyer";
import {
  ListingBids,
  NewListing,
  SellerBids,
  SellerListings,
  SellerOverview,
} from "./pages/Seller";
import { Pill } from "./ui";

const SELLER_NAV = [
  ["/", "Overview"],
  ["/listings", "My listings"],
  ["/bids", "Incoming bids"],
  ["/orders", "Approved orders"],
  ["/messages", "Messages"],
  ["/profile", "Profile & sites"],
] as const;

const BUYER_NAV = [
  ["/", "Overview"],
  ["/browse", "Marketplace"],
  ["/requirements", "My requirements"],
  ["/bids", "My bids"],
  ["/orders", "My orders"],
  ["/messages", "Messages"],
  ["/profile", "Profile & sites"],
] as const;

function TopBar() {
  const { me, health, region, setRegion, logout } = useAuth();
  const current = health?.regions.find((r) => r.code === region);

  return (
    <header className="border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-3">
        <Link to="/" className="font-semibold tracking-tight">
          {health?.app ?? "CarbonSell"}
        </Link>

        <label className="flex items-center gap-2 text-sm">
          <span className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
            Region
          </span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="border border-rule-strong bg-surface px-2 py-1 text-sm"
          >
            {health?.regions.map((r) => (
              <option key={r.code} value={r.code} disabled={!r.enabled}>
                {r.name}
                {r.enabled ? "" : " — coming soon"}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{me?.company.name}</span>
          {me?.company.is_verified && <Pill tone="good">✓ verified</Pill>}
          <span className="font-mono text-[11px] text-muted uppercase">
            {me?.user.role === "emitter" ? "seller" : "buyer"}
          </span>
          <button onClick={logout} className="text-muted underline hover:text-ink">
            Sign out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-2 text-sm text-ink-2">
        Showing supply and demand in{" "}
        <strong className="font-semibold">{current?.name ?? "—"}</strong>
        {!health?.ola_configured && (
          <span className="ml-2 text-xs text-muted">
            · distances via OSRM fallback (no Ola key on the server yet)
          </span>
        )}
      </div>
    </header>
  );
}

function SideNav() {
  const { me } = useAuth();
  const { pathname } = useLocation();
  const nav = me?.user.role === "emitter" ? SELLER_NAV : BUYER_NAV;

  return (
    <nav className="flex shrink-0 flex-row gap-px overflow-x-auto border border-rule bg-rule lg:w-52 lg:flex-col">
      {nav.map(([to, label]) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={`bg-surface px-3 py-2 text-sm whitespace-nowrap ${
              active
                ? "border-l-2 border-accent font-medium text-accent"
                : "text-ink-2 hover:bg-surface-2"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function AppShell() {
  const { me } = useAuth();
  const seller = me?.user.role === "emitter";

  return (
    <div className="min-h-full">
      <TopBar />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:flex-row">
        <SideNav />
        <main className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={seller ? <SellerOverview /> : <BuyerOverview />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/orders" element={<OrdersPage seller={seller} />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/listings/:id" element={<ListingDetail />} />

            {seller ? (
              <>
                <Route path="/listings" element={<SellerListings />} />
                <Route path="/listings/new" element={<NewListing />} />
                <Route path="/listings/:id/bids" element={<ListingBids />} />
                <Route path="/bids" element={<SellerBids />} />
              </>
            ) : (
              <>
                <Route path="/browse" element={<Browse />} />
                <Route path="/requirements" element={<Requirements />} />
                <Route path="/requirements/:id/matches" element={<Matches />} />
                <Route path="/bids" element={<BuyerBids />} />
              </>
            )}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function Gate() {
  const { me, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (!me) {
    return (
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return <AppShell />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
