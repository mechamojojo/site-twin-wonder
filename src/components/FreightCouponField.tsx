import { useState } from "react";
import { useCart } from "@/context/CartContext";
import {
  FRETE_PROMO_COUPON_CODE,
  FRETE_PROMO_SUBTOTAL_MIN_BRL,
  isFreightPromoCouponCode,
  isRedditProductPromoCouponCode,
} from "@/lib/shipping";
import { Input } from "@/components/ui/input";
import { Tag, X } from "lucide-react";
import { toast } from "sonner";

type FreightCouponFieldProps = {
  /** Subtotal de produtos (para mensagem “falta R$ …”) — valor bruto, sem desconto secreto */
  productSubtotalBrl: number;
  compact?: boolean;
  className?: string;
};

/**
 * Cupom de frete (COMPRASCHINA) e cupom secreto de desconto em produtos (entrada no mesmo campo).
 */
export function FreightCouponField({
  productSubtotalBrl,
  compact = false,
  className = "",
}: FreightCouponFieldProps) {
  const {
    freightCouponCode,
    setFreightCouponCode,
    clearFreightCoupon,
    redditProductPromo10,
    setRedditProductPromo10,
    clearRedditProductPromo,
  } = useCart();
  const [draft, setDraft] = useState("");

  const freightApplied = freightCouponCode.length > 0;

  const apply = () => {
    const normalized = draft.trim();
    if (!normalized) {
      toast.error("Digite o cupom.");
      return;
    }
    if (isRedditProductPromoCouponCode(normalized)) {
      setRedditProductPromo10(true);
      setDraft("");
      toast.success("Desconto de 10% nos produtos aplicado.");
      return;
    }
    if (!isFreightPromoCouponCode(normalized)) {
      toast.error("Cupom inválido.");
      return;
    }
    setFreightCouponCode(normalized);
    setDraft("");
    toast.success(`Cupom ${FRETE_PROMO_COUPON_CODE} aplicado.`);
  };

  const hasAny = freightApplied || redditProductPromo10;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className={compact ? "text-[11px] font-medium" : "text-xs font-medium"}>
          Cupom
        </span>
      </div>
      {redditProductPromo10 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-green-600/30 bg-green-50/80 dark:bg-green-950/20 px-3 py-2">
          <p className="text-xs font-medium text-green-800 dark:text-green-300">
            Desconto de 10% nos produtos aplicado
          </p>
          <button
            type="button"
            onClick={() => {
              clearRedditProductPromo();
              toast.message("Desconto removido.");
            }}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Remover desconto em produtos"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {freightApplied && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-green-600/30 bg-green-50/80 dark:bg-green-950/20 px-3 py-2">
          <p className="text-xs font-medium text-green-800 dark:text-green-300">
            <span className="font-mono">{freightCouponCode}</span> aplicado
            {productSubtotalBrl > 0 &&
              productSubtotalBrl < FRETE_PROMO_SUBTOTAL_MIN_BRL && (
                <span className="block font-normal text-green-700/90 dark:text-green-400/90 mt-0.5">
                  Frete grátis ao atingir R${" "}
                  {FRETE_PROMO_SUBTOTAL_MIN_BRL.toLocaleString("pt-BR")} em
                  produtos.
                </span>
              )}
          </p>
          <button
            type="button"
            onClick={() => {
              clearFreightCoupon();
              toast.message("Cupom removido.");
            }}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Remover cupom de frete"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {!hasAny ? (
        <div className={`flex gap-2 ${compact ? "flex-col sm:flex-row" : ""}`}>
          <Input
            placeholder={FRETE_PROMO_COUPON_CODE}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())}
            className={compact ? "h-9 text-sm font-mono uppercase" : "font-mono uppercase"}
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={apply}
            className="shrink-0 px-4 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
          >
            Aplicar
          </button>
        </div>
      ) : (
        <div className={`flex gap-2 ${compact ? "flex-col sm:flex-row" : ""}`}>
          <Input
            placeholder="Outro cupom"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())}
            className={compact ? "h-9 text-sm font-mono" : "font-mono"}
            spellCheck={false}
          />
          <button
            type="button"
            onClick={apply}
            className="shrink-0 px-4 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
