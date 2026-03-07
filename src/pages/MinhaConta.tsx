import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { User, MapPin, Lock, Package, Loader2, ChevronRight } from "lucide-react";

function maskCep(v: string) {
  return v.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

const STATES = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

const MinhaConta = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, updateProfile } = useAuth();

  // Profile fields
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/entrar", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setWhatsapp(maskPhone(user.customerWhatsapp ?? ""));
      setCep(maskCep(user.cep ?? ""));
      setStreet(user.addressStreet ?? "");
      setNumber(user.addressNumber ?? "");
      setComplement(user.addressComplement ?? "");
      setNeighborhood(user.addressNeighborhood ?? "");
      setCity(user.addressCity ?? "");
      setState(user.addressState ?? "");
    }
  }, [user]);

  const handleCepBlur = async () => {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setStreet(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
        if (data.localidade) setCity(data.localidade);
        if (data.uf) setState(data.uf);
      }
    } catch {
      // silently fail
    } finally {
      setCepLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Nome deve ter pelo menos 2 caracteres.");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        customerWhatsapp: whatsapp.replace(/\D/g, ""),
        cep: cep.replace(/\D/g, ""),
        addressStreet: street.trim(),
        addressNumber: number.trim(),
        addressComplement: complement.trim() || undefined,
        addressNeighborhood: neighborhood.trim(),
        addressCity: city.trim(),
        addressState: state.trim(),
      });
      toast.success("Perfil atualizado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSavingPassword(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar senha");
    } finally {
      setSavingPassword(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  const inputCls = "w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm outline-none focus:border-foreground/40 transition-colors";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Minha conta</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
          </div>
          <Link
            to="/meus-pedidos"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Package className="w-4 h-4" />
            Meus pedidos
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Personal data */}
        <section className="rounded-xl border border-border bg-card p-6 mb-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-5">
            <User className="w-4 h-4 text-china-red" />
            Dados pessoais
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className={labelCls}>Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                required
                minLength={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>E-mail (não editável)</label>
                <input type="email" value={user.email} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
              </div>
              <div>
                <label className={labelCls}>CPF (não editável)</label>
                <input type="text" value={user.customerCpf ?? ""} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>WhatsApp</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className={inputCls}
              />
            </div>

            {/* Address */}
            <div className="pt-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5" /> Endereço de entrega
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(maskCep(e.target.value))}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      className={inputCls}
                      maxLength={9}
                    />
                    {cepLoading && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Número</label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className={labelCls}>Rua / Logradouro</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Complemento</label>
                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Apto, bloco..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Estado</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Selecione</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 bg-china-red text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-china-red/90 disabled:opacity-60 transition-colors"
              >
                {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar alterações
              </button>
            </div>
          </form>
        </section>

        {/* Change password */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-5">
            <Lock className="w-4 h-4 text-china-red" />
            Alterar senha
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className={labelCls}>Senha atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className={inputCls}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nova senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className={inputCls}
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className={inputCls}
                  required
                />
              </div>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-2.5 rounded-full text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-colors"
              >
                {savingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Alterar senha
              </button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default MinhaConta;
