"use client";

import { useState, useEffect, useCallback } from "react";

interface AuthState {
  checking: boolean;
  authenticated: boolean;
  email: string | null;
  plan: string | null;
  error: string | null;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    checking: true,
    authenticated: false,
    email: null,
    plan: null,
    error: null,
  });

  const checkAuth = useCallback(async () => {
    setAuth((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      setAuth({
        checking: false,
        authenticated: data.authenticated,
        email: data.email ?? null,
        plan: data.plan ?? null,
        error: data.error ?? null,
      });
    } catch {
      setAuth({
        checking: false,
        authenticated: false,
        email: null,
        plan: null,
        error: "Failed to reach auth endpoint",
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return { ...auth, retry: checkAuth };
}
