import { Link } from "react-router-dom";
import {
  FRETE_PROMO_COUPON_CODE,
  FRETE_PROMO_FREIGHT_DISCOUNT_CAP_BRL,
  FRETE_PROMO_SUBTOTAL_MIN_BRL,
} from "@/lib/shipping";
import { Tag } from "lucide-react";

/**
 * Faixa promocional no topo da página inicial (cupom de frete).
 */
export default function FreightCouponBanner() {
  return (
    <div className="bg-gradient-to-r from-china-red/12 via-muted/60 to-china-red/10 border-b border-border/80">
      <div className="container mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-center sm:text-left">
        <span className="inline-flex items-center gap-1.5 text-china-red shrink-0">
          <Tag className="h-4 w-4" aria-hidden />
          <span className="font-mono text-sm font-bold tracking-wide">
            {FRETE_PROMO_COUPON_CODE}
          </span>
        </span>
        <p className="text-sm text-foreground leading-snug">
          Use o cupom <strong className="font-semibold">{FRETE_PROMO_COUPON_CODE}</strong>{" "}
          no carrinho para{" "}
          <strong className="font-semibold">frete grátis</strong> em compras acima de
          R$ {FRETE_PROMO_SUBTOTAL_MIN_BRL.toLocaleString("pt-BR")} (até R${" "}
          {FRETE_PROMO_FREIGHT_DISCOUNT_CAP_BRL} de desconto no frete estimado).
        </p>
        <Link
          to="/carrinho"
          className="shrink-0 text-sm font-semibold text-china-red hover:underline underline-offset-2"
        >
          Ir ao carrinho →
        </Link>
      </div>
    </div>
  );
}
