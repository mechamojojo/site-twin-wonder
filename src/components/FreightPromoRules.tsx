import {
  FRETE_PROMO_COUPON_CODE,
  FRETE_PROMO_FREIGHT_DISCOUNT_CAP_BRL,
  FRETE_PROMO_SUBTOTAL_MIN_BRL,
} from "@/lib/shipping";

type FreightPromoRulesProps = {
  /** "sm" = texto menor (carrinho); "xs" = ainda menor */
  size?: "sm" | "xs";
  className?: string;
  /** Âncora para links do tipo /carrinho#id */
  id?: string;
};

/**
 * Texto curto + detalhes expansíveis sobre a promoção de frete (≥ R$ 1.000).
 */
export function FreightPromoRulesLink({
  size = "sm",
  className = "",
  id,
}: FreightPromoRulesProps) {
  const textCls =
    size === "xs" ? "text-[11px] leading-snug" : "text-xs leading-relaxed";
  return (
    <details
      id={id}
      className={`group rounded-lg border border-border/80 bg-muted/30 px-3 py-2 ${className}`}
    >
      <summary
        className={`cursor-pointer list-none font-medium text-foreground/90 hover:text-china-red ${textCls} [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2`}
      >
        <span>
          Cupom{" "}
          <strong className="font-mono text-foreground">
            {FRETE_PROMO_COUPON_CODE}
          </strong>
          : frete grátis em compras acima de R${" "}
          {FRETE_PROMO_SUBTOTAL_MIN_BRL.toLocaleString("pt-BR")} (até R${" "}
          {FRETE_PROMO_FREIGHT_DISCOUNT_CAP_BRL} no frete) — ver regras
        </span>
        <span className="text-muted-foreground shrink-0 group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>
      <div
        className={`mt-2 pt-2 border-t border-border/60 text-muted-foreground ${textCls} space-y-2`}
      >
        <p>
          Aplique o cupom{" "}
          <strong className="text-foreground font-mono">
            {FRETE_PROMO_COUPON_CODE}
          </strong>{" "}
          no carrinho ou no checkout. Com{" "}
          <strong className="text-foreground">
            produtos acima de R${" "}
            {FRETE_PROMO_SUBTOTAL_MIN_BRL.toLocaleString("pt-BR")}
          </strong>
          , aplicamos{" "}
          <strong className="text-foreground">
            até R${" "}
            {FRETE_PROMO_FREIGHT_DISCOUNT_CAP_BRL.toLocaleString("pt-BR")} de
            desconto no frete estimado
          </strong>{" "}
          — na prática, frete grátis na maior parte dos envios. Se o frete
          calculado for maior que R${" "}
          {FRETE_PROMO_FREIGHT_DISCOUNT_CAP_BRL.toLocaleString("pt-BR")}, o
          excedente continua sendo cobrado.
        </p>
        <p>
          O frete exibido é uma{" "}
          <strong className="text-foreground">estimativa</strong> repassada dos
          custos de transporte internacional; em casos de valor muito alto,
          entre em contato com o time — podemos analisar alternativas para
          reduzir o custo.
        </p>
      </div>
    </details>
  );
}
