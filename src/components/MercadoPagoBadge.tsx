/**
 * Badge/logo do Mercado Pago para uso em checkout e áreas de pagamento.
 * Reforça legitimidade ao mostrar a tecnologia de pagamento utilizada.
 * Logo oficial: uso conforme orientações de branding do Mercado Pago.
 */
// Logo horizontal Mercado Pago (CDN oficial ML; fallback: texto no componente)
const MP_LOGO_URL =
  "https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/6.6.0/mercadopago/logo_mp_horizontal.svg";

type MercadoPagoBadgeProps = {
  /** Tamanho: 'sm' (compacto), 'md' (padrão), 'lg' (destaque) */
  size?: "sm" | "md" | "lg";
  /** Mostrar texto "Pagamento seguro" ao lado */
  showLabel?: boolean;
  /** Classe extra no container */
  className?: string;
};

const sizeClasses = {
  sm: "h-4 w-auto",
  md: "h-5 w-auto",
  lg: "h-6 w-auto",
};

export default function MercadoPagoBadge({ size = "md", showLabel = false, className = "" }: MercadoPagoBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title="Pagamento processado com Mercado Pago"
    >
      <img
        src={MP_LOGO_URL}
        alt="Mercado Pago"
        className={sizeClasses[size]}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
          if (fallback) fallback.hidden = false;
        }}
      />
      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap" hidden>
        Mercado Pago
      </span>
      {showLabel && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">Pagamento seguro</span>
      )}
    </span>
  );
}
