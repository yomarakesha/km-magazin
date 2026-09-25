import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler, type Role } from "./api";

interface Me {
  username: string;
  role: Role;
}
interface AuthState {
  me: Me | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Owner passes every gate, mirroring backend require_role(). */
  can: (...roles: Role[]) => boolean;
}

const Ctx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => setMe(null));
    api
      .me()
      .then((r) => setMe(r.authenticated ? { username: r.username, role: r.role } : null))
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api.login(username, password);
    setMe({ username: r.username, role: r.role });
  }, []);
  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    setMe(null);
  }, []);
  const can = useCallback((...roles: Role[]) => !!me && (me.role === "owner" || roles.includes(me.role)), [me]);

  return <Ctx.Provider value={{ me, ready, login, logout, can }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Владелец",
  warehouse: "Склад",
  sales: "Продавец",
  content: "Контент",
};
