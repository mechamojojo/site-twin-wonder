import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useAuth, type AuthUser } from "@/context/AuthContext";
import { apiUrl } from "@/lib/api";

/** Evita segunda chamada à API após sucesso (token já invalidado no servidor) — ex.: React StrictMode ou re-execução do effect. */
function verifyCacheKey(token: string) {
  return `compraschina-email-verify-ok:${token}`;
}

const ConfirmarEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSessionFromVerification } = useAuth();
  const tokenParam = (searchParams.get("token") ?? "").trim();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!tokenParam) {
      setStatus("error");
      return;
    }

    const cached = sessionStorage.getItem(verifyCacheKey(tokenParam));
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { token: string; user: AuthUser };
        if (parsed?.token && parsed?.user) {
          setSessionFromVerification(parsed.token, parsed.user);
          setStatus("ok");
          toast.success("E-mail confirmado! Sua conta está ativa.");
          const t = setTimeout(() => navigate("/", { replace: true }), 2000);
          return () => clearTimeout(t);
        }
      } catch {
        sessionStorage.removeItem(verifyCacheKey(tokenParam));
      }
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
        if (!res.ok) {
          if (!cancelled) {
            setStatus("error");
            toast.error(data.error || "Link inválido ou expirado.");
          }
          return;
        }
        const payload = { token: data.token as string, user: data.user as AuthUser };
        // Gravar antes de atualizar estado: se o effect rodar de novo, não chama a API outra vez.
        try {
          sessionStorage.setItem(verifyCacheKey(tokenParam), JSON.stringify(payload));
        } catch {
          // ignore quota / private mode
        }
        if (cancelled) return;
        setSessionFromVerification(payload.token, payload.user);
        setStatus("ok");
        toast.success("E-mail confirmado! Sua conta está ativa.");
        setTimeout(() => navigate("/", { replace: true }), 2000);
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
    // Só o token da URL deve disparar a verificação (setSessionFromVerification e navigate são estáveis).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenParam]);

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
