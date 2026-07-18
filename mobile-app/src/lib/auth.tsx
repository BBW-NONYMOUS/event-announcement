// Auth context (per AGENTS.md: lib/auth.js).
//
// The storage primitives live in lib/storage.ts so lib/api.ts can attach the
// JWT without importing this module (which imports lib/api.ts in turn).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, onSessionExpired, type User } from "@/lib/api";
import { TOKEN_KEY, USER_KEY, clearSession, getItem, setItem } from "@/lib/storage";

export { getToken, saveToken } from "@/lib/storage";

// --- context ----------------------------------------------------------------

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Restore session on cold start.
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          getItem(TOKEN_KEY),
          getItem(USER_KEY),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser) as User);
        }
      } catch {
        // ignore corrupt/missing session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (t: string, u: User) => {
    setToken(t);
    setUser(u);
    await Promise.all([setItem(TOKEN_KEY, t), setItem(USER_KEY, JSON.stringify(u))]);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      await persist(res.token, res.user);
    },
    [persist]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api.register(name, email, password);
      await persist(res.token, res.user);
    },
    [persist]
  );

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    // Otherwise the next account briefly sees the previous one's tickets.
    queryClient.clear();
    await clearSession();
  }, [queryClient]);

  // The server rejected our token (expired, or revoked). Drop the session so
  // the guard sends us to login, instead of stranding the user on a screen
  // that looks signed in but refuses every action.
  useEffect(
    () =>
      onSessionExpired(() => {
        setToken(null);
        setUser(null);
        queryClient.clear();
      }),
    [queryClient]
  );

  const value = useMemo<AuthState>(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
