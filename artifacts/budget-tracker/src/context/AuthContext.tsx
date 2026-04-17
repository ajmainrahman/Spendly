import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "spendly_token";

interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthSuccessPayload {
  token: string;
  user: AuthUser;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          clearToken();
        }
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const readApiPayload = async (res: Response): Promise<{ error?: string; [key: string]: unknown }> => {
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return (await res.json()) as { error?: string; [key: string]: unknown };
    }

    const text = await res.text();
    if (!text.trim()) {
      throw new Error("Empty server response. Check API deployment logs.");
    }

    if (text.trimStart().startsWith("<!doctype") || text.trimStart().startsWith("<html")) {
      throw new Error("API route returned HTML instead of JSON. Check Vercel rewrites and serverless function status.");
    }

    throw new Error(text.slice(0, 220));
  };

  const login = async (email: string, password: string) => {
    let res: Response;
    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error("Could not reach the server. Please try again.");
    }
    const data = (await readApiPayload(res)) as Partial<AuthSuccessPayload> & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Login failed");
    if (!data.token || !data.user) {
      throw new Error("Invalid login response from server");
    }
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    let res: Response;
    try {
      res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
    } catch {
      throw new Error("Could not reach the server. Please try again.");
    }
    const data = (await readApiPayload(res)) as Partial<AuthSuccessPayload> & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Registration failed");
    if (!data.token || !data.user) {
      throw new Error("Invalid registration response from server");
    }
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
