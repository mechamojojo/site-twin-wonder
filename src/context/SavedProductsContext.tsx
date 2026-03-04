import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAuthToken } from "@/context/AuthContext";
import { apiUrl } from "@/lib/api";

type SavedProductsContextValue = {
  savedSlugs: Set<string>;
  isSaved: (slug: string) => boolean;
  toggle: (slug: string) => Promise<boolean>;
  refetch: () => Promise<void>;
  loading: boolean;
};

const SavedProductsContext = createContext<SavedProductsContextValue | null>(null);

export function SavedProductsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchSaved = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setSavedSlugs(new Set());
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/me/saved-products"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.products ?? [];
        setSavedSlugs(new Set(list.map((p: { slug: string }) => p.slug)));
      } else {
        setSavedSlugs(new Set());
      }
    } catch {
      setSavedSlugs(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchSaved();
    else setSavedSlugs(new Set());
  }, [user?.id, fetchSaved]);

  const isSaved = useCallback(
    (slug: string) => (slug ? savedSlugs.has(slug) : false),
    [savedSlugs]
  );

  const toggle = useCallback(
    async (slug: string): Promise<boolean> => {
      if (!slug || !getAuthToken()) return false;
      const currentlySaved = savedSlugs.has(slug);
      const nextSaved = !currentlySaved;
      setSavedSlugs((prev) => {
        const next = new Set(prev);
        if (nextSaved) next.add(slug);
        else next.delete(slug);
        return next;
      });
      try {
        if (nextSaved) {
          const res = await fetch(apiUrl("/api/auth/me/saved-products"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify({ slug }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Erro ao salvar");
          }
          return true;
        } else {
          const res = await fetch(apiUrl(`/api/auth/me/saved-products/${encodeURIComponent(slug)}`), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${getAuthToken()}` },
          });
          if (!res.ok) throw new Error("Erro ao remover");
          return true;
        }
      } catch {
        setSavedSlugs((prev) => {
          const next = new Set(prev);
          if (nextSaved) next.delete(slug);
          else next.add(slug);
          return next;
        });
        return false;
      }
    },
    [savedSlugs]
  );

  const value: SavedProductsContextValue = {
    savedSlugs,
    isSaved,
    toggle,
    refetch: fetchSaved,
    loading,
  };

  return (
    <SavedProductsContext.Provider value={value}>
      {children}
    </SavedProductsContext.Provider>
  );
}

export function useSavedProducts() {
  const ctx = useContext(SavedProductsContext);
  if (!ctx) throw new Error("useSavedProducts must be used within SavedProductsProvider");
  return ctx;
}
