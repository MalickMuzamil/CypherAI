"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, clearCsrfToken } from "./api";
import type { User } from "./types";
import { useToast } from "@/components/ui/Toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUserState: (user: User | null) => void;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUserState: () => {},
  refreshUser: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/mfa" ||
    pathname === "/";

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.auth.me();
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    function onSessionExpired(e: Event) {
      clearCsrfToken();
      setUser(null);
      const customEvent = e as CustomEvent<{ message?: string }>;
      showToast(
        customEvent.detail?.message || "Your session has expired. Please sign in again.",
        "error",
        "Session Expired"
      );
      if (!isAuthPage) {
        router.push("/login");
      }
    }

    window.addEventListener("vaultly:session-expired", onSessionExpired);
    return () => {
      window.removeEventListener("vaultly:session-expired", onSessionExpired);
    };
  }, [showToast, router, isAuthPage]);

  // Route protection
  useEffect(() => {
    if (!loading) {
      if (!user && !isAuthPage) {
        router.push("/login");
      } else if (user && (pathname === "/login" || pathname === "/register" || pathname === "/mfa")) {
        router.push("/dashboard");
      }
    }
  }, [loading, user, isAuthPage, pathname, router]);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Continue to clear local state
    }
    clearCsrfToken();
    setUser(null);
    showToast("You have been signed out.", "success", "Signed out");
    router.push("/login");
  }, [router, showToast]);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUserState: setUser,
      refreshUser,
      logout,
    }),
    [user, loading, refreshUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
