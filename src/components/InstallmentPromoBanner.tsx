import { CreditCard, Sparkles } from "lucide-react";
import { MP_MAX_INSTALLMENTS } from "@/lib/mercadopagoInstallments";

/**
 * Destaque de parcelamento no cartão — alinhado ao teto `MP_MAX_INSTALLMENTS` / backend.
 */
export function InstallmentPromoBanner() {
  return (
    <div
      className="relative mb-6 sm:mb-8 overflow-hidden rounded-2xl border border-china-red/20 bg-gradient-to-br from-china-red/[0.07] via-card to-emerald-600/[0.06] shadow-sm"
      role="status"
      aria-label={`Parcelamento no cartão em até ${MP_MAX_INSTALLMENTS} vezes sem juros`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-china-red/[0.08] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-emerald-500/[0.07] blur-xl" />

      <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <div className="flex shrink-0 items-center justify-center self-start rounded-full bg-china-red/10 p-2.5 text-china-red ring-1 ring-china-red/15 sm:self-center">
          <CreditCard className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-heading text-base font-bold tracking-tight text-foreground sm:text-lg">
            Até {MP_MAX_INSTALLMENTS}x sem juros no cartão
          </p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            Você parcela o valor total sem acréscimo — pague com tranquilidade e receba do mesmo jeito.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-china-red shadow-sm backdrop-blur-sm sm:self-center sm:shrink-0">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="whitespace-nowrap">Vantagem na finalização</span>
        </div>
      </div>
    </div>
  );
}
