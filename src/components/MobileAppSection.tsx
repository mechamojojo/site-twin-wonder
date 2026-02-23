import { Apple, Smartphone, Check } from "lucide-react";
import appMockup from "@/assets/app-mockup.png";

const features = [
  "Notificações em tempo real",
  "Fotografe e pesquise produtos",
  "Acompanhe seus pedidos",
  "Chat com suporte em português",
];

const MobileAppSection = () => {
  return (
    <section className="py-20 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12 max-w-5xl mx-auto">
          <div className="lg:w-1/2 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-china-red/20 to-gold/20 rounded-3xl blur-2xl" />
              <img src={appMockup} alt="Aplicativo ComprasChina" className="relative w-72 lg:w-80 drop-shadow-2xl" />
            </div>
          </div>

          <div className="lg:w-1/2 text-center lg:text-left">
            <span className="text-xs font-bold text-gold uppercase tracking-widest">Aplicativo Móvel</span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2 mb-4">
              Compre da China na palma da sua mão
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Baixe nosso aplicativo e tenha acesso completo à plataforma pelo celular.
            </p>

            <ul className="space-y-3 mb-8">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-foreground justify-center lg:justify-start">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-china-red to-gold flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a
                href="#"
                className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
              >
                <Apple className="w-5 h-5" />
                Baixar para iOS
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 border-2 border-foreground text-foreground px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-foreground hover:text-background transition-colors"
              >
                <Smartphone className="w-5 h-5" />
                Baixar para Android
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileAppSection;
