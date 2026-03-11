import { useState } from "react";
import { Calculator } from "lucide-react";
import { calcCartShipping, detectCategory, type ProductCategory } from "@/lib/shipping";

type Option = { label: string; example: string; category: ProductCategory };

const OPTIONS: Option[] = [
  { label: "Roupa / Camiseta",     example: "ex: camiseta, calça, shorts",         category: "clothing"     },
  { label: "Tênis / Calçado",      example: "ex: tênis, sandália, bota",           category: "shoes"        },
  { label: "Jaqueta / Casaco",     example: "ex: jaqueta, moletom, parka",         category: "jacket"       },
  { label: "Mochila",              example: "ex: mochila, backpack",               category: "backpack"    },
  { label: "Bolsa / Carteira",     example: "ex: bolsa, carteira, clutch",         category: "bag"          },
  { label: "Eletrônico",           example: "ex: fone, relógio, câmera",           category: "electronics"  },
  { label: "Acessório",            example: "ex: pulseira, óculos, cinto",         category: "accessory"    },
];

export default function FreightEstimator() {
  const [catIndex, setCatIndex] = useState(0);
  const [qty, setQty] = useState(1);

  const category = OPTIONS[catIndex].category;
  const result = calcCartShipping([{ category, quantity: qty }]);

  const totalBrl = result.totalBrl;

  // Tier description based on weight
  const weightKg = (result.totalWeightG / 1000).toFixed(2);

  return (
    <div className="bg-background border border-border rounded-2xl p-6 shadow-card max-w-md w-full">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-china-red to-gold flex items-center justify-center shrink-0">
          <Calculator className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-foreground text-sm">Simule o frete</h3>
          <p className="text-[11px] text-muted-foreground">Estimativa baseada em pesos médios por categoria</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Product type */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Tipo de produto</label>
          <select
            value={catIndex}
            onChange={(e) => setCatIndex(Number(e.target.value))}
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-china-red/30"
          >
            {OPTIONS.map((o, i) => (
              <option key={i} value={i}>{o.label} — {o.example}</option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Quantidade de itens</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-foreground hover:border-china-red/40 transition-colors font-bold"
            >
              −
            </button>
            <span className="text-lg font-bold text-foreground w-6 text-center">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(q => Math.min(10, q + 1))}
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-foreground hover:border-china-red/40 transition-colors font-bold"
            >
              +
            </button>
            <span className="text-xs text-muted-foreground ml-1">peso estimado: ~{weightKg} kg</span>
          </div>
        </div>

        {/* Result */}
        <div className="bg-muted/40 rounded-xl p-4 space-y-2 border border-border/60">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frete China → Brasil</span>
            <span className="font-semibold text-foreground">R$ {result.chinaFreightBrl.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entrega no Brasil</span>
            <span className="font-semibold text-foreground">R$ {result.domesticBrl.toFixed(2)}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between items-center">
            <span className="text-sm font-bold text-foreground">Frete estimado total</span>
            <span className="text-lg font-extrabold text-china-red">R$ {totalBrl.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          * Estimativa baseada em pesos médios por categoria. O valor exato aparece no carrinho antes do pagamento.
          Quanto mais itens no mesmo pedido, menor o custo por unidade.
        </p>
      </div>
    </div>
  );
}
