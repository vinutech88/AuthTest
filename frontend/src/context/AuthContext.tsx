import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { login as loginRequest, type LoginSuccess } from "../api/authClient";

interface AuthState {
  token: string;
  username: string;
  fullName: string;
  role: string;
  modules: string[];
  actions: string[];
}

interface AuthContextValue {
  user: AuthState | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  hasAction: (action: string) => boolean;
  hasModule: (moduleName: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_STORAGE_KEY = "authtest.session";

function readStoredSession(): AuthState | null {
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(() => readStoredSession());

  const login = useCallback(async (identifier: string, password: string) => {
    const result: LoginSuccess = await loginRequest(identifier, password);
    const state: AuthState = {
      token: result.token,
      username: result.username,
      fullName: result.fullName,
      role: result.role,
      modules: result.modules,
      actions: result.actions,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
    setUser(state);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
  }, []);

  const hasAction = useCallback((action: string) => Boolean(user?.actions.includes(action)), [user]);
  const hasModule = useCallback((moduleName: string) => Boolean(user?.modules.includes(moduleName)), [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout, hasAction, hasModule }),
    [user, login, logout, hasAction, hasModule],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
