import { Mail, Clock, Users, MessagesSquare, Send } from "lucide-react";
import { CONTACT_EMAIL, TELEGRAM_URL, TELEGRAM_DISPLAY } from "@/data/siteConfig";

function openSupportChat() {
  window.dispatchEvent(new CustomEvent("compraschina:open-support-chat"));
}

const MobileAppSection = () => (
  <section id="contato" className="py-20 bg-section-alt">
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-china-red uppercase tracking-widest">
            Atendimento
          </span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2 mb-3">
            Alguma dúvida? A gente resolve.
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Suporte 100% em português — antes, durante e depois da compra. Use o
            chat no canto da tela, o Telegram ou o e-mail.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 max-w-5xl mx-auto">
          <div className="bg-background rounded-2xl border border-border shadow-card p-7 flex flex-col hover:shadow-card-hover transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center mb-4 shadow-md">
              <MessagesSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-lg mb-2">
              Fale com nossa equipe
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              O ícone de mensagem fica sempre no canto inferior direito: abra,
              escreva e acompanhe a conversa sem sair do site — igual aos chats
              que você já conhece.
            </p>
            <button
              type="button"
              onClick={openSupportChat}
              className="inline-block mt-5 bg-foreground text-background text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity text-center w-full sm:w-auto"
            >
              Abrir chat →
            </button>
          </div>

          <div className="bg-background rounded-2xl border border-border shadow-card p-7 flex flex-col hover:shadow-card-hover transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-china-red to-china-red/70 flex items-center justify-center mb-4 shadow-md">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-lg mb-2">
              E-mail
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              Para dúvidas detalhadas, documentação de pedidos ou suporte
              pós-compra.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-5 bg-foreground text-background text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity text-center"
            >
              Enviar e-mail →
            </a>
          </div>

          <div className="bg-background rounded-2xl border border-border shadow-card p-7 flex flex-col hover:shadow-card-hover transition-shadow sm:col-span-2 lg:col-span-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0088cc] to-[#229ED9] flex items-center justify-center mb-4 shadow-md">
              <Send className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-lg mb-2">
              Telegram
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              Entre no nosso canal no Telegram: novidades, dicas e contato com a
              comunidade.
            </p>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-5 bg-foreground text-background text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity text-center"
            >
              Abrir {TELEGRAM_DISPLAY} →
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          {[
            { icon: Clock, value: "< 2h", label: "Tempo médio de resposta" },
            { icon: Users, value: "100%", label: "Atendimento em português" },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-background border border-border rounded-2xl p-5 text-center shadow-card"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-china-red/10 to-gold/10 flex items-center justify-center mx-auto mb-2">
                <s.icon className="w-5 h-5 text-china-red" />
              </div>
              <p className="font-heading font-extrabold text-xl text-foreground">
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default MobileAppSection;
