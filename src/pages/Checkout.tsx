import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { calcCartShipping, detectCategory } from "@/lib/shipping";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getAuthToken } from "@/context/AuthContext";

type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

function formatCep(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
function formatCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const Checkout = () => {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [form, setForm] = useState({
    cep: "",
    addressStreet: "",
    addressNumber: "",
    addressComplement: "",
    addressNeighborhood: "",
    addressCity: "",
    addressState: "",
    customerCpf: "",
    customerName: "",
    customerEmail: "",
    customerWhatsapp: "",
    shippingMethod: "",
    notes: "",
  });

  const fetchCep = useCallback(async (cep: string) => {
    if (cep.replace(/\D/g, "").length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data: ViaCepResponse = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado. Verifique e tente novamente.");
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
      toast.error("Não foi possível buscar o endereço. Preencha manualmente.");
    } finally {
      setCepLoading(false);
    }
  }, []);

  useEffect(() => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length === 8) fetchCep(cep);
  }, [form.cep, fetchCep]);

  // Pré-preenche com dados do usuário logado
  useEffect(() => {
    if (!user) return;
    setForm((p) => ({
      ...p,
      customerName: user.name,
      customerEmail: user.email,
      customerCpf: user.customerCpf ? formatCpf(user.customerCpf) : "",
      customerWhatsapp: user.customerWhatsapp
        ? formatPhone(user.customerWhatsapp)
        : "",
      cep: user.cep ? formatCep(user.cep) : "",
      addressStreet: user.addressStreet || "",
      addressNumber: user.addressNumber || "",
      addressComplement: user.addressComplement || "",
      addressNeighborhood: user.addressNeighborhood || "",
      addressCity: user.addressCity || "",
      addressState: user.addressState || "",
    }));
  }, [user?.id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      toast.error("CEP inválido. Use 8 dígitos.");
      return;
    }
    const cpf = form.customerCpf.replace(/\D/g, "");
    if (cpf.length !== 11) {
      toast.error(
        "CPF inválido. Use 11 dígitos (obrigatório para envio internacional).",
      );
      return;
    }
    if (!form.addressStreet.trim()) {
      toast.error("Informe o endereço.");
      return;
    }
    if (!form.addressNumber.trim()) {
      toast.error("Informe o número.");
      return;
    }
    if (!form.customerName.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    if (!form.customerEmail.trim()) {
      toast.error("Informe seu e-mail.");
      return;
    }
    if (!form.customerWhatsapp.trim()) {
      toast.error("Informe seu WhatsApp.");
      return;
    }

    setLoading(true);
    let firstOrderId: string | null = null;

    // Compute real freight estimate from cart weights
    const shippingResult = calcCartShipping(
      items.map((i) => ({
        category: i.category ?? detectCategory(i.titlePt ?? i.title),
        weightG: i.weightG,
        keepBox: i.keepBox ?? false,
        quantity: i.quantity,
      })),
    );
    const totalFreightBrl = shippingResult.totalBrl;
    const totalProductBrl = items.reduce(
      (acc, i) =>
        acc +
        (i.priceBrl ?? (i.priceCny != null ? i.priceCny * 0.75 * 1.25 : 100)) *
          i.quantity,
      0,
    );
    // Distribute freight proportionally by item weight
    const totalWeightG = shippingResult.totalWeightG;

    try {
      for (const item of items) {
        const unitBrl =
          item.priceBrl ??
          (item.priceCny != null ? item.priceCny * 0.75 * 1.25 : 100);
        const productTotal = unitBrl * item.quantity;
        // Weight-proportional freight share for this item
        const itemCat = item.category ?? detectCategory(item.titlePt ?? item.title);
        const itemWeightG = (item.weightG ?? 400) * item.quantity;
        const freightShare =
          totalWeightG > 0
            ? (itemWeightG / totalWeightG) * totalFreightBrl
            : totalFreightBrl / items.length;
        const estimatedTotalBrl =
          Math.round((productTotal + freightShare) * 100) / 100;
        void itemCat; void totalProductBrl;

        const productDescription = [
          item.titlePt || item.title || "Produto",
          item.variation,
          item.color,
          item.size,
        ]
          .filter(Boolean)
          .join(" | ");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const token = getAuthToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(apiUrl("/api/orders"), {
          method: "POST",
          headers,
          body: JSON.stringify({
            originalUrl: item.url,
            productDescription,
            productTitle: item.titlePt || item.title || null,
            productImage: item.image || null,
            productColor: item.color || null,
            productSize: item.size || null,
            productVariation: item.variation || null,
            quantity: item.quantity,
            cep,
            shippingMethod: form.shippingMethod || null,
            notes: form.notes || item.notes || null,
            customerName: form.customerName.trim(),
            customerEmail: form.customerEmail.trim(),
            customerWhatsapp: form.customerWhatsapp.replace(/\D/g, ""),
            customerCpf: cpf,
            addressStreet: form.addressStreet.trim(),
            addressNumber: form.addressNumber.trim(),
            addressComplement: form.addressComplement.trim() || null,
            addressNeighborhood: form.addressNeighborhood.trim(),
            addressCity: form.addressCity.trim(),
            addressState: form.addressState.trim(),
            estimatedTotalBrl,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Erro ao criar pedido");
        if (!firstOrderId) firstOrderId = data.id;
      }
      clearCart();
      toast.success(
        items.length > 1
          ? "Pedidos enviados com sucesso!"
          : "Pedido enviado com sucesso!",
      );
      navigate(firstOrderId ? `/pedido-confirmado/${firstOrderId}` : "/", {
        replace: true,
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao enviar pedido. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-xl">
          <h1 className="text-xl font-heading font-bold text-foreground mb-4">
            Finalizar pedido
          </h1>
          <p className="text-muted-foreground mb-6">
            Seu carrinho está vazio. Adicione produtos para continuar.
          </p>
          <Link
            to="/"
            className="inline-flex bg-china-red text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-china-red/90"
          >
            Ir para a página inicial
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-xl">
        <h1 className="text-xl font-heading font-bold text-foreground mb-2">
          Finalizar pedido
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Preencha seus dados. O CPF e endereço são necessários para envio
          internacional. Entraremos em contato com o orçamento final em reais
          (produto + frete).
        </p>

        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            {items.length} {items.length === 1 ? "item" : "itens"} no pedido
          </p>
          <ul className="text-sm text-foreground space-y-1">
            {items.map((i) => (
              <li key={i.id}>
                {i.titlePt || i.title || "Produto"}
                {(i.color || i.size || i.variation) && (
                  <span className="text-muted-foreground">
                    {" "}
                    —{" "}
                    {[i.color, i.size, i.variation].filter(Boolean).join(", ")}
                  </span>
                )}{" "}
                × {i.quantity}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cep">CEP *</Label>
            <Input
              id="cep"
              name="cep"
              placeholder="00000-000"
              value={form.cep}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  cep: e.target.value.replace(/\D/g, "").slice(0, 8),
                }))
              }
              maxLength={8}
              required
            />
            {cepLoading && (
              <p className="text-xs text-muted-foreground">
                Buscando endereço...
              </p>
            )}
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
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    addressState: e.target.value.toUpperCase().slice(0, 2),
                  }))
                }
                maxLength={2}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="customerCpf">CPF *</Label>
            <Input
              id="customerCpf"
              name="customerCpf"
              placeholder="000.000.000-00"
              value={form.customerCpf}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  customerCpf: e.target.value.replace(/\D/g, "").slice(0, 11),
                }))
              }
              maxLength={14}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Obrigatório para envios internacionais (alfândega brasileira)
            </p>
          </div>

          <div>
            <Label htmlFor="customerName">Nome completo *</Label>
            <Input
              id="customerName"
              name="customerName"
              placeholder="Seu nome"
              value={form.customerName}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="customerEmail">E-mail *</Label>
            <Input
              id="customerEmail"
              name="customerEmail"
              type="email"
              placeholder="seu@email.com"
              value={form.customerEmail}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="customerWhatsapp">WhatsApp *</Label>
            <Input
              id="customerWhatsapp"
              name="customerWhatsapp"
              placeholder="(11) 99999-9999"
              value={form.customerWhatsapp}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  customerWhatsapp: e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 15),
                }))
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="shippingMethod">Método de envio (opcional)</Label>
            <Select
              value={form.shippingMethod}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, shippingMethod: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha na cotação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FJ_BR_EXP">
                  FJ-BR-EXP (12-30 dias)
                </SelectItem>
                <SelectItem value="BR_EMS">BR-EMS (15-40 dias)</SelectItem>
                <SelectItem value="BR_SEA">BR-SEA (40-60 dias)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Instruções adicionais..."
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Link
              to="/carrinho"
              className="flex-1 inline-flex justify-center border border-border px-4 py-3 rounded-xl text-sm font-medium hover:bg-muted"
            >
              Voltar ao carrinho
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-china-red text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-china-red/90 disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar pedido"}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
