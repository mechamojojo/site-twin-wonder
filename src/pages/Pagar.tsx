import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { apiUrl } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MP_PUBLIC_KEY } from "@/data/siteConfig";
import { toast } from "sonner";

type CardFormData = {
  paymentMethodId: string;
  issuerId: string;
  cardholderEmail: string;
  amount: string;
  token: string;
  installments: string;
  identificationNumber: string;
  identificationType: string;
};

type CardFormInstance = {
  getCardFormData: () => CardFormData;
};

declare global {
  interface Window {
    MercadoPago?: new (key: string, options?: { locale: string }) => {
      cardForm: (config: {
        amount: string;
        iframe: boolean;
        form: Record<string, { id: string; placeholder?: string }>;
        callbacks: {
          onFormMounted?: (error: unknown) => void;
          onSubmit?: (event: Event) => void;
          onFetching?: (resource: string) => () => void;
        };
      }) => CardFormInstance;
    };
  }
}

type OrderData = {
  id: string;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  productDescription: string;
  quote?: { totalBrl: string };
};

const Pagar = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [pixData, setPixData] = useState<{
    qr_code?: string;
    qr_code_base64?: string;
    ticket_url?: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [email, setEmail] = useState("");
  const [cardFormReady, setCardFormReady] = useState(false);
  const cardFormRef = useRef<CardFormInstance | null>(null);
  const mpRef = useRef<InstanceType<NonNullable<typeof window.MercadoPago>> | null>(null);

  const submitCardPayment = useCallback(
    async (formData: CardFormData) => {
      if (!id) return;
      setPaying(true);
      try {
        const res = await fetch(apiUrl(`/api/orders/${id}/create-payment`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: formData.token,
            payment_method_id: formData.paymentMethodId,
            payer_email: formData.cardholderEmail.trim(),
            payer_name: order?.customerName,
            installments: Number(formData.installments) || 1,
            issuer_id: formData.issuerId || undefined,
            identification_type: formData.identificationType || undefined,
            identification_number: formData.identificationNumber || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao processar pagamento");
        if (data.status === "approved") {
          toast.success("Pagamento aprovado!");
          window.location.href = `/pedido-confirmado/${id}`;
        } else {
          toast.error(data.status_detail || "Pagamento não aprovado. Tente novamente ou use PIX.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      } finally {
        setPaying(false);
      }
    },
    [id, order?.customerName]
  );

  useEffect(() => {
    if (!id) return;
    fetch(apiUrl(`/api/orders/${id}`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Pedido não encontrado"))))
      .then((data) => {
        setOrder(data);
        setEmail(data.customerEmail || "");
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const initMp = () => {
      if (typeof window !== "undefined" && window.MercadoPago && MP_PUBLIC_KEY && !MP_PUBLIC_KEY.includes("PLACEHOLDER")) {
        mpRef.current = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      }
    };
    if (document.readyState === "complete") initMp();
    else window.addEventListener("load", initMp);
    const t = setInterval(initMp, 300);
    return () => {
      clearInterval(t);
      window.removeEventListener("load", initMp);
    };
  }, []);

  useEffect(() => {
    if (paymentMethod !== "card" || !mpRef.current || !order?.quote) return;
    const totalBrl = Number(order.quote.totalBrl);
    if (totalBrl <= 0) return;

    const formEl = document.getElementById("form-checkout");
    if (!formEl) return;

    try {
      const cardForm = mpRef.current.cardForm({
        amount: String(Math.round(totalBrl * 100) / 100),
        iframe: true,
        form: {
          id: "form-checkout",
          cardNumber: { id: "form-checkout__cardNumber", placeholder: "Número do cartão" },
          expirationDate: { id: "form-checkout__expirationDate", placeholder: "MM/AA" },
          securityCode: { id: "form-checkout__securityCode", placeholder: "CVV" },
          cardholderName: { id: "form-checkout__cardholderName", placeholder: "Nome no cartão" },
          issuer: { id: "form-checkout__issuer", placeholder: "Banco emissor" },
          installments: { id: "form-checkout__installments", placeholder: "Parcelas" },
          identificationType: { id: "form-checkout__identificationType", placeholder: "Tipo" },
          identificationNumber: { id: "form-checkout__identificationNumber", placeholder: "CPF" },
          cardholderEmail: { id: "form-checkout__cardholderEmail", placeholder: "E-mail" },
        },
        callbacks: {
          onFormMounted: (err) => {
            if (err) console.warn("CardForm mount error:", err);
            else setCardFormReady(true);
          },
          onSubmit: (event) => {
            event.preventDefault();
            const formData = cardForm.getCardFormData();
            if (formData.token) {
              cardFormRef.current = cardForm;
              submitCardPayment(formData);
            }
          },
        },
      });
      cardFormRef.current = cardForm;
    } catch (err) {
      console.warn("CardForm init error:", err);
    }

    return () => setCardFormReady(false);
  }, [paymentMethod, order?.quote, submitCardPayment]);

  const handlePixSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !email.trim()) return;
    setPaying(true);
    setPixData(null);
    try {
      const res = await fetch(apiUrl(`/api/orders/${id}/create-payment`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method_id: "pix",
          payer_email: email.trim(),
          payer_name: order.customerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar pagamento");
      const poi = data.point_of_interaction;
      setPixData(poi?.transaction_data || poi || {});
      if (data.status === "approved") {
        toast.success("Pagamento aprovado!");
        setTimeout(() => (window.location.href = `/pedido-confirmado/${id}`), 2000);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <p className="text-red-600 mb-4">Pedido não encontrado.</p>
          <Link to="/" className="text-china-red font-medium hover:underline">Voltar à página inicial</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const totalBrl = order.quote ? Number(order.quote.totalBrl) : 0;
  const canPay = order.status === "AGUARDANDO_PAGAMENTO" && order.quote && totalBrl > 0;

  if (!canPay) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-xl">
          <h1 className="text-xl font-heading font-bold mb-4">Pagamento</h1>
          <p className="text-muted-foreground mb-4">
            {order.status === "PAGO"
              ? "Este pedido já foi pago."
              : "Aguardando nossa cotação. Entraremos em contato com o valor final em reais."}
          </p>
          <Link to={`/pedido-confirmado/${id}`} className="text-china-red font-medium hover:underline">
            Ver status do pedido
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
        <h1 className="text-xl font-heading font-bold mb-2">Pagamento</h1>
        <p className="text-sm text-muted-foreground mb-6">Pedido #{order.id.slice(-8)}</p>

        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <p className="text-sm text-muted-foreground">Total a pagar</p>
          <p className="text-2xl font-heading font-bold text-china-red">R$ {totalBrl.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{order.productDescription}</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => { setPaymentMethod("pix"); setPixData(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              paymentMethod === "pix" ? "bg-china-red text-white" : "border border-border hover:bg-muted"
            }`}
          >
            PIX
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("card")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              paymentMethod === "card" ? "bg-china-red text-white" : "border border-border hover:bg-muted"
            }`}
          >
            Cartão
          </button>
        </div>

        {paymentMethod === "pix" && (
          <form onSubmit={handlePixSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail para receber o QR Code</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={paying}
              className="w-full bg-china-red text-white py-3 rounded-xl font-bold hover:bg-china-red/90 disabled:opacity-60"
            >
              {paying ? "Gerando..." : "Gerar PIX"}
            </button>
          </form>
        )}

        {pixData && (pixData.qr_code || pixData.qr_code_base64 || pixData.ticket_url) && (
          <div className="mt-6 p-4 rounded-xl border border-border bg-card space-y-3">
            <p className="text-sm font-semibold">Escaneie o QR Code ou copie o código PIX:</p>
            {pixData.qr_code_base64 && (
              <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" className="mx-auto w-48 h-48" />
            )}
            {pixData.qr_code && !pixData.qr_code_base64 && (
              <p className="text-xs break-all bg-muted p-2 rounded font-mono">{pixData.qr_code}</p>
            )}
            {pixData.ticket_url && (
              <a
                href={pixData.ticket_url}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-china-red hover:underline"
              >
                Abrir PIX no navegador →
              </a>
            )}
          </div>
        )}

        {paymentMethod === "card" && (
          <div className="space-y-4">
            {!MP_PUBLIC_KEY || MP_PUBLIC_KEY.includes("PLACEHOLDER") ? (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                Configure <code className="text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">VITE_MP_PUBLIC_KEY</code> no .env (raiz do projeto) para habilitar pagamento com cartão.
              </p>
            ) : (
              <form id="form-checkout" className="space-y-4">
                <div>
                  <Label>Número do cartão</Label>
                  <div id="form-checkout__cardNumber" className="mt-1 min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 [&>iframe]:min-h-[40px]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Validade</Label>
                    <div id="form-checkout__expirationDate" className="mt-1 min-h-[40px] rounded-md border border-input bg-background [&>iframe]:min-h-[40px]" />
                  </div>
                  <div>
                    <Label>CVV</Label>
                    <div id="form-checkout__securityCode" className="mt-1 min-h-[40px] rounded-md border border-input bg-background [&>iframe]:min-h-[40px]" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="form-checkout__cardholderName">Nome no cartão</Label>
                  <Input id="form-checkout__cardholderName" placeholder="Como está no cartão" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="form-checkout__cardholderEmail">E-mail</Label>
                  <Input
                    id="form-checkout__cardholderEmail"
                    type="email"
                    defaultValue={email}
                    placeholder="seu@email.com"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="form-checkout__identificationType">Tipo de documento</Label>
                  <select id="form-checkout__identificationType" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <Label htmlFor="form-checkout__identificationNumber">CPF</Label>
                  <Input id="form-checkout__identificationNumber" placeholder="000.000.000-00" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="form-checkout__issuer">Banco emissor</Label>
                  <select id="form-checkout__issuer" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <Label htmlFor="form-checkout__installments">Parcelas</Label>
                  <select id="form-checkout__installments" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <button
                  type="submit"
                  id="form-checkout__submit"
                  disabled={paying || !cardFormReady}
                  className="w-full bg-china-red text-white py-3 rounded-xl font-bold hover:bg-china-red/90 disabled:opacity-60"
                >
                  {paying ? "Processando..." : "Pagar com cartão"}
                </button>
              </form>
            )}
          </div>
        )}

        <Link to={`/pedido-confirmado/${id}`} className="block mt-6 text-sm text-muted-foreground hover:text-china-red">
          ← Voltar ao pedido
        </Link>
      </main>
      <Footer />
    </div>
  );
};

export default Pagar;
