import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, post, setToken, token, type Health } from "./api";
import type { Me, Meta } from "./types";

type Ctx = {
  me: Me | null;
  meta: Meta | null;
  health: Health | null;
  region: string;
  setRegion: (r: string) => void;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (body: unknown) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [region, setRegionState] = useState(
    () => localStorage.getItem("region") ?? "west",
  );
  const [loading, setLoading] = useState(true);

  const setRegion = (r: string) => {
    localStorage.setItem("region", r);
    setRegionState(r);
  };

  const refresh = useCallback(async () => {
    if (!token()) {
      setMe(null);
      return;
    }
    try {
      setMe(await api<Me>("/me"));
    } catch {
      setToken(null);
      setMe(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [h, m] = await Promise.all([
        api<Health>("/health").catch(() => null),
        api<Meta>("/meta").catch(() => null),
      ]);
      setHealth(h);
      setMeta(m);
      if (h) setRegionState(localStorage.getItem("region") ?? h.default_region);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const r = await post<{ token: string }>("/auth/login", { email, password });
    setToken(r.token);
    await refresh();
  };

  const signup = async (body: unknown) => {
    const r = await post<{ token: string }>("/auth/signup", body);
    setToken(r.token);
    await refresh();
  };

  const logout = () => {
    setToken(null);
    setMe(null);
  };

  return (
    <AuthContext.Provider
      value={{ me, meta, health, region, setRegion, loading, login, signup, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
