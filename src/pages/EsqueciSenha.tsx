import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import TurnstileWidget, { TURNSTILE_ENABLED } from "@/components/TurnstileWidget";
import { apiUrl } from "@/lib/api";

const EsqueciSenha = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (TURNSTILE_ENABLED && !turnstileToken) {
      toast.error("Complete a verificação de segurança abaixo.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), turnstileToken: turnstileToken || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao enviar e-mail");
      setSent(true);
      toast.success("Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-md">
        <h1 className="text-xl font-heading font-bold text-foreground mb-2">Esqueci minha senha</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Informe o e-mail da sua conta. Enviaremos um link para você redefinir sua senha.
        </p>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Verifique sua caixa de entrada (e a pasta de spam). O link expira em 1 hora.
            </p>
            <Link to="/entrar" className="inline-block text-china-red font-medium hover:underline">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <TurnstileWidget onVerify={setTurnstileToken} className="flex justify-center" />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-china-red text-white px-4 py-3 rounded-full text-sm font-bold hover:bg-china-red/90 disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar link"}
            </button>
          </form>
        )}

        <p className="text-sm text-muted-foreground text-center mt-6">
          <Link to="/entrar" className="text-china-red font-medium hover:underline">
            Voltar para o login
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default EsqueciSenha;
