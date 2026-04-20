import { useEffect, useState } from "react";

const ADMIN_TOKEN_KEY = "compraschina-admin-token";

/** Token JWT do painel admin (mesmo que `/admin`), ou null se não logado. */
export function useAdminToken() {
  const [token, setToken] = useState<string | null>(() =>
    typeof localStorage !== "undefined"
      ? localStorage.getItem(ADMIN_TOKEN_KEY)
      : null,
  );

  useEffect(() => {
    const sync = () => {
      setToken(
        typeof localStorage !== "undefined"
          ? localStorage.getItem(ADMIN_TOKEN_KEY)
          : null,
      );
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return token;
}
