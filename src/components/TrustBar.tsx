import { ShieldCheck, Clock, CreditCard, Lock } from "lucide-react";
import { CNPJ } from "@/data/siteConfig";

const signals = [
  {
    icon: ShieldCheck,
    label: "Empresa brasileira registrada",
    detail: CNPJ ? `CNPJ ${CNPJ}` : null,
  },
  {
    icon: Clock,
    label: "Atendimento em até 2h",
    detail: "Seg–Sex, 9h–18h",
  },
  {
    icon: CreditCard,
    label: "Pagamento seguro",
    detail: "Mercado Pago · PCI DSS",
  },
  {
    icon: Lock,
    label: "Dados protegidos",
    detail: "LGPD · HTTPS/TLS",
  },
];

const TrustBar = () => (
  <div className="bg-muted/50 border-y border-border py-4">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {signals.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
              <s.icon className="w-4 h-4 text-china-red" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground leading-tight">{s.label}</p>
              {s.detail && (
                <p className="text-[11px] text-muted-foreground truncate">{s.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default TrustBar;
