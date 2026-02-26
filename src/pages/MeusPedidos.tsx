import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/lib/api";
import { getAuthToken } from "@/context/AuthContext";
import { Package, ArrowRight } from "lucide-react";

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
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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

    fetch(apiUrl("/api/auth/me/orders"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user]);

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
        <h1 className="text-xl font-heading font-bold text-foreground mb-2">Meus pedidos</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Olá, {user.name.split(" ")[0]}! Aqui estão seus pedidos.
        </p>

        {loading ? (
          <p className="text-muted-foreground">Carregando pedidos...</p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Você ainda não tem pedidos.</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-china-red text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-china-red/90"
            >
              Fazer primeira compra
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
                      <p className="font-medium text-foreground truncate">
                        {o.productTitle || o.productDescription}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pedido em {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                        {o.quote && ` · R$ ${Number(o.quote.totalBrl).toFixed(2)}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                        o.status === "PAGO" || o.status === "CONCLUIDO"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : o.status === "CANCELADO"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </div>
                  {o.shipment?.trackingCode && (
                    <p className="text-xs text-china-red mt-2 font-medium">
                      Rastreio: {o.shipment.trackingCode}
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
