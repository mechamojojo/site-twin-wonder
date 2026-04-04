import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiUrl } from "@/lib/api";
import { SITE_URL } from "@/data/siteConfig";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Lock,
  MessageCircle,
  Package,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ADMIN_TOKEN_KEY = "compraschina-admin-token";

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_COTACAO: "Aguardando cotação",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  ENVIADO_PARA_CSSBUY: "Enviado p/ CSSBuy",
  COMPRADO: "Comprado",
  NO_ESTOQUE: "No estoque",
  AGUARDANDO_ENVIO: "Aguardando envio",
  EM_ENVIO: "Em envio",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO_COTACAO: "bg-amber-100 text-amber-800",
  AGUARDANDO_PAGAMENTO: "bg-blue-100 text-blue-800",
  PAGO: "bg-green-100 text-green-800",
  ENVIADO_PARA_CSSBUY: "bg-cyan-100 text-cyan-800",
  COMPRADO: "bg-teal-100 text-teal-800",
  NO_ESTOQUE: "bg-emerald-100 text-emerald-800",
  AGUARDANDO_ENVIO: "bg-indigo-100 text-indigo-800",
  EM_ENVIO: "bg-purple-100 text-purple-800",
  CONCLUIDO: "bg-slate-100 text-slate-700",
  CANCELADO: "bg-red-100 text-red-800",
};

const QUICK_STATUSES = [
  "ENVIADO_PARA_CSSBUY",
  "COMPRADO",
  "NO_ESTOQUE",
  "AGUARDANDO_ENVIO",
  "EM_ENVIO",
  "CONCLUIDO",
] as const;

type Order = {
  id: string;
  originalUrl: string;
  productDescription: string;
  productTitle: string | null;
  /** Título só na faixa "O que estão comprando" (opcional) */
  barDisplayTitle?: string | null;
  productImage: string | null;
  productColor: string | null;
  productSize: string | null;
  productVariation: string | null;
  quantity: number;
  status: string;
  cep: string;
  customerName: string | null;
  customerEmail: string | null;
  customerWhatsapp: string | null;
  customerCpf: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  notes: string | null;
  checkoutGroupId?: string | null;
  orderItemsJson?: unknown;
  cssbuyOrderId: string | null;
  internalNotes: string | null;
  quote?: { totalBrl: string };
  shipment?: { trackingCode: string | null; carrier: string | null };
};

type CartSnap = {
  url?: string;
  quantity?: number;
  titlePt?: string | null;
  title?: string | null;
  lineProductBrl?: number;
};

function parseCartSnap(raw: unknown): CartSnap[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === "object") as CartSnap[];
}

function formatCpf(v: string | null): string {
  if (!v) return "";
  const d = v.replace(/\D/g, "");
  if (d.length !== 11) return v;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatAddress(o: Order): string {
  const parts = [o.addressStreet, o.addressNumber, o.addressComplement].filter(
    Boolean,
  );
  const line1 = parts.join(", ");
  const line2 = [o.addressNeighborhood, o.addressCity, o.addressState]
    .filter(Boolean)
    .join(", ");
  return [line1, line2, `CEP ${o.cep}`].filter(Boolean).join("\n");
}

function buildCssBuyCopyText(o: Order): string {
  const variantParts = [
    o.productColor,
    o.productSize,
    o.productVariation,
  ].filter(Boolean);
  const noteParts = [...variantParts];
  if (o.notes) noteParts.push(o.notes);
  const nota = noteParts.length ? noteParts.join(" | ") : o.productDescription;
  return [
    "--- COMPRASCHINA → CSSBuy ---",
    `Link: ${o.originalUrl}`,
    `Título: ${o.productTitle || o.productDescription}`,
    `Nota (cor/tamanho/variante): ${nota}`,
    `Quantidade: ${o.quantity}`,
    "",
    "Destinatário Brasil:",
    `Nome: ${o.customerName || "-"}`,
    `CPF: ${formatCpf(o.customerCpf)}`,
    `Endereço:\n${formatAddress(o)}`,
    `WhatsApp: ${o.customerWhatsapp || "-"}`,
    `E-mail: ${o.customerEmail || "-"}`,
    "---",
  ].join("\n");
}

function whatsAppUrl(phone: string | null, message?: string): string {
  if (!phone) return "#";
  const digits = phone.replace(/\D/g, "").replace(/^0/, "");
  const num =
    digits.length === 11
      ? "55" + digits
      : digits.startsWith("55")
        ? digits
        : "55" + digits;
  const base = `https://wa.me/${num}`;
  if (message) return base + "?text=" + encodeURIComponent(message);
  return base;
}

const CSSBUY_ORDER_LIST_URL = "https://www.cssbuy.com/?go=m&name=sendorderlist";

const AdminPedido = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(ADMIN_TOKEN_KEY)
      : null;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    status: "",
    cssbuyOrderId: "",
    internalNotes: "",
    trackingCode: "",
    carrier: "",
    productTitle: "",
    barDisplayTitle: "",
  });

  useEffect(() => {
    if (!token) {
      navigate("/admin", { replace: true });
      return;
    }
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(apiUrl(`/api/admin/orders/${id}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          navigate("/admin", { replace: true });
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (data) {
          setOrder(data);
          setForm({
            status: data.status,
            cssbuyOrderId: data.cssbuyOrderId ?? "",
            internalNotes: data.internalNotes ?? "",
            trackingCode: data.shipment?.trackingCode ?? "",
            carrier: data.shipment?.carrier ?? "",
            productTitle: data.productTitle ?? "",
            barDisplayTitle: data.barDisplayTitle ?? "",
          });
        } else {
          setError(
            "Pedido não encontrado ou sessão expirada. Faça login novamente no admin.",
          );
        }
      })
      .catch(() =>
        setError(
          "Erro ao carregar. Verifique se o backend está rodando e se a URL da API está correta.",
        ),
      )
      .finally(() => setLoading(false));
  }, [id, token, navigate]);

  const setStatus = async (newStatus: string) => {
    if (!token || !order) return;
    if (
      newStatus === "CANCELADO" &&
      !window.confirm("Tem certeza que deseja cancelar este pedido?")
    )
      return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/orders/${order.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erro ao atualizar");
        return;
      }
      const data = await res.json();
      setOrder({ ...order, status: data.status });
      setForm((f) => ({ ...f, status: data.status }));
      toast.success(
        newStatus === "CANCELADO" ? "Pedido cancelado" : "Status atualizado",
      );
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!token || !order) return;
    setSaving(true);
    try {
      const [orderRes, shipRes] = await Promise.all([
        fetch(apiUrl(`/api/admin/orders/${order.id}`), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: form.status,
            cssbuyOrderId: form.cssbuyOrderId.trim() || null,
            internalNotes: form.internalNotes.trim() || null,
            productTitle: form.productTitle.trim() || null,
            barDisplayTitle: form.barDisplayTitle.trim() || null,
          }),
        }),
        fetch(apiUrl(`/api/admin/orders/${order.id}/shipment`), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            trackingCode: form.trackingCode.trim() || null,
            carrier: form.carrier.trim() || null,
          }),
        }),
      ]);
      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        toast.error(
          (err as { error?: string }).error ||
            `Erro ao salvar pedido (${orderRes.status})`,
        );
        return;
      }
      if (!shipRes.ok) {
        const err = await shipRes.json().catch(() => ({}));
        toast.error(
          (err as { error?: string }).error ||
            `Erro ao salvar envio (${shipRes.status})`,
        );
        return;
      }
      const updated = (await orderRes.json()) as Order;
      const shipJson = shipRes.ok
        ? ((await shipRes.json().catch(() => null)) as Order["shipment"] | null)
        : null;
      setOrder({
        ...order,
        ...updated,
        shipment:
          shipJson ??
          updated.shipment ??
          order.shipment ?? {
            trackingCode: form.trackingCode.trim() || null,
            carrier: form.carrier.trim() || null,
          },
      });
      setForm((f) => ({
        ...f,
        status: updated.status ?? f.status,
        cssbuyOrderId: updated.cssbuyOrderId ?? "",
        internalNotes: updated.internalNotes ?? "",
        productTitle: updated.productTitle ?? "",
        barDisplayTitle: updated.barDisplayTitle ?? "",
      }));
      toast.success("Salvo!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const [processingCssBuy, setProcessingCssBuy] = useState(false);

  const handleProcessarCompra = async () => {
    if (!order?.id || !token) return;
    setProcessingCssBuy(true);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/orders/${order.id}/cssbuy-url`),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json().catch(() => ({}));
      const url = data?.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.success(
          "Abrindo produto no CSSBuy. Replique o modelo da imagem abaixo.",
        );
      } else {
        toast.info(
          "Este marketplace não tem link direto no CSSBuy. Use o link do produto e copie o resumo.",
        );
      }
    } catch {
      toast.error("Erro ao obter link CSSBuy");
    } finally {
      setProcessingCssBuy(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">
          Redirecionando para o login do admin...
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <p className="text-muted-foreground">Carregando pedido...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <p className="text-red-600 mb-4">
            {error || "Pedido não encontrado"}
          </p>
          <Link
            to="/admin"
            className="text-china-red font-medium hover:underline"
          >
            ← Voltar ao painel
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const nome = order.customerName?.trim().split(/\s/)[0] || "cliente";
  const produto = (
    order.productTitle ||
    order.productDescription ||
    "seu produto"
  ).slice(0, 80);
  const linkAcompanhamento = `${SITE_URL.replace(/\/$/, "")}/pedido-confirmado/${order.id}`;

  const msgPedidoAceito =
    `Olá, ${nome}!\n\n` +
    `O pagamento do produto *${produto}* foi confirmado e seu pedido já está em processamento na ComprasChina.\n\n` +
    `Assim que tivermos mais novidades, entraremos em contato.\n\n` +
    `Você pode acompanhar o status pelo link: ${linkAcompanhamento}`;

  const msgEnviado = (code: string) =>
    `Olá, ${nome}!\n\n` +
    `Seu pedido do produto *${produto}* já foi enviado.\n\n` +
    `Código de rastreio: ${code}\n` +
    `Acompanhe a entrega em: https://t.17track.net/pt#nums=${code}\n\n` +
    `Qualquer dúvida, estamos à disposição.`;

  const msgNegado =
    `Olá, ${nome}!\n\n` +
    `Infelizmente não foi possível processar seu pedido do produto *${produto}*.\n\n` +
    `Caso tenha efetuado pagamento, entre em contato conosco para tratarmos do reembolso.\n\n` +
    `Estamos à disposição para qualquer dúvida.`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao painel
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Bloco do produto: imagem + título + link */}
          <div className="p-6 border-b border-border">
            <div className="flex flex-wrap items-start gap-2 mb-3">
              <span className="text-xs font-mono text-muted-foreground">
                {order.id}
              </span>
              <Badge className={STATUS_COLORS[order.status] || "bg-muted"}>
                {STATUS_LABELS[order.status] || order.status}
              </Badge>
              {order.quote && (
                <span className="text-lg font-bold text-china-red">
                  R$ {Number(order.quote.totalBrl).toFixed(2)}
                </span>
              )}
            </div>
            {parseCartSnap(order.orderItemsJson).length > 0 &&
              (order.checkoutGroupId ||
                parseCartSnap(order.orderItemsJson).length > 1) && (
              <div className="mb-5 rounded-lg border border-border bg-muted/40 p-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-china-red" />
                  {order.checkoutGroupId
                    ? "Carrinho completo (mesmo checkout)"
                    : "Itens no checkout"}
                </h3>
                <ul className="space-y-3 text-sm">
                  {parseCartSnap(order.orderItemsJson).map((row, idx) => (
                    <li
                      key={idx}
                      className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium text-foreground">
                          {row.titlePt || row.title || "Produto"}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          ×{row.quantity ?? 1}
                          {row.lineProductBrl != null && (
                            <span className="text-china-red font-semibold ml-2">
                              R$ {Number(row.lineProductBrl).toFixed(2)}
                            </span>
                          )}
                        </span>
                      </div>
                      {row.url && (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate"
                        >
                          {row.url}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground mt-3">
                  Este card é o produto deste pedido; use a lista acima para ver
                  tudo que o cliente enviou no mesmo checkout.
                </p>
              </div>
            )}
            <div className="flex gap-4 flex-wrap">
              {order.productImage && (
                <div className="shrink-0 w-24 h-24 rounded-lg border border-border bg-muted overflow-hidden">
                  <img
                    src={order.productImage}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-heading font-bold text-foreground">
                  {order.productTitle || order.productDescription}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Qtd: {order.quantity}
                  {(order.productColor ||
                    order.productSize ||
                    order.productVariation) && (
                    <>
                      {" "}
                      ·{" "}
                      {[
                        order.productColor,
                        order.productSize,
                        order.productVariation,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </>
                  )}
                </p>
                <a
                  href={order.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-sm text-china-red hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir link do produto no marketplace
                </a>
              </div>
            </div>
          </div>

          {/* Modelo escolhido pelo cliente — imagem em destaque para replicar no CSSBuy */}
          <div className="p-6 border-b border-border bg-amber-50/50 dark:bg-amber-950/20">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Modelo escolhido pelo cliente
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Use esta imagem para replicar exatamente a variante no CSSBuy
              (cor/estilo).
            </p>
            <div className="flex flex-wrap items-start gap-4">
              {order.productImage ? (
                <div className="shrink-0 w-48 h-48 sm:w-56 sm:h-56 rounded-xl border-2 border-border bg-white overflow-hidden shadow-sm">
                  <img
                    src={order.productImage}
                    alt="Modelo escolhido"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="shrink-0 w-48 h-48 sm:w-56 sm:h-56 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center text-xs text-muted-foreground text-center px-3">
                  Imagem do modelo não disponível
                </div>
              )}
              <div className="min-w-0">
                {(order.productColor ||
                  order.productSize ||
                  order.productVariation) && (
                  <p className="text-sm font-medium text-foreground">
                    {[
                      order.productColor,
                      order.productSize,
                      order.productVariation,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Qtd: {order.quantity}
                </p>
              </div>
            </div>
          </div>

          {/* Contatar cliente */}
          <div className="p-6 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Contatar cliente
            </h3>
            <div className="flex flex-wrap gap-2">
              {order.customerWhatsapp ? (
                <>
                  <Button
                    size="sm"
                    asChild
                    className="gap-1.5 bg-green-600 hover:bg-green-700"
                  >
                    <a
                      href={whatsAppUrl(order.customerWhatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="gap-1.5"
                  >
                    <a
                      href={whatsAppUrl(
                        order.customerWhatsapp,
                        msgPedidoAceito,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Enviar: Pedido aceito
                    </a>
                  </Button>
                  {order.shipment?.trackingCode && (
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="gap-1.5"
                    >
                      <a
                        href={whatsAppUrl(
                          order.customerWhatsapp,
                          msgEnviado(order.shipment.trackingCode),
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Enviar: Rastreio
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <a
                      href={whatsAppUrl(order.customerWhatsapp, msgNegado)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Enviar: Pedido negado
                    </a>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem WhatsApp cadastrado
                </p>
              )}
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="p-6 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Ações rápidas
            </h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={order.status === s ? "default" : "outline"}
                  disabled={saving}
                  onClick={() => setStatus(s)}
                  className={order.status === s ? "bg-china-red" : ""}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {STATUS_LABELS[s]}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={saving}
                onClick={() => setStatus("CANCELADO")}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Negar / Cancelar
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-china-red hover:bg-china-red/90"
                onClick={handleProcessarCompra}
                disabled={processingCssBuy}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {processingCssBuy ? "Abrindo…" : "Processar no CSSBuy"}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a
                  href={order.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir link produto
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a
                  href={CSSBUY_ORDER_LIST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-1.5"
                >
                  Abrir CSSBuy
                </a>
              </Button>
            </div>
          </div>

          {/* Editar */}
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Editar pedido
            </h3>
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-medium text-foreground">
                Nomes na loja
              </p>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Título do produto (painel, mensagens, área do cliente)
                </label>
                <input
                  value={form.productTitle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, productTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="Nome legível do produto"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Também aparece na faixa &quot;últimas compras&quot; da home
                  (antes do nome do catálogo). Limpe o campo e salve para voltar
                  a usar só o catálogo.
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Título só na faixa da home (opcional)
                </label>
                <input
                  value={form.barDisplayTitle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, barDisplayTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="Só se quiser um texto diferente do título acima"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Se preencher, vale só na faixa horizontal da home e substitui
                  até o título do produto acima (útil para um nome mais curto).
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  ID pedido CSSBuy
                </label>
                <input
                  value={form.cssbuyOrderId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cssbuyOrderId: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="Ex: 12345678"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Notas internas
                </label>
                <textarea
                  value={form.internalNotes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, internalNotes: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
                  placeholder="Observações..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Código rastreio
                  </label>
                  <input
                    value={form.trackingCode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, trackingCode: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    placeholder="Ex: LX123456789CN"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Transportadora
                  </label>
                  <input
                    value={form.carrier}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, carrier: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    placeholder="Ex: Correios"
                  />
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-china-red hover:bg-china-red/90"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>

          {/* Dados para CSSBuy */}
          <details className="border-t border-border">
            <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Ver dados completos (copiar para CSSBuy)
            </summary>
            <pre className="p-4 bg-muted/50 text-xs overflow-x-auto whitespace-pre-wrap font-sans">
              {buildCssBuyCopyText(order)}
            </pre>
          </details>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPedido;
