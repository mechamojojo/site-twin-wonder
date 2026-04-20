import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart, type CartItem } from "@/context/CartContext";
import { getDisplayPriceBrl } from "@/lib/pricing";
import {
  applyFreightPromo,
  calcCartShipping,
  detectCategory,
  itemWeightG,
  splitRedditTenPercentProductLines,
  FRETE_PROMO_SUBTOTAL_MIN_BRL,
  type FreightPromoResult,
} from "@/lib/shipping";
import { FreightPromoRulesLink } from "@/components/FreightPromoRules";
import { FreightCouponField } from "@/components/FreightCouponField";
import { FreightPromoSummaryCard } from "@/components/FreightPromoSummaryCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import {
  hasRenderablePixPayload,
  pixDataFromCreatePaymentResponse,
} from "@/lib/pixResponse";
import {
  attachInstallmentsMaxClamp,
  MP_MAX_INSTALLMENTS,
} from "@/lib/mercadopagoInstallments";
import { ensureHttpsImage } from "@/lib/utils";
import MercadoPagoBadge from "@/components/MercadoPagoBadge";
import { InstallmentPromoBanner } from "@/components/InstallmentPromoBanner";
import {
  Copy,
  CreditCard,
  QrCode,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Lock,
  Package,
  MapPin,
  User,
  Check,
  Globe2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAuthToken } from "@/context/AuthContext";
import { MP_PUBLIC_KEY } from "@/data/siteConfig";

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

type CheckoutForm = {
  cep: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  customerCpf: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  notes: string;
  /** Texto livre quando o cliente não recebe no Brasil (CSSBuy / exterior) */
  internationalAddressLines: string;
};

function validateShippingForm(
  form: CheckoutForm,
  deliveryInBrazil: boolean,
): string | null {
  const wa = form.customerWhatsapp.replace(/\D/g, "");
  if (wa.length < 8)
    return "Informe um WhatsApp válido (com DDI se estiver fora do +55).";
  if (!form.customerName.trim()) return "Informe seu nome.";
  if (!form.customerEmail.trim()) return "Informe seu e-mail.";

  if (deliveryInBrazil) {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return "CEP inválido. Use 8 dígitos.";
    const cpf = form.customerCpf.replace(/\D/g, "");
    if (cpf.length !== 11)
      return "CPF inválido. Use 11 dígitos (obrigatório para envio ao Brasil).";
    if (!form.addressStreet.trim()) return "Informe o endereço.";
    if (!form.addressNumber.trim()) return "Informe o número.";
    if (!form.addressNeighborhood.trim()) return "Informe o bairro.";
    if (!form.addressCity.trim()) return "Informe a cidade.";
    if (!form.addressState.trim()) return "Informe o estado (UF).";
    return null;
  }

  if (form.internationalAddressLines.trim().length < 15) {
    return "Descreva o endereço completo no exterior (mínimo 15 caracteres): país, cidade, CEP/código postal e linhas de endereço.";
  }
  return null;
}

type ShippingComputed = ReturnType<typeof calcCartShipping>;

/** Snapshot do carrinho após criar pedido + PIX (carrinho é limpo, mas o resumo precisa continuar visível). */
type CheckoutSummaryLock = {
  itemsSnapshot: CartItem[];
  shipping: ShippingComputed;
  /** Subtotal bruto de produtos (antes do desconto secreto) */
  productGrossBrl: number;
  redditProductDiscountBrl: number;
  grandTotal: number;
  freightPromo: FreightPromoResult;
};

function CheckoutStepper({
  step,
  onGoToDelivery,
  canEditDelivery,
}: {
  step: 1 | 2;
  onGoToDelivery: () => void;
  canEditDelivery: boolean;
}) {
  return (
    <nav aria-label="Etapas do checkout" className="mb-8">
      <ol className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm">
        <li className="flex items-center gap-2 min-w-0">
          {step === 2 ? (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-china-red text-white">
              <Check className="h-4 w-4" aria-hidden />
            </span>
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-china-red text-white text-xs font-bold">
              1
            </span>
          )}
          <span
            className={
              step === 1
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            }
          >
            Entrega
          </span>
          {step === 2 && canEditDelivery && (
            <button
              type="button"
              onClick={onGoToDelivery}
              className="text-xs text-china-red font-medium hover:underline ml-1"
            >
              Alterar
            </button>
          )}
        </li>
        <ChevronRight
          className="h-4 w-4 text-muted-foreground shrink-0"
          aria-hidden
        />
        <li className="flex items-center gap-2 min-w-0">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              step === 2
                ? "bg-china-red text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </span>
          <span
            className={
              step === 2
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            }
          >
            Pagamento
          </span>
        </li>
      </ol>
    </nav>
  );
}

function OrderSummaryPanel({
  items,
  shipping,
  productGrossBrl,
  redditProductDiscountBrl,
  grandTotal,
  freightPromo,
  variant = "default",
}: {
  items: CartItem[];
  shipping: ShippingComputed;
  productGrossBrl: number;
  redditProductDiscountBrl: number;
  grandTotal: number;
  freightPromo: FreightPromoResult;
  variant?: "default" | "compact";
}) {
  const dense = variant === "compact";
  return (
    <div className="space-y-3">
      <p
        className={`font-semibold text-foreground ${dense ? "text-sm" : "text-base"}`}
      >
        Resumo do pedido
      </p>
      <ul className={`flex flex-col ${dense ? "gap-2" : "gap-3"}`}>
        {items.map((i) => {
          const unitBrlLine = getDisplayPriceBrl(i.priceCny, i.priceBrl);
          return (
            <li key={i.id} className="flex gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
              <div
                className={`shrink-0 rounded-md border border-border bg-muted overflow-hidden ${dense ? "h-12 w-12" : "h-14 w-14"}`}
              >
                {i.image ? (
                  <img
                    src={ensureHttpsImage(i.image)}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium text-foreground line-clamp-2 ${dense ? "text-xs" : "text-sm"}`}
                >
                  {i.titlePt || i.title || "Produto"}
                </p>
                {(i.color || i.size || i.variation) && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {[i.color, i.size, i.variation].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Qtd {i.quantity}
                </p>
                <p className="text-sm font-semibold text-china-red mt-1">
                  {unitBrlLine != null
                    ? `R$ ${(unitBrlLine * i.quantity).toFixed(2)}`
                    : "—"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {productGrossBrl > 0 && (
        <div className="flex justify-between gap-2 text-sm text-foreground pt-1 border-t border-border/60">
          <span>Subtotal produtos</span>
          <span className="font-medium tabular-nums">
            R$ {productGrossBrl.toFixed(2)}
          </span>
        </div>
      )}
      {redditProductDiscountBrl > 0 && (
        <div className="flex justify-between gap-2 text-xs text-green-700 dark:text-green-400 pt-0.5">
          <span>Desconto produtos (10%)</span>
          <span className="font-medium tabular-nums">
            − R$ {redditProductDiscountBrl.toFixed(2)}
          </span>
        </div>
      )}
      <FreightCouponField
        productSubtotalBrl={productGrossBrl}
        compact={dense}
        className="pt-2"
      />
      {freightPromo.couponWaitsMinSubtotal && (
        <p
          className={`text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-2 py-1.5 border border-amber-200/60 dark:border-amber-800/50 ${dense ? "text-[10px]" : "text-[11px]"}`}
        >
          Cupom ativo: ao passar de R${" "}
          {FRETE_PROMO_SUBTOTAL_MIN_BRL.toLocaleString("pt-BR")} em produtos, o
          frete estimado entra na promoção (até R$ 200 de desconto).
        </p>
      )}
      <div
        className={`space-y-1.5 text-muted-foreground ${dense ? "text-[11px]" : "text-xs"}`}
      >
        {!freightPromo.qualifies ? (
          <div className="flex justify-between gap-2">
            <span>Frete estimado</span>
            <span className="text-foreground tabular-nums">
              R$ {freightPromo.rawFreightBrl.toFixed(2)}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <p
              className={`font-semibold text-foreground ${
                dense ? "text-[10px]" : "text-xs"
              }`}
            >
              Opção de envio
            </p>
            <FreightPromoSummaryCard
              freightPromo={freightPromo}
              dense={dense}
            />
          </div>
        )}
        <details className="group">
          <summary className="cursor-pointer list-none text-china-red hover:underline font-medium">
            Ver detalhes do frete
          </summary>
          <div className="mt-2 space-y-1 pl-2 border-l-2 border-border/80 text-[11px]">
            <div className="flex justify-between gap-2">
              <span>China → Brasil</span>
              <span className="tabular-nums text-foreground">
                R$ {shipping.chinaFreightBrl.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Entrega no Brasil</span>
              <span className="tabular-nums text-foreground">
                R$ {shipping.domesticBrl.toFixed(2)}
              </span>
            </div>
            {shipping.keepBoxSurchargeBrl > 0 && (
              <div className="flex justify-between gap-2">
                <span>Embalagem original</span>
                <span className="tabular-nums text-foreground">
                  R$ {shipping.keepBoxSurchargeBrl.toFixed(2)}
                </span>
              </div>
            )}
            {shipping.freightFloorSupplementBrl > 0 && (
              <div className="flex justify-between gap-2">
                <span>Piso mínimo de frete (estimativa)</span>
                <span className="tabular-nums text-foreground">
                  R$ {shipping.freightFloorSupplementBrl.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-2 pt-1 border-t border-border/40">
              <span>Peso total</span>
              <span className="tabular-nums text-foreground">
                {shipping.totalWeightG >= 1000
                  ? `${(shipping.totalWeightG / 1000).toFixed(2)} kg`
                  : `${shipping.totalWeightG} g`}
              </span>
            </div>
          </div>
        </details>
      </div>
      <div className="border-t border-border pt-3 flex justify-between items-baseline gap-2">
        <span className="text-sm font-semibold text-foreground">
          Total estimado
        </span>
        <span className="text-xl font-bold text-china-red tabular-nums">
          {productGrossBrl > 0 ? `R$ ${grandTotal.toFixed(2)}` : "—"}
        </span>
      </div>
      {productGrossBrl === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Valor em R$ confirmado na cotação, como no carrinho.
        </p>
      )}
      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground">
          Política de frete (FJ-BR-EXP)
        </summary>
        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed pl-1 border-l-2 border-border/80">
          Estimativa igual ao carrinho. Envio final e valor definitivo são
          confirmados pela equipe na cotação (sem opção marítima neste fluxo).
        </p>
      </details>
    </div>
  );
}

const Checkout = () => {
  const { items, clearCart, freightCouponCode, redditProductPromo10 } =
    useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cepLoading, setCepLoading] = useState(false);
  /** false = endereço fora do BR (texto livre para CSSBuy / envio internacional) */
  const [deliveryInBrazil, setDeliveryInBrazil] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [pixData, setPixData] = useState<{
    qr_code?: string;
    qr_code_base64?: string;
    ticket_url?: string;
  } | null>(null);
  const [paying, setPaying] = useState(false);
  const [cardFormReady, setCardFormReady] = useState(false);
  /** Pedidos já criados nesta sessão (evita duplicar ao repetir PIX). */
  const [checkoutSession, setCheckoutSession] = useState<{
    firstOrderId: string;
  } | null>(null);
  const checkoutSessionRef = useRef<{ firstOrderId: string } | null>(null);
  const [summaryLock, setSummaryLock] = useState<CheckoutSummaryLock | null>(
    null,
  );
  const mpRef = useRef<InstanceType<
    NonNullable<typeof window.MercadoPago>
  > | null>(null);
  const cardFormInstanceRef = useRef<CardFormInstance | null>(null);

  const [form, setForm] = useState<CheckoutForm>({
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
    internationalAddressLines: "",
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
    if (!deliveryInBrazil) return;
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length === 8) fetchCep(cep);
  }, [form.cep, fetchCep, deliveryInBrazil]);

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
          acc + (getDisplayPriceBrl(i.priceCny, i.priceBrl) ?? 0) * i.quantity,
        0,
      ),
    [items],
  );

  const redditLineSplit = useMemo(() => {
    const lineGrossBrls = items.map((i) => {
      const unit = getDisplayPriceBrl(i.priceCny, i.priceBrl) ?? 0;
      return Math.round(unit * i.quantity * 100) / 100;
    });
    return splitRedditTenPercentProductLines(lineGrossBrls, redditProductPromo10);
  }, [items, redditProductPromo10]);

  const redditProductDiscountBrl = redditLineSplit.discountBrl;
  const netProductSubtotalBrl = redditLineSplit.netTotalBrl;

  const freightPromo = useMemo(
    () =>
      applyFreightPromo(totalProductBrl, shipping.totalBrl, freightCouponCode),
    [totalProductBrl, shipping.totalBrl, freightCouponCode],
  );

  const grandTotal = useMemo(
    () =>
      netProductSubtotalBrl > 0
        ? Math.round(
            (netProductSubtotalBrl + freightPromo.freightAfterPromoBrl) * 100,
          ) / 100
        : 0,
    [netProductSubtotalBrl, freightPromo.freightAfterPromoBrl],
  );

  const checkoutComputation = useMemo(() => {
    if (items.length === 0) return null;
    const totalFreightBrl = freightPromo.freightAfterPromoBrl;
    const totalWeightG = shipping.totalWeightG;
    const checkoutGroupId = items.length > 1 ? crypto.randomUUID() : null;

    const lineGrossBrls = items.map((i) => {
      const unit = getDisplayPriceBrl(i.priceCny, i.priceBrl) ?? 0;
      return Math.round(unit * i.quantity * 100) / 100;
    });
    const { lineNetBrls } = splitRedditTenPercentProductLines(
      lineGrossBrls,
      redditProductPromo10,
    );

    const orderItemsJson = items.map((i, idx) => {
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
        lineProductBrl: lineNetBrls[idx] ?? 0,
      };
    });

    const lineEstimates: number[] = [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]!;
      const productTotal = lineNetBrls[idx] ?? 0;
      const itemCat =
        item.category ?? detectCategory(item.titlePt ?? item.title);
      const lineWeightG =
        itemWeightG(itemCat, item.weightG, item.keepBox ?? false) *
        item.quantity;
      const freightShare =
        totalWeightG > 0
          ? (lineWeightG / totalWeightG) * totalFreightBrl
          : totalFreightBrl / items.length;
      lineEstimates.push(Math.round((productTotal + freightShare) * 100) / 100);
    }

    const sumLineEstimates =
      Math.round(lineEstimates.reduce((a, b) => a + b, 0) * 100) / 100;
    const expectedCheckoutTotal =
      Math.round((netProductSubtotalBrl + totalFreightBrl) * 100) / 100;

    return {
      checkoutGroupId,
      orderItemsJson,
      lineEstimates,
      sumLineEstimates,
      expectedCheckoutTotal,
    };
  }, [
    items,
    shipping,
    freightPromo,
    redditProductPromo10,
    netProductSubtotalBrl,
  ]);

  const displayItems =
    items.length > 0 ? items : summaryLock?.itemsSnapshot ?? [];
  const displayShipping =
    items.length > 0 ? shipping : summaryLock?.shipping ?? shipping;
  const displayProductGrossBrl =
    items.length > 0 ? totalProductBrl : summaryLock?.productGrossBrl ?? 0;
  const displayRedditProductDiscountBrl =
    items.length > 0
      ? redditProductDiscountBrl
      : summaryLock?.redditProductDiscountBrl ?? 0;
  const displayGrandTotal =
    items.length > 0 ? grandTotal : summaryLock?.grandTotal ?? 0;
  const displayFreightPromo =
    items.length > 0 ? freightPromo : summaryLock?.freightPromo ?? freightPromo;

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

  const goToPaymentStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }
    const err = validateShippingForm(form, deliveryInBrazil);
    if (err) {
      toast.error(err);
      return;
    }
    setStep(2);
    setPixData(null);
  };

  const submitOrders = useCallback(async (): Promise<string | null> => {
    if (checkoutSessionRef.current)
      return checkoutSessionRef.current.firstOrderId;
    if (items.length === 0 || !checkoutComputation) return null;

    if (
      Math.abs(
        checkoutComputation.sumLineEstimates -
          checkoutComputation.expectedCheckoutTotal,
      ) > 0.06
    ) {
      toast.error(
        "O total enviado não confere com o resumo (proteção contra erro de preço). Recarregue a página ou volte ao carrinho e tente de novo.",
      );
      return null;
    }

    const cep = form.cep.replace(/\D/g, "");
    const cpf = form.customerCpf.replace(/\D/g, "");
    const {
      checkoutGroupId,
      orderItemsJson,
      lineEstimates,
    } = checkoutComputation;

    let firstOrderId: string | null = null;

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
          cep: deliveryInBrazil ? cep : "00000000",
          deliveryInBrazil,
          internationalAddressLines: deliveryInBrazil
            ? undefined
            : form.internationalAddressLines.trim(),
          shippingMethod: CHECKOUT_SHIPPING_METHOD,
          notes: form.notes || item.notes || null,
          customerName: form.customerName.trim(),
          customerEmail: form.customerEmail.trim(),
          customerWhatsapp: form.customerWhatsapp.replace(/\D/g, ""),
          customerCpf:
            deliveryInBrazil ? cpf : cpf.length === 11 ? cpf : null,
          addressStreet: deliveryInBrazil ? form.addressStreet.trim() : null,
          addressNumber: deliveryInBrazil ? form.addressNumber.trim() : null,
          addressComplement: deliveryInBrazil
            ? form.addressComplement.trim() || null
            : null,
          addressNeighborhood: deliveryInBrazil
            ? form.addressNeighborhood.trim()
            : null,
          addressCity: deliveryInBrazil ? form.addressCity.trim() : null,
          addressState: deliveryInBrazil ? form.addressState.trim() : null,
          estimatedTotalBrl,
          checkoutGroupId,
          orderItemsJson,
          silentOrderCreation: true,
          redditProductDiscount10: redditProductPromo10,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao criar pedido");
      if (!firstOrderId) firstOrderId = data.id;
    }

    const sid = { firstOrderId: firstOrderId! };
    checkoutSessionRef.current = sid;
    setCheckoutSession(sid);
    return firstOrderId;
  }, [items, checkoutComputation, form, deliveryInBrazil, redditProductPromo10]);

  const createPixPayment = async (orderId: string) => {
    const res = await fetch(apiUrl(`/api/orders/${orderId}/create-payment`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_method_id: "pix",
        payer_email: form.customerEmail.trim(),
        payer_name: form.customerName.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao criar pagamento PIX");

    const txData = pixDataFromCreatePaymentResponse(data);
    if (data.status === "approved") {
      clearCart();
      setSummaryLock(null);
      toast.success("Pagamento aprovado!");
      navigate(`/pedido-confirmado/${orderId}`, { replace: true });
      return;
    }
    if (!hasRenderablePixPayload(txData)) {
      throw new Error(
        "O PIX foi criado, mas o QR Code não veio na resposta. Tente novamente em instantes ou use o link no e-mail quando chegar.",
      );
    }
    setSummaryLock({
      itemsSnapshot: items.map((i) => ({ ...i })),
      shipping: { ...shipping },
      productGrossBrl: totalProductBrl,
      redditProductDiscountBrl,
      grandTotal,
      freightPromo: { ...freightPromo },
    });
    setPixData(txData);
    clearCart();
    toast.success(
      "PIX gerado. Pague para confirmar o pedido — o status vira “pago” após a confirmação do banco.",
    );
  };

  const handlePixCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerEmail.trim()) {
      toast.error("Informe o e-mail para o comprovante.");
      return;
    }
    setPaying(true);
    setPixData(null);
    try {
      const orderId = await submitOrders();
      if (!orderId) return;
      await createPixPayment(orderId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao processar. Tente novamente.",
      );
    } finally {
      setPaying(false);
    }
  };

  const submitCardPayment = useCallback(
    async (formData: CardFormData, orderId: string) => {
      try {
        const res = await fetch(apiUrl(`/api/orders/${orderId}/create-payment`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: formData.token,
            payment_method_id: formData.paymentMethodId,
            payer_email: formData.cardholderEmail.trim(),
            payer_name: form.customerName.trim(),
            installments: Number(formData.installments) || 1,
            issuer_id: formData.issuerId || undefined,
            identification_type: formData.identificationType || undefined,
            identification_number: formData.identificationNumber || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao processar pagamento");
        if (data.status === "approved") {
          clearCart();
          setSummaryLock(null);
          toast.success("Pagamento aprovado!");
          navigate(`/pedido-confirmado/${orderId}`, { replace: true });
        } else {
          toast.error(
            data.status_detail ||
              "Pagamento não aprovado. Tente novamente ou use PIX.",
          );
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      } finally {
        setPaying(false);
      }
    },
    [form.customerName, navigate, clearCart],
  );

  useEffect(() => {
    const initMp = () => {
      if (
        typeof window !== "undefined" &&
        window.MercadoPago &&
        MP_PUBLIC_KEY &&
        !MP_PUBLIC_KEY.includes("PLACEHOLDER")
      ) {
        mpRef.current = new window.MercadoPago(MP_PUBLIC_KEY, {
          locale: "pt-BR",
        });
      }
    };
    if (document.readyState === "complete") initMp();
    else window.addEventListener("load", initMp, { once: true });
    return () => window.removeEventListener("load", initMp);
  }, []);

  /** Valor enviado ao Mercado Pago: soma de todos os itens do checkout (vários pedidos no backend). */
  const mpCardChargeAmountStr =
    grandTotal > 0 ? String(Math.round(grandTotal * 100) / 100) : "0";

  const submitOrdersRef = useRef(submitOrders);
  submitOrdersRef.current = submitOrders;
  const submitCardPaymentRef = useRef(submitCardPayment);
  submitCardPaymentRef.current = submitCardPayment;

  useEffect(() => {
    if (step !== 2 || paymentMethod !== "card" || !mpRef.current) return;
    if (!checkoutComputation || grandTotal <= 0) return;

    const formEl = document.getElementById("checkout-mp-card-form");
    if (!formEl) return;

    setCardFormReady(false);
    try {
      const cardForm = mpRef.current.cardForm({
        amount: mpCardChargeAmountStr,
        iframe: true,
        form: {
          id: "checkout-mp-card-form",
          cardNumber: {
            id: "checkout-mp__cardNumber",
            placeholder: "Número do cartão",
          },
          expirationDate: {
            id: "checkout-mp__expirationDate",
            placeholder: "MM/AA",
          },
          securityCode: {
            id: "checkout-mp__securityCode",
            placeholder: "CVV",
          },
          cardholderName: {
            id: "checkout-mp__cardholderName",
            placeholder: "Nome no cartão",
          },
          issuer: { id: "checkout-mp__issuer", placeholder: "Banco emissor" },
          installments: {
            id: "checkout-mp__installments",
            placeholder: "Parcelas",
          },
          identificationType: {
            id: "checkout-mp__identificationType",
            placeholder: "Tipo",
          },
          identificationNumber: {
            id: "checkout-mp__identificationNumber",
            placeholder: "CPF",
          },
          cardholderEmail: {
            id: "checkout-mp__cardholderEmail",
            placeholder: "E-mail",
          },
        },
        callbacks: {
          onFormMounted: (err) => {
            if (err) console.warn("CardForm mount error:", err);
            else setCardFormReady(true);
          },
          onSubmit: async (event) => {
            event.preventDefault();
            const fd = cardForm.getCardFormData();
            if (!fd.token) return;
            setPaying(true);
            try {
              const orderId = await submitOrdersRef.current();
              if (!orderId) {
                setPaying(false);
                return;
              }
              await submitCardPaymentRef.current(fd, orderId);
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : "Erro ao criar pedido. Tente novamente.",
              );
              setPaying(false);
            }
          },
        },
      });
      cardFormInstanceRef.current = cardForm;
    } catch (err) {
      console.warn("CardForm init error:", err);
    }

    return () => {
      setCardFormReady(false);
      cardFormInstanceRef.current = null;
    };
  }, [step, paymentMethod, mpCardChargeAmountStr, checkoutComputation, grandTotal]);

  useEffect(() => {
    if (step !== 2 || paymentMethod !== "card" || !cardFormReady) return;
    return attachInstallmentsMaxClamp("checkout-mp__installments");
  }, [step, paymentMethod, cardFormReady]);

  const copyPixCode = () => {
    if (!pixData?.qr_code) return;
    navigator.clipboard.writeText(pixData.qr_code);
    toast.success("Código PIX copiado!");
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const summaryProps = {
    items: displayItems,
    shipping: displayShipping,
    productGrossBrl: displayProductGrossBrl,
    redditProductDiscountBrl: displayRedditProductDiscountBrl,
    grandTotal: displayGrandTotal,
    freightPromo: displayFreightPromo,
  };

  const handleGoToDelivery = () => {
    if (checkoutSession) {
      toast.message(
        "Os pedidos já foram criados. Conclua o pagamento abaixo ou use o link enviado por e-mail.",
      );
      return;
    }
    setStep(1);
  };

  if (items.length === 0 && !checkoutSession) {
    return (
      <div className="min-h-screen bg-muted/25">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <Package
            className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4"
            aria-hidden
          />
          <h1 className="text-xl font-heading font-bold text-foreground mb-2">
            Carrinho vazio
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Adicione produtos ao carrinho para finalizar a compra.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/carrinho"
              className="inline-flex justify-center items-center border border-border bg-card px-5 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              Ver carrinho
            </Link>
            <Link
              to="/"
              className="inline-flex justify-center items-center bg-china-red text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-china-red/90"
            >
              Continuar comprando
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/25">
      <Navbar />
      <main className="pb-28 lg:pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <InstallmentPromoBanner />
          <Link
            to="/carrinho"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-china-red transition-colors mb-6"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            Voltar ao carrinho
          </Link>

          <CheckoutStepper
            step={step}
            onGoToDelivery={handleGoToDelivery}
            canEditDelivery={step === 2 && !checkoutSession}
          />

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight">
              Finalizar compra
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
              Mercado Pago
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-8 max-w-2xl leading-relaxed">
            {step === 1
              ? "Informe onde entregamos e seus dados. Na próxima tela você escolhe PIX ou cartão."
              : "Última etapa: no PIX, primeiro geramos o QR Code; o pedido passa a “pago” quando o banco confirmar o pagamento."}
          </p>

          <div className="grid lg:grid-cols-[minmax(0,1fr),380px] gap-8 xl:gap-10 items-start">
            <div className="space-y-6 min-w-0">
              <details className="lg:hidden group rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2 min-w-0 text-sm">
                    <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      Pedido ({items.length}{" "}
                      {items.length === 1 ? "item" : "itens"}) ·{" "}
                      {displayProductGrossBrl > 0
                        ? `R$ ${displayGrandTotal.toFixed(2)}`
                        : "Total a confirmar"}
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                    aria-hidden
                  />
                </summary>
                <div className="border-t border-border px-4 pb-4 pt-2 bg-muted/20 space-y-3">
                  <OrderSummaryPanel {...summaryProps} variant="compact" />
                  <FreightPromoRulesLink size="xs" />
                </div>
              </details>

        {step === 1 && (
          <form
            id="checkout-shipping-form"
            onSubmit={goToPaymentStep}
            className="space-y-6"
          >
            <section className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-china-red/10 text-china-red">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                Endereço de entrega
              </div>

              <div className="flex rounded-xl bg-muted/50 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setDeliveryInBrazil(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-sm font-medium transition-colors ${
                    deliveryInBrazil
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                  Brasil (CEP)
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryInBrazil(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-sm font-medium transition-colors ${
                    !deliveryInBrazil
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe2 className="h-4 w-4 shrink-0" aria-hidden />
                  Fora do Brasil
                </button>
              </div>

              {deliveryInBrazil ? (
                <>
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
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="internationalAddressLines">
                    Endereço completo no exterior *
                  </Label>
                  <Textarea
                    id="internationalAddressLines"
                    name="internationalAddressLines"
                    rows={6}
                    placeholder={`País, cidade, código postal (ZIP/postal code), rua, número, complemento — no formato que você usaria no CSSBuy ou na transportadora.\n\nEx.: United States, 10001 New York, NY, 123 Main St Apt 4`}
                    value={form.internationalAddressLines}
                    onChange={handleChange}
                    className="min-h-[140px] resize-y"
                    required={!deliveryInBrazil}
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esse texto entra no pedido e no bloco para copiar no CSSBuy. O frete
                    exibido no resumo continua sendo a estimativa padrão (base Brasil); o
                    envio final ao seu país combinamos após o pagamento, como de costume
                    no sourcing internacional.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-china-red/10 text-china-red">
                  <User className="h-4 w-4" aria-hidden />
                </span>
                Quem recebe
              </div>

            <div>
              <Label htmlFor="customerCpf">
                CPF {deliveryInBrazil ? "*" : "(opcional)"}
              </Label>
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
                required={deliveryInBrazil}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {deliveryInBrazil
                  ? "Obrigatório para envio ao Brasil (alfândega)."
                  : "Se não tiver CPF brasileiro, deixe em branco ou informe outro documento nas observações."}
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
                placeholder={
                  deliveryInBrazil
                    ? "(11) 99999-9999"
                    : "DDI + número (ex.: 351… ou 1…)"
                }
                value={form.customerWhatsapp}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    customerWhatsapp: e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 18),
                  }))
                }
                required
              />
              {!deliveryInBrazil && (
                <p className="text-xs text-muted-foreground mt-1">
                  Inclua o código do país (DDI) para falarmos com você no WhatsApp.
                </p>
              )}
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
            </section>

            <div className="hidden lg:flex gap-3 pt-2">
              <Link
                to="/carrinho"
                className="flex-1 inline-flex justify-center items-center border border-border px-4 py-3.5 rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors min-h-[48px]"
              >
                Voltar ao carrinho
              </Link>
              <button
                type="submit"
                className="flex-1 bg-china-red text-white px-4 py-3.5 rounded-xl text-sm font-bold hover:bg-china-red/90 min-h-[48px] shadow-md shadow-china-red/20"
              >
                Continuar para o pagamento
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                if (checkoutSession) {
                  toast.message(
                    "Os pedidos já foram criados. Use o PIX ou o cartão abaixo para pagar, ou abra o link no e-mail.",
                  );
                  return;
                }
                setStep(1);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-china-red hover:underline"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden />
              Alterar endereço e dados
            </button>

              <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="border-b border-border bg-muted/30 px-4 py-3.5 flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="font-semibold text-foreground text-base">
                    Forma de pagamento
                  </h2>
                  <MercadoPagoBadge size="sm" />
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex rounded-xl bg-muted/50 p-1 mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("pix");
                        setPixData(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
                        paymentMethod === "pix"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <QrCode className="w-4 h-4" /> PIX
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
                        paymentMethod === "card"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" /> Cartão
                    </button>
                  </div>

                  {paymentMethod === "pix" && (
                    <>
                      {!pixData ? (
                        <form onSubmit={handlePixCheckout} className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Ao gerar o PIX, criamos o pedido e exibimos o QR Code.
                            O comprovante vai para o e-mail abaixo. A confirmação
                            do pedido como pago ocorre quando o PIX for
                            compensado (você pode acompanhar em &quot;Meus
                            pedidos&quot;).
                          </p>
                          <div>
                            <Label htmlFor="pix-email">E-mail</Label>
                            <Input
                              id="pix-email"
                              type="email"
                              value={form.customerEmail}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  customerEmail: e.target.value,
                                }))
                              }
                              className="mt-1.5"
                              required
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={paying}
                            className="w-full bg-china-red text-white py-3.5 rounded-xl font-semibold hover:bg-china-red/90 disabled:opacity-60 transition-opacity"
                          >
                            {paying
                              ? "Gerando PIX..."
                              : "Gerar QR Code PIX"}
                          </button>
                        </form>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm font-medium text-foreground">
                            Escaneie o QR Code com o app do seu banco
                          </p>
                          <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-muted/30 border border-border">
                            {pixData.qr_code_base64 && (
                              <img
                                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                                alt="QR Code PIX"
                                className="w-52 h-52 rounded-lg bg-white p-2"
                              />
                            )}
                            {pixData.qr_code && !pixData.qr_code_base64 && (
                              <p className="text-xs break-all bg-muted p-3 rounded font-mono max-w-full">
                                {pixData.qr_code}
                              </p>
                            )}
                            {!pixData.qr_code &&
                              !pixData.qr_code_base64 &&
                              pixData.ticket_url && (
                                <p className="text-sm text-center text-muted-foreground">
                                  Abra o link abaixo para pagar com PIX no app ou
                                  no banco.
                                </p>
                              )}
                            {pixData.qr_code && (
                              <button
                                type="button"
                                onClick={copyPixCode}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium"
                              >
                                <Copy className="w-4 h-4" /> Copiar código PIX
                              </button>
                            )}
                          </div>
                          {pixData.ticket_url && (
                            <a
                              href={pixData.ticket_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-center text-sm text-china-red hover:underline"
                            >
                              Abrir PIX no navegador →
                            </a>
                          )}
                          {checkoutSession && (
                            <Link
                              to={`/pedido-confirmado/${checkoutSession.firstOrderId}`}
                              className="block text-center text-sm font-medium text-foreground underline"
                            >
                              Ver status do pedido →
                            </Link>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {paymentMethod === "card" && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Preencha o cartão e confirme. Registramos o pedido e
                        enviamos a cobrança ao Mercado Pago na mesma ação.
                      </p>
                      {!MP_PUBLIC_KEY ||
                      MP_PUBLIC_KEY.includes("PLACEHOLDER") ? (
                        <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
                          Pagamento com cartão em configuração. Use PIX ou
                          configure{" "}
                          <code className="text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">
                            VITE_MP_PUBLIC_KEY
                          </code>
                          .
                        </p>
                      ) : (
                        <form id="checkout-mp-card-form" className="space-y-4">
                          <div>
                            <Label>Número do cartão</Label>
                            <div
                              id="checkout-mp__cardNumber"
                              className="mt-1.5 flex h-10 w-full items-center overflow-hidden rounded-lg border border-input bg-background px-3 [&>iframe]:block [&>iframe]:h-10 [&>iframe]:max-h-10 [&>iframe]:min-h-0 [&>iframe]:w-full"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Validade</Label>
                              <div
                                id="checkout-mp__expirationDate"
                                className="mt-1.5 flex h-10 items-center overflow-hidden rounded-lg border border-input bg-background px-2 [&>iframe]:block [&>iframe]:h-10 [&>iframe]:max-h-10 [&>iframe]:min-h-0 [&>iframe]:w-full"
                              />
                            </div>
                            <div>
                              <Label>CVV</Label>
                              <div
                                id="checkout-mp__securityCode"
                                className="mt-1.5 flex h-10 items-center overflow-hidden rounded-lg border border-input bg-background px-2 [&>iframe]:block [&>iframe]:h-10 [&>iframe]:max-h-10 [&>iframe]:min-h-0 [&>iframe]:w-full"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="checkout-mp__cardholderName">
                              Nome no cartão
                            </Label>
                            <Input
                              id="checkout-mp__cardholderName"
                              placeholder="Como está no cartão"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor="checkout-mp__cardholderEmail">
                              E-mail
                            </Label>
                            <Input
                              id="checkout-mp__cardholderEmail"
                              type="email"
                              defaultValue={form.customerEmail}
                              placeholder="seu@email.com"
                              className="mt-1.5"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="checkout-mp__identificationType">
                                Documento
                              </Label>
                              <select
                                id="checkout-mp__identificationType"
                                className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor="checkout-mp__identificationNumber">
                                CPF
                              </Label>
                              <Input
                                id="checkout-mp__identificationNumber"
                                placeholder="000.000.000-00"
                                className="mt-1.5"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="checkout-mp__issuer">
                                Banco emissor
                              </Label>
                              <select
                                id="checkout-mp__issuer"
                                className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor="checkout-mp__installments">
                                Parcelas{" "}
                                <span className="text-muted-foreground font-normal">
                                  (até {MP_MAX_INSTALLMENTS}x)
                                </span>
                              </Label>
                              <select
                                id="checkout-mp__installments"
                                className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={paying || !cardFormReady}
                            className="w-full bg-china-red text-white py-3.5 rounded-xl font-semibold hover:bg-china-red/90 disabled:opacity-60 transition-opacity"
                          >
                            {paying ? "Processando..." : "Pagar e registrar pedido"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </section>

            {checkoutComputation && items.length > 1 && (
              <p className="text-xs text-muted-foreground leading-relaxed rounded-xl border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50 px-4 py-3">
                <strong className="text-foreground font-medium">
                  Vários produtos no carrinho:
                </strong>{" "}
                cada item vira um registro de pedido separado, mas{" "}
                <span className="font-semibold text-foreground">
                  um único pagamento (PIX ou cartão) cobre todos os itens
                </span>{" "}
                — total R$ {grandTotal.toFixed(2)}.
              </p>
            )}
          </div>
        )}
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-4">
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <OrderSummaryPanel {...summaryProps} />
                  <div className="mt-3">
                    <FreightPromoRulesLink size="xs" />
                  </div>
                </div>
                {step === 2 && checkoutComputation && (
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Cobrança nesta etapa
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {items.length > 1
                        ? "Total cobrado (todos os itens)"
                        : "Valor cobrado"}
                    </p>
                    <p className="text-2xl font-bold text-china-red tabular-nums">
                      R$ {grandTotal.toFixed(2)}
                    </p>
                  </div>
                )}
                <div className="rounded-xl border border-border bg-card p-4 flex gap-3 text-xs text-muted-foreground leading-relaxed">
                  <Lock
                    className="h-4 w-4 shrink-0 text-green-600 mt-0.5"
                    aria-hidden
                  />
                  <span>
                    Checkout seguro: pagamento processado pelo Mercado Pago.
                    Não armazenamos dados de cartão.
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {step === 1 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 px-4">
            <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Total estimado
                </p>
                <p className="text-xl font-bold text-china-red tabular-nums truncate">
                  {displayProductGrossBrl > 0
                    ? `R$ ${displayGrandTotal.toFixed(2)}`
                    : "—"}
                </p>
              </div>
              <button
                type="submit"
                form="checkout-shipping-form"
                className="shrink-0 min-h-[48px] px-6 rounded-xl bg-china-red text-white text-sm font-bold hover:bg-china-red/90 shadow-md shadow-china-red/25"
              >
                Continuar
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
