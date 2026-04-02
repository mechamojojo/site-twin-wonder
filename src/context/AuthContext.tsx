import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

const AUTH_TOKEN_KEY = "compraschina-auth-token";
const AUTH_USER_KEY = "compraschina-auth-user";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
  customerCpf: string | null;
  customerWhatsapp: string | null;
  cep: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
};

export type UpdateProfileData = {
  name?: string;
  customerWhatsapp?: string;
  cep?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  currentPassword?: string;
  newPassword?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  resendVerification: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  /** Após confirmar e-mail pelo link (token único) — persiste e atualiza o estado. */
  setSessionFromVerification: (token: string, user: AuthUser) => void;
};

export type RegisterData = {
  email: string;
  password: string;
  name: string;
  customerCpf: string;
  customerWhatsapp: string;
  cep: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  termsAccepted: boolean;
  turnstileToken?: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): { token: string; user: AuthUser } | null {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userRaw = localStorage.getItem(AUTH_USER_KEY);
    if (!token || !userRaw) return null;
    const user = JSON.parse(userRaw) as AuthUser;
    return { token, user };
  } catch {
    return null;
  }
}

function saveStored(token: string, user: AuthUser) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearStored() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const stored = loadStored();
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(apiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${stored.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setToken(stored.token);
        saveStored(stored.token, data);
      } else {
        clearStored();
        setUser(null);
        setToken(null);
      }
    } catch {
      clearStored();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      setToken(stored.token);
      setUser(stored.user);
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erro ao fazer login");

    saveStored(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const body = {
      email: data.email.trim(),
      password: data.password,
      name: data.name.trim(),
      customerCpf: data.customerCpf.replace(/\D/g, ""),
      customerWhatsapp: data.customerWhatsapp.replace(/\D/g, ""),
      cep: data.cep.replace(/\D/g, ""),
      addressStreet: data.addressStreet.trim(),
      addressNumber: data.addressNumber.trim(),
      addressComplement: data.addressComplement?.trim() || null,
      addressNeighborhood: data.addressNeighborhood.trim(),
      addressCity: data.addressCity.trim(),
      addressState: data.addressState.trim(),
      termsAccepted: data.termsAccepted,
      turnstileToken: data.turnstileToken || undefined,
    };

    const res = await fetch(apiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const resData = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(resData.error || "Erro ao criar conta");

    saveStored(resData.token, resData.user);
    setToken(resData.token);
    setUser(resData.user);
  }, []);

  const resendVerification = useCallback(async () => {
    const t = getAuthToken();
    if (!t) return;
    const res = await fetch(apiUrl("/api/auth/resend-verification"), {
      method: "POST",
      headers: { Authorization: `Bearer ${t}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erro ao reenviar e-mail");
  }, []);

  const updateProfile = useCallback(async (data: UpdateProfileData) => {
    const t = getAuthToken();
    if (!t) throw new Error("Não autenticado");
    const res = await fetch(apiUrl("/api/auth/me"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(resData.error || "Erro ao atualizar perfil");
    const stored = loadStored();
    if (stored) saveStored(stored.token, resData as AuthUser);
    setUser(resData as AuthUser);
  }, []);

  const logout = useCallback(() => {
    clearStored();
    setToken(null);
    setUser(null);
  }, []);

  const setSessionFromVerification = useCallback((newToken: string, newUser: AuthUser) => {
    saveStored(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    fetchMe,
    resendVerification,
    updateProfile,
    setSessionFromVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}
