import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type UserRole = "ADMIN_MASTER" | "USER" | string;

export type User = {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  avatar_url?: string | null;
};

type AuthContextData = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextData | undefined>(undefined);

const STORAGE_TOKEN_KEY = "ctops:token";
const STORAGE_USER_KEY = "ctops:user";
const STORAGE_AVATAR_OVERRIDE_PREFIX = "ctops:avatar_override:";

function apiBaseUrl(): string {
  return (import.meta as any).env?.VITE_API_URL?.toString()?.trim() || "http://localhost:3001";
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function authHeaders(token: string | null): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function withCacheBusting(url: string): string {
  if (!url) return url;
  const v = Date.now();
  return url.includes("?") ? `${url}&v=${v}` : `${url}?v=${v}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => safeJsonParse<User>(localStorage.getItem(STORAGE_USER_KEY)));

  const isAuthenticated = !!token;

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated: User = { ...prev, ...partial };
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const refreshMe = async () => {
    if (!token) return;

    const base = apiBaseUrl();
    const res = await fetch(`${base}/auth/me`, {
      method: "GET",
      headers: authHeaders(token),
    });

    if (!res.ok) {
      // COMENTARIO: SE /ME FALHAR, NAO MATA A SESSAO AUTOMATICAMENTE; DEIXA O USUARIO VER O ERRO NA UI
      return;
    }

    const me = (await res.json()) as User;

    // COMENTARIO: APLICAR AVATAR OVERRIDE (CASO BACKEND NAO PERSISTA AINDA)
    const overrideKey = me?.id ? `${STORAGE_AVATAR_OVERRIDE_PREFIX}${me.id}` : "";
    const overrideAvatar = overrideKey ? localStorage.getItem(overrideKey) : null;

    const finalUser: User = {
      ...me,
      avatar_url: overrideAvatar || me.avatar_url || null,
    };

    setUser(finalUser);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(finalUser));
  };

  const login = async (email: string, password: string) => {
    const base = apiBaseUrl();

    const res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || "Falha ao autenticar.");
    }

    const data = (await res.json()) as { token: string };

    if (!data?.token) {
      throw new Error("Token não retornado pelo servidor.");
    }

    localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
    setToken(data.token);

    // COMENTARIO: CARREGA /ME PARA POPULAR O CONTEXTO
    const meRes = await fetch(`${base}/auth/me`, {
      method: "GET",
      headers: authHeaders(data.token),
    });

    if (meRes.ok) {
      const me = (await meRes.json()) as User;

      // COMENTARIO: APLICAR AVATAR OVERRIDE (CASO BACKEND NAO PERSISTA AINDA)
      const overrideKey = me?.id ? `${STORAGE_AVATAR_OVERRIDE_PREFIX}${me.id}` : "";
      const overrideAvatar = overrideKey ? localStorage.getItem(overrideKey) : null;

      const finalUser: User = {
        ...me,
        avatar_url: overrideAvatar || me.avatar_url || null,
      };

      setUser(finalUser);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(finalUser));
    } else {
      // COMENTARIO: SE /ME FALHAR, AINDA ASSIM MANTEM TOKEN
      setUser(null);
      localStorage.removeItem(STORAGE_USER_KEY);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  };

  useEffect(() => {
    // COMENTARIO: SE TEM TOKEN E USER CARREGADO, TENTA REFRESH SILENCIOSO PARA MANTER DADOS ATUALIZADOS
    if (token) {
      refreshMe().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // COMENTARIO: EXPOR URL COM CACHE-BUSTING PARA QUEM FOR EXIBIR
  const userWithBustedAvatar = useMemo(() => {
    if (!user?.avatar_url) return user;
    return { ...user, avatar_url: withCacheBusting(user.avatar_url) };
  }, [user?.avatar_url]);

  const value: AuthContextData = {
    user: userWithBustedAvatar,
    token,
    isAuthenticated,
    login,
    logout,
    refreshMe,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextData {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
