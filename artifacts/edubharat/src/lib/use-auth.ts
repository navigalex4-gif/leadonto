import { useState, useEffect, useCallback } from "react";
import { trackFunnel } from "./analytics";

export type AuthUser = {
  id: number;
  email: string;
  name?: string | null;
  picture?: string | null;
  preferredLanguage?: string | null;
  isAdmin?: boolean;
};

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/me`, { credentials: "include" });
      const data = (await res.json()) as { user: AuthUser | null };
      setUser(data.user);
      if (data.user) {
        try {
          if (sessionStorage.getItem("leadonto_google_signup_pending")) {
            sessionStorage.removeItem("leadonto_google_signup_pending");
            trackFunnel("signup_completed", { method: "google" });
          }
        } catch { /* private browsing may block sessionStorage */ }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);
  useEffect(() => {
    const onAuthChanged = () => { void fetchMe(); };
    window.addEventListener("edubharat-auth-changed", onAuthChanged);
    return () => window.removeEventListener("edubharat-auth-changed", onAuthChanged);
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      const response = await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
      if (!response.ok) return false;
      setUser(null);
      window.dispatchEvent(new Event("edubharat-auth-changed"));
      return true;
    } catch {
      return false;
    }
  }, []);

  const loginWithGoogle = useCallback((guestId?: string, returnTo?: string) => {
    const url = new URL(`${BASE}/api/auth/google`, window.location.href);
    if (guestId) url.searchParams.set("guestId", guestId);
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      url.searchParams.set("returnTo", returnTo);
    }
    window.location.href = url.toString();
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    try {
      const res = await fetch(`${BASE}/api/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      const data = await res.json() as { success?: boolean; error?: string; dev?: string };
      return res.ok ? data : { error: data.error ?? "We couldn't send the OTP. Please try again." };
    } catch {
      return { error: "We couldn't reach the sign-in service. Check your connection and try again." };
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string, guestId?: string) => {
    try {
      const res = await fetch(`${BASE}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, ...(guestId ? { guestId } : {}) }),
        credentials: "include",
      });
      const data = (await res.json()) as { success?: boolean; user?: AuthUser; error?: string };
      if (!res.ok) return { error: data.error ?? "We couldn't verify that code. Please try again." };
      if (data.success && data.user) {
        setUser(data.user);
        // Navbar and other layout components have their own useAuth instance.
        // Notify them immediately so email OTP login looks the same as OAuth
        // without requiring a full page reload.
        window.dispatchEvent(new Event("edubharat-auth-changed"));
      }
      return data;
    } catch {
      return { error: "We couldn't reach the sign-in service. Check your connection and try again." };
    }
  }, []);

  const adminLogin = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const data = (await res.json()) as {
      success?: boolean;
      user?: AuthUser;
      error?: string;
    };
    if (data.success && data.user) {
      setUser({ ...data.user, isAdmin: true });
      window.dispatchEvent(new Event("edubharat-auth-changed"));
    }
    return data;
  }, []);

  return { user, isLoading, logout, loginWithGoogle, sendOtp, verifyOtp, adminLogin, refetch: fetchMe };
}
