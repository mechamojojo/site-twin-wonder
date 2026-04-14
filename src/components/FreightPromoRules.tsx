import {
  FRETE_PROMO_FREIGHT_DISCOUNT_CAP_BRL,
  FRETE_PROMO_SUBTOTAL_MIN_BRL,
} from "@/lib/shipping";

type FreightPromoRulesProps = {
  /** "sm" = texto menor (carrinho); "xs" = ainda menor */
  size?: "sm" | "xs";
  className?: string;
};

/**
 * Texto curto + detalhes expansíveis sobre a promoção de frete (≥ R$ 1.000).
 */
export function FreightPromoRulesLink({
  size = "sm",
  className = "",
}: FreightPromoRulesProps) {
  const textCls =
    size === "xs" ? "text-[11px] leading-snug" : "text-xs leading-relaxed";
  return (
    <details
      className={`group rounded-lg border border-border/80 bg-muted/30 px-3 py-2 ${className}`}
    >
      <summary
        className={`cursor-pointer list-none font-medium text-foreground/90 hover:text-china-red ${textCls} [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2`}
      >
        <span>
          Frete grátis em compras acima de R${" "}
          {FRETE_PROMO_SUBTOTAL_MIN_BRL.toLocaleString("pt-BR")} (até R${" "}
          {FRETE_PROMO_FREIGHT_DISCOUNT_CAP_BRL} de desconto no frete) — ver
          regras
        </span>
        <span className="text-muted-foreground shrink-0 group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>
      <div
        className={`mt-2 pt-2 border-t border-border/60 text-muted-foreground ${textCls} space-y-2`}
      >
        <p>
          Para pedidos com <strong className="text-foreground">produtos acima
          de R$ {FRETE_PROMO_SUBTOTAL_MIN_BRL.toLocaleString("pt-BR")}</strong>,
          aplicamos <strong className="text-foreground">até R${" "}
          {FRETE_PROMO_FREIGHT_DISCOUNT_CAP_BRL.toLocaleString("pt-BR")} de
          desconto no frete estimado</strong> — na prática, o frete fica
          gratuito para a maior parte dos envios. Se o frete calculado for
          maior que R$ {FRETE_PROMO_FREIGHT_DISCOUNT_CAP_BRL.toLocaleString("pt-BR")}, o valor
          excedente continua sendo cobrado (você recebe os R${" "}
          {FRETE_PROMO_FREIGHT_DISCOUNT_CAP_BRL.toLocaleString("pt-BR")} de
          benefício).
        </p>
        <p>
          O frete exibido é uma <strong className="text-foreground">estimativa
          </strong> repassada dos custos de transporte internacional; em casos
          de valor muito alto, entre em contato com o time — podemos analisar
          alternativas para reduzir o custo.
        </p>
      </div>
    </details>
  );
}
