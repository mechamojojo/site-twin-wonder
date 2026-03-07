import { MessageCircle, Mail, Clock, Users } from "lucide-react";
import { whatsAppUrl, CONTACT_EMAIL } from "@/data/siteConfig";

const channels = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Fale direto com nossa equipe. Resposta em até 2 horas nos dias úteis.",
    cta: "Abrir conversa",
    href: whatsAppUrl("Olá! Tenho uma dúvida sobre compras da China."),
    external: true,
    accent: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Mail,
    title: "E-mail",
    description: "Para dúvidas detalhadas, documentação de pedidos ou suporte pós-compra.",
    cta: "Enviar e-mail",
    href: `mailto:${CONTACT_EMAIL}`,
    external: true,
    accent: "from-china-red to-china-red/70",
  },
];

const stats = [
  { icon: Clock, value: "< 2h", label: "Tempo médio de resposta" },
  { icon: Users, value: "100%", label: "Atendimento em português" },
];

const MobileAppSection = () => (
  <section id="contato" className="py-20 bg-section-alt">
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-china-red uppercase tracking-widest">Atendimento</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2 mb-3">
            Alguma dúvida? A gente resolve.
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Suporte 100% em português — antes, durante e depois da compra.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {channels.map((c, i) => (
            <div
              key={i}
              className="bg-background rounded-2xl border border-border shadow-card p-7 flex flex-col hover:shadow-card-hover transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.accent} flex items-center justify-center mb-4 shadow-md`}>
                <c.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-heading font-bold text-foreground text-lg mb-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{c.description}</p>
              <a
                href={c.href}
                target={c.external ? "_blank" : undefined}
                rel={c.external ? "noreferrer" : undefined}
                className="inline-block mt-5 bg-foreground text-background text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity text-center"
              >
                {c.cta} →
              </a>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          {stats.map((s, i) => (
            <div key={i} className="bg-background border border-border rounded-2xl p-5 text-center shadow-card">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-china-red/10 to-gold/10 flex items-center justify-center mx-auto mb-2">
                <s.icon className="w-5 h-5 text-china-red" />
              </div>
              <p className="font-heading font-extrabold text-xl text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default MobileAppSection;
