import { Check, TicketPercent } from "lucide-react";
import {
  FRETE_PROMO_COUPON_CODE,
  type FreightPromoResult,
} from "@/lib/shipping";

function brl(n: number) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type FreightPromoSummaryCardProps = {
  freightPromo: FreightPromoResult;
  couponCode?: string;
  dense?: boolean;
};

/**
 * Destaque visual para frete com cupom (referência: preço riscado + “Grátis” + ícone de cupom).
 */
export function FreightPromoSummaryCard({
  freightPromo,
  couponCode = FRETE_PROMO_COUPON_CODE,
  dense,
}: FreightPromoSummaryCardProps) {
  if (!freightPromo.qualifies) return null;

  const after = freightPromo.freightAfterPromoBrl;
  const isFullyFree = after <= 0;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 border-emerald-500/45 bg-gradient-to-br from-emerald-50/90 to-background dark:from-emerald-950/35 dark:to-card dark:border-emerald-600/45 ${
        dense ? "px-3 py-2.5" : "px-3 py-3 sm:px-4 sm:py-3.5"
      }`}
      role="status"
      aria-label={
        isFullyFree
          ? "Frete grátis com cupom aplicado"
          : `Frete com desconto do cupom: ${brl(after)} reais`
      }
    >
      {/* Selo “opção selecionada” — canto superior esquerdo */}
      <div
        className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-br-lg bg-emerald-600 text-white shadow-sm"
        aria-hidden
      >
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      </div>

      <div className="flex items-start justify-between gap-3 pl-7 sm:pl-8">
        <div className="min-w-0 space-y-0.5 pt-0.5">
          <p
            className={`font-semibold text-foreground leading-tight ${
              dense ? "text-xs" : "text-sm"
            }`}
          >
            Envio expresso (China → você)
          </p>
          <p
            className={`text-muted-foreground leading-snug ${
              dense ? "text-[10px]" : "text-xs"
            }`}
          >
            {isFullyFree
              ? `Frete estimado pago com o cupom ${couponCode}.`
              : `Desconto do cupom ${couponCode} aplicado ao frete estimado.`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 text-right">
          <span
            className={`line-through tabular-nums text-muted-foreground ${
              dense ? "text-xs" : "text-sm"
            }`}
          >
            R$ {brl(freightPromo.rawFreightBrl)}
          </span>
          {isFullyFree ? (
            <span
              className={`font-bold text-foreground ${
                dense ? "text-sm" : "text-base"
              }`}
            >
              Grátis
            </span>
          ) : (
            <span
              className={`font-bold tabular-nums text-china-red ${
                dense ? "text-sm" : "text-base"
              }`}
            >
              R$ {brl(after)}
            </span>
          )}
          <TicketPercent
            className={`shrink-0 text-emerald-600 dark:text-emerald-400 ${
              dense ? "h-4 w-4" : "h-5 w-5"
            }`}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
