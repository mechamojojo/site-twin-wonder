import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Login realizado!");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-md">
        <h1 className="text-xl font-heading font-bold text-foreground mb-2">Entrar na ComprasChina</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Acesse sua conta para acompanhar pedidos e finalizar compras mais rápido.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
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
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              <Link to="/esqueci-senha" className="text-china-red hover:underline">
                Esqueci minha senha
              </Link>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center bg-china-red text-white px-4 py-2.5 rounded-full text-sm font-heading font-bold hover:bg-china-red/90 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-sm text-muted-foreground text-center">
            Não tem conta?{" "}
            <Link to="/cadastro" className="text-china-red font-medium hover:underline">
              Criar conta
            </Link>
          </p>
        </form>

        <p className="text-[11px] text-muted-foreground mt-6">
          Ao continuar, você concorda com nossos{" "}
          <Link to="/termos-de-servico" className="text-china-red hover:underline">
            termos de uso
          </Link>{" "}
          e{" "}
          <Link to="/politica-de-privacidade" className="text-china-red hover:underline">
            política de privacidade
          </Link>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
