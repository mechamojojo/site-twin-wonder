import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiUrl } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MercadoPagoBadge from "@/components/MercadoPagoBadge";

type OrderResponse = {
  id: string;
  originalUrl: string;
  productDescription: string;
  quantity: number;
  cep: string;
  shippingMethod: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerWhatsapp: string | null;
  status: string;
  quote?: { totalBrl: string };
  shipment?: { trackingCode: string | null; carrier: string | null } | null;
};

const isPaid = (status: string) => status === "PAGO";

const OrderConfirmed = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(apiUrl(`/api/orders/${id}`));
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Não foi possível carregar o pedido.");
        }
        const data = await res.json();
        setOrder(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar o pedido.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {loading && (
          <p className="text-sm text-muted-foreground">Carregando informações do seu pedido...</p>
        )}

        {!loading && error && (
          <div className="space-y-4">
            <p className="text-sm text-red-600">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-china-red text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-china-red/90 transition-colors"
            >
              Voltar para a página inicial
            </Link>
          </div>
        )}

        {!loading && order && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-xl font-heading font-bold text-foreground">
                Pedido recebido!
              </h1>
              <p className="text-sm text-muted-foreground">
                {order.status === "AGUARDANDO_PAGAMENTO" && order.quote
                  ? "Pague agora com PIX ou cartão. O valor inclui produto, frete e taxa."
                  : "Recebemos seu pedido. Se o valor estiver pronto, pague abaixo. Caso contrário, entraremos em contato."}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3 text-sm">
              <h2 className="font-heading font-semibold text-foreground text-base">
                Resumo do pedido
              </h2>
              <div className="space-y-1">
                <p><span className="text-muted-foreground">ID do pedido:</span> {order.id}</p>
                <p className="break-all">
                  <span className="text-muted-foreground">Link do produto:</span>{" "}
                  <a
                    href={order.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-china-red hover:underline"
                  >
                    {order.originalUrl}
                  </a>
                </p>
                <p>
                  <span className="text-muted-foreground">Descrição / variação:</span>{" "}
                  {order.productDescription}
                </p>
                <p>
                  <span className="text-muted-foreground">Quantidade:</span>{" "}
                  {order.quantity}
                </p>
                <p>
                  <span className="text-muted-foreground">CEP:</span>{" "}
                  {order.cep}
                </p>
                {order.shippingMethod && (
                  <p>
                    <span className="text-muted-foreground">Método de envio escolhido:</span>{" "}
                    {order.shippingMethod}
                  </p>
                )}
              </div>
            </div>

            {order.shipment?.trackingCode && (
              <div className="rounded-2xl border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-2">
                <h2 className="font-heading font-semibold text-foreground text-base">
                  Rastrear pedido
                </h2>
                <p className="text-sm text-muted-foreground">
                  Seu pedido foi enviado. Acompanhe a entrega:
                </p>
                <a
                  href={`https://t.17track.net/pt#nums=${encodeURIComponent(order.shipment.trackingCode)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-china-red text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-china-red/90 transition-colors"
                >
                  Rastrear {order.shipment.trackingCode}
                </a>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3 text-sm">
              <h2 className="font-heading font-semibold text-foreground text-base">
                Seus dados de contato
              </h2>
              <div className="space-y-1">
                {order.customerName && (
                  <p>
                    <span className="text-muted-foreground">Nome:</span>{" "}
                    {order.customerName}
                  </p>
                )}
                {order.customerEmail && (
                  <p>
                    <span className="text-muted-foreground">E-mail:</span>{" "}
                    {order.customerEmail}
                  </p>
                )}
                {order.customerWhatsapp && (
                  <p>
                    <span className="text-muted-foreground">WhatsApp:</span>{" "}
                    {order.customerWhatsapp}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Usaremos esses dados apenas para falar sobre este pedido (envio do orçamento final em reais, pagamento
                e atualizações de envio).
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              {isPaid(order.status) ? (
                <p>
                  Pagamento confirmado! Cuidamos de tudo: compra na China, envio e entrega no seu endereço. Você não precisa fazer nada.
                </p>
              ) : (
                <p>
                  Após o pagamento, cuidamos de tudo: compra na China, envio e entrega no seu endereço.
                </p>
              )}
              {order.status === "AGUARDANDO_PAGAMENTO" && order.quote && Number(order.quote.totalBrl) > 0 && (
                <div className="flex flex-col items-start gap-2">
                  <Link
                    to={`/pagar/${order.id}`}
                    className="inline-flex items-center gap-2 bg-china-red text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-china-red/90 transition-colors"
                  >
                    Pagar agora — R$ {Number(order.quote.totalBrl).toFixed(2)}
                  </Link>
                  <MercadoPagoBadge size="sm" showLabel />
                </div>
              )}
              <Link
                to="/"
                className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-full text-xs font-medium hover:bg-muted transition-colors ml-2"
              >
                Fazer outro pedido
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OrderConfirmed;

