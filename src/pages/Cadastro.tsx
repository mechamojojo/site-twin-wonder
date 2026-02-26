import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type ViaCepResponse = {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

const Cadastro = () => {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    customerCpf: "",
    customerWhatsapp: "",
    cep: "",
    addressStreet: "",
    addressNumber: "",
    addressComplement: "",
    addressNeighborhood: "",
    addressCity: "",
    addressState: "",
  });

  const fetchCep = useCallback(async (cep: string) => {
    if (cep.replace(/\D/g, "").length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data: ViaCepResponse = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }
      setForm((p) => ({
        ...p,
        addressStreet: data.logradouro || p.addressStreet,
        addressNeighborhood: data.bairro || p.addressNeighborhood,
        addressCity: data.localidade || p.addressCity,
        addressState: data.uf || p.addressState,
      }));
    } catch {
      toast.error("Não foi possível buscar o endereço.");
    } finally {
      setCepLoading(false);
    }
  }, []);

  useEffect(() => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length === 8) fetchCep(cep);
  }, [form.cep, fetchCep]);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      toast.error("CEP inválido (8 dígitos)");
      return;
    }
    const cpf = form.customerCpf.replace(/\D/g, "");
    if (cpf.length !== 11) {
      toast.error("CPF inválido (11 dígitos)");
      return;
    }
    if (!form.addressStreet.trim() || !form.addressNumber.trim()) {
      toast.error("Preencha o endereço completo");
      return;
    }

    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        name: form.name,
        customerCpf: cpf,
        customerWhatsapp: form.customerWhatsapp.replace(/\D/g, ""),
        cep,
        addressStreet: form.addressStreet,
        addressNumber: form.addressNumber,
        addressComplement: form.addressComplement || undefined,
        addressNeighborhood: form.addressNeighborhood,
        addressCity: form.addressCity,
        addressState: form.addressState,
      });
      toast.success("Conta criada com sucesso!");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-xl">
        <h1 className="text-xl font-heading font-bold text-foreground mb-2">Criar conta</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Preencha seus dados de cadastro. Eles serão usados em todas as suas compras, assim você não precisa digitar de novo no checkout.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar senha *</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="name">Nome completo *</Label>
            <Input id="name" name="name" placeholder="Seu nome" value={form.name} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="customerCpf">CPF *</Label>
            <Input
              id="customerCpf"
              name="customerCpf"
              placeholder="000.000.000-00"
              value={form.customerCpf}
              onChange={(e) => setForm((p) => ({ ...p, customerCpf: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
              maxLength={14}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Obrigatório para envios internacionais</p>
          </div>
          <div>
            <Label htmlFor="customerWhatsapp">WhatsApp *</Label>
            <Input
              id="customerWhatsapp"
              name="customerWhatsapp"
              placeholder="(11) 99999-9999"
              value={form.customerWhatsapp}
              onChange={(e) => setForm((p) => ({ ...p, customerWhatsapp: e.target.value.replace(/\D/g, "").slice(0, 15) }))}
              required
            />
          </div>

          <div className="border-t border-border pt-4 mt-6">
            <p className="text-sm font-medium text-foreground mb-3">Endereço de entrega</p>
          </div>

          <div>
            <Label htmlFor="cep">CEP *</Label>
            <Input
              id="cep"
              name="cep"
              placeholder="00000-000"
              value={form.cep}
              onChange={(e) => setForm((p) => ({ ...p, cep: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
              maxLength={8}
              required
            />
            {cepLoading && <p className="text-xs text-muted-foreground">Buscando endereço...</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="addressStreet">Rua *</Label>
              <Input
                id="addressStreet"
                name="addressStreet"
                placeholder="Rua, avenida..."
                value={form.addressStreet}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="addressNumber">Número *</Label>
              <Input
                id="addressNumber"
                name="addressNumber"
                placeholder="123"
                value={form.addressNumber}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="addressComplement">Complemento (opcional)</Label>
              <Input
                id="addressComplement"
                name="addressComplement"
                placeholder="Apt, bloco..."
                value={form.addressComplement}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="addressNeighborhood">Bairro *</Label>
              <Input
                id="addressNeighborhood"
                name="addressNeighborhood"
                placeholder="Bairro"
                value={form.addressNeighborhood}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="addressCity">Cidade *</Label>
              <Input
                id="addressCity"
                name="addressCity"
                placeholder="Cidade"
                value={form.addressCity}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="addressState">Estado (UF) *</Label>
              <Input
                id="addressState"
                name="addressState"
                placeholder="SP"
                value={form.addressState}
                onChange={(e) => setForm((p) => ({ ...p, addressState: e.target.value.toUpperCase().slice(0, 2) }))}
                maxLength={2}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-china-red text-white px-4 py-3 rounded-full text-sm font-bold hover:bg-china-red/90 disabled:opacity-60"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="text-sm text-muted-foreground text-center">
            Já tem conta?{" "}
            <Link to="/entrar" className="text-china-red font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default Cadastro;
