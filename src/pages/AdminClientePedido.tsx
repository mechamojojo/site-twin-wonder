import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Lock,
  Plus,
  Trash2,
  UserPlus,
  Package,
} from "lucide-react";

const ADMIN_TOKEN_KEY = "compraschina-admin-token";

const STATUS_OPTIONS = [
  { value: "COMPRADO", label: "Comprado" },
  { value: "ENVIADO_PARA_CSSBUY", label: "Enviado p/ CSSBuy" },
  { value: "PAGO", label: "Pago" },
  { value: "NO_ESTOQUE", label: "No estoque" },
  { value: "AGUARDANDO_ENVIO", label: "Aguardando envio" },
  { value: "EM_ENVIO", label: "Em envio" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "AGUARDANDO_COTACAO", label: "Aguardando cotação" },
  { value: "AGUARDANDO_PAGAMENTO", label: "Aguardando pagamento" },
  { value: "CANCELADO", label: "Cancelado" },
] as const;

type OrderDraft = {
  originalUrl: string;
  productTitle: string;
  productDescription: string;
  notes: string;
  productColor: string;
  productSize: string;
  productVariation: string;
  quantity: string;
  status: string;
  quoteTotalBrl: string;
  createdAt: string;
  cssbuyOrderId: string;
  internalNotes: string;
};

function emptyOrder(): OrderDraft {
  return {
    originalUrl: "",
    productTitle: "",
    productDescription: "",
    notes: "",
    productColor: "",
    productSize: "",
    productVariation: "",
    quantity: "1",
    status: "COMPRADO",
    quoteTotalBrl: "",
    createdAt: "",
    cssbuyOrderId: "",
    internalNotes: "",
  };
}

function messageFromApiError(
  data: unknown,
  res: Response,
  fallback: string,
): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.error === "string" && o.error.trim()) return o.error.trim();
    if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
  }
  if (res.status)
    return `HTTP ${res.status}${res.statusText ? ` — ${res.statusText}` : ""}`;
  return fallback;
}

function orderToPayload(o: OrderDraft): Record<string, unknown> {
  const out: Record<string, unknown> = {
    originalUrl: o.originalUrl.trim(),
    productDescription: o.productDescription.trim(),
    quantity: parseInt(o.quantity, 10) || 1,
    status: o.status,
  };
  if (o.productTitle.trim()) out.productTitle = o.productTitle.trim();
  if (o.notes.trim()) out.notes = o.notes.trim();
  if (o.productColor.trim()) out.productColor = o.productColor.trim();
  if (o.productSize.trim()) out.productSize = o.productSize.trim();
  if (o.productVariation.trim())
    out.productVariation = o.productVariation.trim();
  if (o.quoteTotalBrl.trim()) {
    const n = parseFloat(o.quoteTotalBrl.replace(",", "."));
    if (Number.isFinite(n) && n > 0) out.quoteTotalBrl = n;
  }
  if (o.createdAt.trim()) out.createdAt = o.createdAt.trim();
  if (o.cssbuyOrderId.trim()) out.cssbuyOrderId = o.cssbuyOrderId.trim();
  if (o.internalNotes.trim()) out.internalNotes = o.internalNotes.trim();
  return out;
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40";

const AdminClientePedido = () => {
  const [token, setToken] = useState<string | null>(() =>
    typeof localStorage !== "undefined"
      ? localStorage.getItem(ADMIN_TOKEN_KEY)
      : null,
  );
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [tab, setTab] = useState<"bootstrap" | "extra">("bootstrap");

  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userName, setUserName] = useState("");
  const [userCpf, setUserCpf] = useState("");
  const [userWa, setUserWa] = useState("");
  const [userCep, setUserCep] = useState("");
  const [userStreet, setUserStreet] = useState("");
  const [userNumber, setUserNumber] = useState("");
  const [userCompl, setUserCompl] = useState("");
  const [userNeigh, setUserNeigh] = useState("");
  const [userCity, setUserCity] = useState("");
  const [userState, setUserState] = useState("");

  const [orders, setOrders] = useState<OrderDraft[]>(() => [emptyOrder()]);
  const [lastResult, setLastResult] = useState<{
    temporaryPassword?: string;
    userId: string;
    email: string;
    orderIds: string[];
  } | null>(null);

  const [extraUserId, setExtraUserId] = useState("");
  const [extraOrder, setExtraOrder] = useState<OrderDraft>(() => emptyOrder());
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(d.error || "Senha incorreta");
        return;
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, d.token);
      setToken(d.token);
      setPassword("");
    } catch {
      setLoginError("Erro ao conectar.");
    } finally {
      setLoginLoading(false);
    }
  };

  const updateOrder = (index: number, patch: Partial<OrderDraft>) => {
    setOrders((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const submitBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const payloadOrders = orders
      .map(orderToPayload)
      .filter((p) => p.originalUrl && p.productDescription);
    if (payloadOrders.length === 0) {
      toast.error("Preencha link e descrição em pelo menos um pedido.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/admin/users/bootstrap"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: userEmail.trim().toLowerCase(),
          ...(userPassword.trim().length >= 6
            ? { password: userPassword.trim() }
            : {}),
          name: userName.trim(),
          customerCpf: userCpf,
          customerWhatsapp: userWa,
          cep: userCep,
          addressStreet: userStreet.trim(),
          addressNumber: userNumber.trim(),
          addressComplement: userCompl.trim() || undefined,
          addressNeighborhood: userNeigh.trim() || undefined,
          addressCity: userCity.trim(),
          addressState: userState.trim(),
          orders: payloadOrders,
        }),
      });
      let data: Record<string, unknown> = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        data = {};
      }
      if (res.status === 409 && data.userId) {
        toast.error(
          `E-mail já existe. ID do usuário: ${String(data.userId)}. Use a aba “Pedido extra”.`,
        );
        setExtraUserId(String(data.userId));
        setTab("extra");
        return;
      }
      if (!res.ok) {
        console.warn("[bootstrap]", res.status, data);
        toast.error(
          messageFromApiError(data, res, "Resposta inválida do servidor."),
        );
        return;
      }
      const u = data.user as { id?: string; email?: string } | undefined;
      const tp =
        typeof data.temporaryPassword === "string"
          ? data.temporaryPassword
          : undefined;
      const oids = Array.isArray(data.orderIds)
        ? (data.orderIds as string[])
        : [];
      setLastResult({
        temporaryPassword: tp,
        userId: u?.id ?? "",
        email: u?.email ?? "",
        orderIds: oids,
      });
      setExtraUserId(u?.id ?? "");
      toast.success("Cliente e pedidos criados.");
      if (tp) {
        toast.message("Copie a senha provisória exibida abaixo.", {
          duration: 8000,
        });
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSubmitting(false);
    }
  };

  const submitExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !extraUserId.trim()) {
      toast.error("Informe o ID do usuário.");
      return;
    }
    const p = orderToPayload(extraOrder);
    if (!p.originalUrl || !p.productDescription) {
      toast.error("Link e descrição do produto são obrigatórios.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/users/${encodeURIComponent(extraUserId.trim())}/orders`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(p),
        },
      );
      let data: Record<string, unknown> = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        data = {};
      }
      if (!res.ok) {
        console.warn("[order extra]", res.status, data);
        toast.error(
          messageFromApiError(data, res, "Resposta inválida do servidor."),
        );
        return;
      }
      toast.success(`Pedido criado: ${String(data.id ?? "")}`);
      setExtraOrder(emptyOrder());
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-md">
          <div className="rounded-xl border border-border bg-card p-6">
            <h1 className="text-lg font-heading font-bold text-foreground flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-china-red" />
              Admin — cliente e pedidos
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              Mesma senha do painel admin.
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                placeholder="Senha admin"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError("");
                }}
                className={inputClass}
                autoFocus
                disabled={loginLoading}
              />
              {loginError && (
                <p className="text-sm text-red-600">{loginError}</p>
              )}
              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-china-red hover:bg-china-red/90"
              >
                {loginLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Painel admin
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="text-xl font-heading font-bold flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-china-red" />
            Cliente + pedidos retroativos
          </h1>
          <Link
            to="/admin"
            className="text-xs text-china-red font-medium hover:underline ml-auto"
          >
            Voltar ao painel
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Cria conta com e-mail verificado (cliente pode entrar em{" "}
          <strong>Meus pedidos</strong>). Não dispara Telegram nem e-mail
          automático. Use para recuperar pedidos perdidos no sistema.
        </p>

        <div className="flex gap-2 mb-6 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setTab("bootstrap")}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              tab === "bootstrap"
                ? "bg-china-red text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Novo cliente + pedido(s)
          </button>
          <button
            type="button"
            onClick={() => setTab("extra")}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              tab === "extra"
                ? "bg-china-red text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Só pedido (usuário já existe)
          </button>
        </div>

        {lastResult && (
          <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm space-y-2">
            <p className="font-semibold text-foreground">Último envio OK</p>
            <p>
              <span className="text-muted-foreground">User ID:</span>{" "}
              <code className="text-xs bg-muted px-1 rounded">{lastResult.userId}</code>
            </p>
            <p>
              <span className="text-muted-foreground">E-mail:</span>{" "}
              {lastResult.email}
            </p>
            {lastResult.temporaryPassword && (
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                Senha provisória (guarde — não repetimos):{" "}
                <code className="bg-muted px-1 rounded select-all">
                  {lastResult.temporaryPassword}
                </code>
              </p>
            )}
            <p className="text-muted-foreground">
              Pedidos: {lastResult.orderIds.join(", ")}
            </p>
          </div>
        )}

        {tab === "bootstrap" ? (
          <form onSubmit={submitBootstrap} className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Package className="w-4 h-4" /> Dados do cliente
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  className={inputClass}
                  placeholder="E-mail *"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  placeholder="Senha (opcional, mín. 6 — senão geramos)"
                  type="text"
                  autoComplete="off"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                />
                <input
                  className={`${inputClass} sm:col-span-2`}
                  placeholder="Nome completo *"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  placeholder="CPF *"
                  value={userCpf}
                  onChange={(e) => setUserCpf(e.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  placeholder="WhatsApp *"
                  value={userWa}
                  onChange={(e) => setUserWa(e.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  placeholder="CEP *"
                  value={userCep}
                  onChange={(e) => setUserCep(e.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  placeholder="Rua *"
                  value={userStreet}
                  onChange={(e) => setUserStreet(e.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  placeholder="Número *"
                  value={userNumber}
                  onChange={(e) => setUserNumber(e.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  placeholder="Complemento"
                  value={userCompl}
                  onChange={(e) => setUserCompl(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Bairro"
                  value={userNeigh}
                  onChange={(e) => setUserNeigh(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Cidade *"
                  value={userCity}
                  onChange={(e) => setUserCity(e.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  placeholder="UF *"
                  value={userState}
                  onChange={(e) => setUserState(e.target.value)}
                  required
                />
              </div>
            </section>

            {orders.map((row, i) => (
              <section
                key={i}
                className="space-y-3 rounded-xl border border-border p-4 bg-card/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold">Pedido {i + 1}</h2>
                  {orders.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setOrders((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-xs text-red-600 flex items-center gap-1 hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remover
                    </button>
                  )}
                </div>
                <input
                  className={inputClass}
                  placeholder="Link do produto (Weidian/CSSBuy…) *"
                  value={row.originalUrl}
                  onChange={(e) =>
                    updateOrder(i, { originalUrl: e.target.value })
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Título curto (opcional)"
                  value={row.productTitle}
                  onChange={(e) =>
                    updateOrder(i, { productTitle: e.target.value })
                  }
                />
                <textarea
                  className={`${inputClass} min-h-[80px]`}
                  placeholder="Descrição / texto do pedido (obrigatório) — ex.: colar bloco COMPRASCHINA → CSSBuy"
                  value={row.productDescription}
                  onChange={(e) =>
                    updateOrder(i, { productDescription: e.target.value })
                  }
                />
                <textarea
                  className={`${inputClass} min-h-[60px]`}
                  placeholder="Notas (cor, tamanho, variante)"
                  value={row.notes}
                  onChange={(e) => updateOrder(i, { notes: e.target.value })}
                />
                <div className="grid sm:grid-cols-3 gap-3">
                  <input
                    className={inputClass}
                    placeholder="Cor"
                    value={row.productColor}
                    onChange={(e) =>
                      updateOrder(i, { productColor: e.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Tamanho(s)"
                    value={row.productSize}
                    onChange={(e) =>
                      updateOrder(i, { productSize: e.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Variação"
                    value={row.productVariation}
                    onChange={(e) =>
                      updateOrder(i, { productVariation: e.target.value })
                    }
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    placeholder="Quantidade *"
                    value={row.quantity}
                    onChange={(e) =>
                      updateOrder(i, { quantity: e.target.value })
                    }
                  />
                  <select
                    className={inputClass}
                    value={row.status}
                    onChange={(e) =>
                      updateOrder(i, { status: e.target.value })
                    }
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass}
                    placeholder="Total R$ cotação (opcional)"
                    value={row.quoteTotalBrl}
                    onChange={(e) =>
                      updateOrder(i, { quoteTotalBrl: e.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Data ISO (opcional) ex. 2025-03-01T15:00:00Z"
                    value={row.createdAt}
                    onChange={(e) =>
                      updateOrder(i, { createdAt: e.target.value })
                    }
                  />
                  <input
                    className={`${inputClass} sm:col-span-2`}
                    placeholder="ID pedido CSSBuy (opcional)"
                    value={row.cssbuyOrderId}
                    onChange={(e) =>
                      updateOrder(i, { cssbuyOrderId: e.target.value })
                    }
                  />
                  <input
                    className={`${inputClass} sm:col-span-2`}
                    placeholder="Notas internas (só admin)"
                    value={row.internalNotes}
                    onChange={(e) =>
                      updateOrder(i, { internalNotes: e.target.value })
                    }
                  />
                </div>
              </section>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOrders((prev) => [...prev, emptyOrder()])}
                className="gap-1"
              >
                <Plus className="w-4 h-4" /> Outro pedido (mesmo cliente)
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-china-red hover:bg-china-red/90"
              >
                {submitting ? "Salvando…" : "Criar cliente e pedidos"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitExtra} className="space-y-4">
            <input
              className={inputClass}
              placeholder="ID do usuário (cuid) *"
              value={extraUserId}
              onChange={(e) => setExtraUserId(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use o ID retornado após criar o cliente, ou copie de Admin →
              resgate / banco.
            </p>

            <section className="space-y-3 rounded-xl border border-border p-4 bg-card/50">
              <input
                className={inputClass}
                placeholder="Link do produto *"
                value={extraOrder.originalUrl}
                onChange={(e) =>
                  setExtraOrder((o) => ({ ...o, originalUrl: e.target.value }))
                }
              />
              <input
                className={inputClass}
                placeholder="Título curto"
                value={extraOrder.productTitle}
                onChange={(e) =>
                  setExtraOrder((o) => ({ ...o, productTitle: e.target.value }))
                }
              />
              <textarea
                className={`${inputClass} min-h-[80px]`}
                placeholder="Descrição *"
                value={extraOrder.productDescription}
                onChange={(e) =>
                  setExtraOrder((o) => ({
                    ...o,
                    productDescription: e.target.value,
                  }))
                }
              />
              <textarea
                className={`${inputClass} min-h-[50px]`}
                placeholder="Notas"
                value={extraOrder.notes}
                onChange={(e) =>
                  setExtraOrder((o) => ({ ...o, notes: e.target.value }))
                }
              />
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  className={inputClass}
                  placeholder="Cor"
                  value={extraOrder.productColor}
                  onChange={(e) =>
                    setExtraOrder((o) => ({ ...o, productColor: e.target.value }))
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Tamanho"
                  value={extraOrder.productSize}
                  onChange={(e) =>
                    setExtraOrder((o) => ({ ...o, productSize: e.target.value }))
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Variação"
                  value={extraOrder.productVariation}
                  onChange={(e) =>
                    setExtraOrder((o) => ({
                      ...o,
                      productVariation: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  placeholder="Qtd"
                  value={extraOrder.quantity}
                  onChange={(e) =>
                    setExtraOrder((o) => ({ ...o, quantity: e.target.value }))
                  }
                />
                <select
                  className={inputClass}
                  value={extraOrder.status}
                  onChange={(e) =>
                    setExtraOrder((o) => ({ ...o, status: e.target.value }))
                  }
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <Button
              type="submit"
              disabled={submitting}
              className="bg-china-red hover:bg-china-red/90"
            >
              {submitting ? "Salvando…" : "Adicionar pedido ao usuário"}
            </Button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminClientePedido;
