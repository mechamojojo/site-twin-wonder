import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";

const RedefinirSenha = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Link inválido. Solicite uma nova redefinição de senha.");
      navigate("/esqueci-senha", { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao redefinir senha");
      setDone(true);
      toast.success("Senha alterada. Faça login com a nova senha.");
      setTimeout(() => navigate("/entrar", { replace: true }), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-md">
        <h1 className="text-xl font-heading font-bold text-foreground mb-2">Nova senha</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Defina uma nova senha para acessar sua conta.
        </p>

        {done ? (
          <p className="text-sm text-foreground">Redirecionando para o login...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">Nova senha *</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar nova senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-china-red text-white px-4 py-3 rounded-full text-sm font-bold hover:bg-china-red/90 disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Redefinir senha"}
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

export default RedefinirSenha;
