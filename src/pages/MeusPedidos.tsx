import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/lib/api";
import { getAuthToken } from "@/context/AuthContext";
import {
  orderStatusBadgeClass,
  orderStatusLabel,
} from "@/lib/orderStatus";
import { Package, ArrowRight, AlertCircle } from "lucide-react";

type Order = {
  id: string;
  productDescription: string;
  productTitle: string | null;
  status: string;
  createdAt: string;
  quote?: { totalBrl: string };
  shipment?: { trackingCode: string | null };
};

const MeusPedidos = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/entrar", { replace: true });
      return;
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    setLoadError(null);

    fetch(apiUrl("/api/auth/me/orders"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (r.status === 401) {
          logout();
          navigate("/entrar", { replace: true });
          return null;
        }
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Não foi possível carregar seus pedidos.",
          );
        }
        return data;
      })
      .then((data) => {
        if (data == null) return;
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => {
        setOrders([]);
        setLoadError(
          err instanceof Error ? err.message : "Erro ao carregar pedidos.",
        );
      })
      .finally(() => setLoading(false));
  }, [user, logout, navigate]);

  if (authLoading) {
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-xl font-heading font-bold text-foreground mb-2">
          Meus pedidos
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Olá, {user.name.split(" ")[0]}! Acompanhe o status das suas compras.
          Pedidos feitos com o e-mail{" "}
          <strong className="text-foreground">{user.email}</strong> aparecem
          aqui.
        </p>

        {loadError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4 flex gap-3 text-sm text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{loadError}</p>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Carregando pedidos...</p>
        ) : orders.length === 0 && !loadError ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">
              Nenhum pedido encontrado nesta conta.
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
              Se você já comprou, use o mesmo e-mail do checkout nesta conta.
              Ao abrir esta página, pedidos anteriores com esse e-mail são
              vinculados automaticamente.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-china-red text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-china-red/90"
            >
              Fazer compra
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/pedido-confirmado/${o.id}`}
                  className="block rounded-xl border border-border bg-card p-4 hover:border-china-red/40 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground line-clamp-2">
                        {o.productTitle || o.productDescription}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pedido #{o.id.slice(-8).toUpperCase()} ·{" "}
                        {new Date(o.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        {o.quote &&
                          ` · R$ ${Number(o.quote.totalBrl).toFixed(2)}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${orderStatusBadgeClass(o.status)}`}
                    >
                      {orderStatusLabel(o.status)}
                    </span>
                  </div>
                  {o.status === "AGUARDANDO_PAGAMENTO" && o.quote && (
                    <p className="text-xs text-china-red mt-2 font-medium">
                      Toque para pagar ou ver detalhes →
                    </p>
                  )}
                  {o.shipment?.trackingCode && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Rastreio:{" "}
                      <span className="font-medium text-foreground">
                        {o.shipment.trackingCode}
                      </span>
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MeusPedidos;
