import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { getDisplayPriceBrl } from "@/lib/pricing";
import {
  calcCartShipping,
  detectCategory,
  itemWeightG,
} from "@/lib/shipping";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { ensureHttpsImage } from "@/lib/utils";
import { productImageDisplayUrl } from "@/lib/productImageDisplayUrl";
import MercadoPagoBadge from "@/components/MercadoPagoBadge";
import { Truck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAuthToken } from "@/context/AuthContext";

/** Mesma base da estimativa em `calcCartShipping`; o cliente não escolhe rota mais barata no site. */
const CHECKOUT_SHIPPING_METHOD = "FJ_BR_EXP" as const;

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

  const shippingItems = useMemo(
    () =>
      items.map((i) => ({
        category: i.category ?? detectCategory(i.titlePt ?? i.title),
        weightG: i.weightG,
        keepBox: i.keepBox ?? false,
        quantity: i.quantity,
      })),
    [items],
  );
  const shipping = useMemo(
    () => calcCartShipping(shippingItems),
    [shippingItems],
  );
  const totalProductBrl = useMemo(
    () =>
      items.reduce(
        (acc, i) =>
          acc +
          (getDisplayPriceBrl(i.priceCny, i.priceBrl) ?? 0) * i.quantity,
        0,
      ),
    [items],
  );
  const grandTotal = useMemo(
    () =>
      totalProductBrl > 0 ? totalProductBrl + shipping.totalBrl : 0,
    [totalProductBrl, shipping.totalBrl],
  );

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

    const totalFreightBrl = shipping.totalBrl;
    const totalWeightG = shipping.totalWeightG;
    const checkoutGroupId =
      items.length > 1 ? crypto.randomUUID() : null;
    const orderItemsJson = items.map((i) => {
      const unit = getDisplayPriceBrl(i.priceCny, i.priceBrl) ?? 0;
      return {
        url: i.url,
        quantity: i.quantity,
        titlePt: i.titlePt ?? null,
        title: i.title ?? null,
        image: i.image ?? null,
        color: i.color ?? null,
        size: i.size ?? null,
        variation: i.variation ?? null,
        notes: i.notes ?? null,
        unitBrl: unit,
        lineProductBrl: Math.round(unit * i.quantity * 100) / 100,
      };
    });

    const lineEstimates: number[] = [];
    for (const item of items) {
      const unitBrl = getDisplayPriceBrl(item.priceCny, item.priceBrl) ?? 0;
      const productTotal = Math.round(unitBrl * item.quantity * 100) / 100;
      const itemCat =
        item.category ?? detectCategory(item.titlePt ?? item.title);
      const lineWeightG =
        itemWeightG(itemCat, item.weightG, item.keepBox ?? false) *
        item.quantity;
      const freightShare =
        totalWeightG > 0
          ? (lineWeightG / totalWeightG) * totalFreightBrl
          : totalFreightBrl / items.length;
      lineEstimates.push(
        Math.round((productTotal + freightShare) * 100) / 100,
      );
    }

    const sumLineEstimates =
      Math.round(lineEstimates.reduce((a, b) => a + b, 0) * 100) / 100;
    const expectedCheckoutTotal =
      Math.round((totalProductBrl + totalFreightBrl) * 100) / 100;
    if (Math.abs(sumLineEstimates - expectedCheckoutTotal) > 0.06) {
      toast.error(
        "O total enviado não confere com o resumo (proteção contra erro de preço). Recarregue a página ou volte ao carrinho e tente de novo.",
      );
      setLoading(false);
      return;
    }

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const estimatedTotalBrl = lineEstimates[i]!;

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
            shippingMethod: CHECKOUT_SHIPPING_METHOD,
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
            checkoutGroupId,
            orderItemsJson,
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
        <p className="text-sm text-muted-foreground mb-4">
          Preencha seus dados. O CPF e endereço são necessários para envio
          internacional. Entraremos em contato com o orçamento final em reais
          (produto + frete).
        </p>
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Pagamento em reais com</span>
          <MercadoPagoBadge size="sm" />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            {items.length} {items.length === 1 ? "item" : "itens"} no pedido
          </p>
          <ul className="text-sm text-foreground space-y-3">
            {items.map((i) => {
              const unitBrlLine = getDisplayPriceBrl(i.priceCny, i.priceBrl);
              return (
                <li key={i.id} className="flex gap-3 items-start">
                  <div className="shrink-0 w-14 h-14 rounded-lg border border-border bg-muted overflow-hidden">
                    {i.image ? (
                      <img
                        src={productImageDisplayUrl(ensureHttpsImage(i.image))}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                        —
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <span className="font-medium">
                      {i.titlePt || i.title || "Produto"}
                    </span>
                    {(i.color || i.size || i.variation) && (
                      <span className="text-muted-foreground block text-xs mt-0.5">
                        {[i.color, i.size, i.variation]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs mt-1 block">
                      × {i.quantity}
                    </span>
                    <span className="text-sm font-semibold text-china-red mt-1 block">
                      {unitBrlLine != null
                        ? `R$ ${(unitBrlLine * i.quantity).toFixed(2)}`
                        : "—"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 mb-6 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Resumo (igual ao carrinho)
            </p>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Peso total</span>
              <span>
                {shipping.totalWeightG >= 1000
                  ? `${(shipping.totalWeightG / 1000).toFixed(2)} kg`
                  : `${shipping.totalWeightG} g`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Frete China → Brasil (FJ-BR-EXP)</span>
              <span>R$ {shipping.chinaFreightBrl.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Entrega doméstica</span>
              <span>R$ {shipping.domesticBrl.toFixed(2)}</span>
            </div>
            {shipping.keepBoxSurchargeBrl > 0 && (
              <div className="flex justify-between">
                <span>Embalagem original (volumétrico)</span>
                <span>R$ {shipping.keepBoxSurchargeBrl.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
            <span>Subtotal produtos</span>
            <span>
              {totalProductBrl > 0
                ? `R$ ${totalProductBrl.toFixed(2)}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Frete estimado</span>
            <span className="text-foreground">
              R$ {shipping.totalBrl.toFixed(2)}
            </span>
          </div>
          {totalProductBrl > 0 && (
            <div className="flex justify-between text-sm font-bold text-china-red pt-2 border-t border-border">
              <span>Total estimado</span>
              <span>R$ {grandTotal.toFixed(2)}</span>
            </div>
          )}
          {totalProductBrl === 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Preço em BRL será confirmado na cotação (como no carrinho).
            </p>
          )}
          <p className="text-[11px] text-muted-foreground pt-2 leading-relaxed border-t border-border mt-2">
            O frete estimado usa a tabela <strong className="font-medium text-foreground">FJ-BR-EXP</strong> (igual ao carrinho). A forma de envio e o valor final são definidos pela equipe na cotação — não há opção de marítimo ou linha econômica no checkout.
          </p>
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
