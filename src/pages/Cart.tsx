import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, Trash2 } from "lucide-react";

const Cart = () => {
  const { items, removeItem, updateQuantity } = useCart();

  const totalBrl = items.reduce((acc, i) => acc + (i.priceBrl ?? 0) * i.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-xl font-heading font-bold text-foreground mb-2">Seu carrinho</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {items.length === 0
            ? "Adicione produtos pela página inicial ou pela página do produto."
            : "Revise os itens abaixo e finalize seu pedido."}
        </p>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhum item no carrinho</p>
            <Link
              to="/"
              className="mt-4 inline-flex gap-2 bg-china-red text-white px-5 py-2.5 rounded-full text-sm font-heading font-bold hover:bg-china-red/90 transition-colors"
            >
              Ir para a página inicial
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex gap-4 flex-1 min-w-0">
                <Link
                  to={`/pedido?url=${encodeURIComponent(item.url)}`}
                  className="shrink-0 w-20 h-20 sm:w-20 sm:h-20 rounded-lg border border-border bg-muted overflow-hidden"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      —
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/pedido?url=${encodeURIComponent(item.url)}`}
                    className="font-medium text-foreground hover:text-china-red line-clamp-2 text-sm"
                  >
                    {item.titlePt || item.title || "Produto"}
                  </Link>
                  {(item.color || item.size || item.variation) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[item.color, item.size, item.variation].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">Nota: {item.notes}</p>
                  )}
                  <p className="text-sm font-semibold text-china-red mt-1">
                    {item.priceBrl != null
                      ? `R$ ${(item.priceBrl * item.quantity).toFixed(2)}`
                      : item.priceCny != null
                        ? `CNY ¥ ${(item.priceCny * item.quantity).toFixed(2)}`
                        : "—"}
                  </p>
                </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t border-border pt-3 sm:border-0 sm:pt-0">
                  <div className="flex items-center rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center bg-background hover:bg-muted text-sm font-bold"
                    >
                      −
                    </button>
                    <span className="min-w-[44px] min-h-[44px] flex items-center justify-center text-sm font-semibold border-x border-border">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center bg-background hover:bg-muted text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="touch-target min-w-[44px] min-h-[44px] p-2 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    aria-label="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Total ({items.reduce((a, i) => a + i.quantity, 0)} {items.reduce((a, i) => a + i.quantity, 0) === 1 ? "item" : "itens"})
              </p>
              <p className="text-lg font-heading font-bold text-china-red">
                {totalBrl > 0 ? `R$ ${totalBrl.toFixed(2)}` : "Calcule o frete no checkout"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/"
                className="touch-target inline-flex items-center justify-center gap-2 border border-border px-4 py-3 min-h-[48px] rounded-full text-sm font-medium hover:bg-muted transition-colors"
              >
                Continuar comprando
              </Link>
              <Link
                to="/checkout"
                className="touch-target inline-flex items-center justify-center gap-2 bg-china-red text-white px-5 py-3 min-h-[48px] rounded-full text-sm font-heading font-bold hover:bg-china-red/90 transition-colors"
              >
                Finalizar pedido
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
