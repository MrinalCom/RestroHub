"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

export type Role = "customer" | "staff" | "owner";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  loggingOut: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("restrohub_token");
    const storedUser = localStorage.getItem("restrohub_user");
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch {
        localStorage.removeItem("restrohub_token");
        localStorage.removeItem("restrohub_user");
      }
    }
    setReady(true);
  }, []);

  function login(newUser: AuthUser, newToken: string) {
    localStorage.setItem("restrohub_token", newToken);
    localStorage.setItem("restrohub_user", JSON.stringify(newUser));
    setLoggingOut(false);
    setUser(newUser);
    setToken(newToken);
  }

  function logout() {
    // Set before clearing user so a protected page's own "redirect to /login if
    // unauthenticated" guard effect doesn't race this intentional navigation to "/".
    setLoggingOut(true);
    localStorage.removeItem("restrohub_token");
    localStorage.removeItem("restrohub_user");
    setUser(null);
    setToken(null);
    router.push("/");
  }

  return (
    <AuthContext.Provider value={{ user, token, ready, loggingOut, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
