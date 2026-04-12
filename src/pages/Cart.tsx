import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, Trash2, Package, Truck } from "lucide-react";
import {
  calcCartShipping,
  detectCategory,
  categorySupportsKeepBox,
  itemWeightG,
} from "@/lib/shipping";
import { getDisplayPriceBrl } from "@/lib/pricing";
import { QuantityStepper } from "@/components/QuantityStepper";

const Cart = () => {
  const { items, removeItem, updateQuantity, updateKeepBox } = useCart();

  const totalBrl = items.reduce(
    (acc, i) =>
      acc + (getDisplayPriceBrl(i.priceCny, i.priceBrl) ?? 0) * i.quantity,
    0,
  );

  // Build shipping estimate from current cart items
  const shippingItems = items.map((i) => {
    const cat = i.category ?? detectCategory(i.titlePt ?? i.title);
    return {
      category: cat,
      weightG: i.weightG,
      keepBox: i.keepBox ?? false,
      quantity: i.quantity,
    };
  });
  const shipping = calcCartShipping(shippingItems);
  const grandTotal = totalBrl > 0 ? totalBrl + shipping.totalBrl : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-xl font-heading font-bold text-foreground mb-2">
          Seu carrinho
        </h1>
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
            {items.map((item) => {
              const cat =
                item.category ?? detectCategory(item.titlePt ?? item.title);
              const supportsKeepBox = categorySupportsKeepBox(cat);
              const keepBox = item.keepBox ?? false;
              const weightPerUnit = itemWeightG(cat, item.weightG, keepBox);
              const totalWeightForItem = weightPerUnit * item.quantity;

              return (
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
                          {[item.color, item.size, item.variation]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                          Nota: {item.notes}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-china-red mt-1">
                        {item.priceBrl != null
                          ? `R$ ${(item.priceBrl * item.quantity).toFixed(2)}`
                          : item.priceCny != null
                            ? `R$ ${((getDisplayPriceBrl(item.priceCny, item.priceBrl) ?? 0) * item.quantity).toFixed(2)}`
                            : "—"}
                      </p>

                      {/* Weight badge */}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Package className="w-3 h-3 shrink-0" />~
                        {totalWeightForItem >= 1000
                          ? `${(totalWeightForItem / 1000).toFixed(2)} kg`
                          : `${totalWeightForItem} g`}
                        {item.quantity > 1 &&
                          ` (${item.quantity} × ${weightPerUnit}g)`}
                      </p>

                      {/* keepBox toggle — only for bulky-box categories */}
                      {supportsKeepBox && (
                        <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={keepBox}
                            onChange={(e) =>
                              updateKeepBox(item.id, e.target.checked)
                            }
                            className="rounded border-border w-4 h-4 accent-china-red"
                          />
                          <span className="text-xs text-muted-foreground">
                            Manter embalagem original
                            <span className="ml-1 text-muted-foreground/60">
                              (+peso volumétrico)
                            </span>
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t border-border pt-3 sm:border-0 sm:pt-0">
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(n) => updateQuantity(item.id, n)}
                      min={1}
                      max={99}
                      ariaLabel={`Quantidade — ${item.titlePt ?? item.title}`}
                    />
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
              );
            })}

            {/* Shipping breakdown card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Frete
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
                <span>Frete</span>
                <span className="text-foreground">
                  R$ {shipping.totalBrl.toFixed(2)}
                </span>
              </div>
              {totalBrl > 0 && (
                <div className="flex justify-between text-sm font-bold text-china-red pt-1 border-t border-border">
                  <span>
                    Total ({items.reduce((a, i) => a + i.quantity, 0)}{" "}
                    {items.reduce((a, i) => a + i.quantity, 0) === 1
                      ? "item"
                      : "itens"}
                    )
                  </span>
                  <span>R$ {grandTotal.toFixed(2)}</span>
                </div>
              )}
              {totalBrl === 0 && (
                <p className="text-xs text-muted-foreground pt-1">
                  Valores em BRL serão calculados no checkout com base na
                  cotação do dia.
                </p>
              )}
              <p className="text-xs text-muted-foreground pt-2 flex items-start gap-2">
                <span className="text-china-red mt-0.5 shrink-0">💡</span>
                <span>
                  <strong>Dica:</strong> Juntar mais itens no pedido dilui o
                  frete por unidade.
                </span>
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
