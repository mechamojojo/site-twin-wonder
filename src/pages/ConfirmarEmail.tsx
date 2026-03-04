import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/lib/api";

const AUTH_TOKEN_KEY = "compraschina-auth-token";
const AUTH_USER_KEY = "compraschina-auth-user";

function saveStored(token: string, user: unknown) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

const ConfirmarEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();
  const tokenParam = (searchParams.get("token") ?? "").trim();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!tokenParam) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/auth/verify-email"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenParam }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          toast.error(data.error || "Link inválido ou expirado.");
          return;
        }
        saveStored(data.token, data.user);
        setToken(data.token);
        setUser(data.user);
        setStatus("ok");
        toast.success("E-mail confirmado! Sua conta está ativa.");
        setTimeout(() => navigate("/", { replace: true }), 2000);
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [tokenParam, setUser, setToken, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-md text-center">
        <h1 className="text-xl font-heading font-bold text-foreground mb-2">Confirmar e-mail</h1>
        {status === "loading" && (
          <p className="text-sm text-muted-foreground">Confirmando seu e-mail...</p>
        )}
        {status === "ok" && (
          <p className="text-sm text-foreground">Conta ativada. Redirecionando...</p>
        )}
        {status === "error" && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Link inválido ou expirado. Solicite um novo e-mail de confirmação na página de login ou em Meus pedidos.
            </p>
            <Link to="/entrar" className="text-china-red font-medium hover:underline">
              Ir para o login
            </Link>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ConfirmarEmail;
