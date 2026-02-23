import { Apple, Smartphone } from "lucide-react";
import appMockup from "@/assets/app-mockup.png";

const MobileAppSection = () => {
  return (
    <section className="py-20 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12 max-w-5xl mx-auto">
          <div className="lg:w-1/2 flex justify-center">
            <img src={appMockup} alt="Aplicativo ComprasChina" className="w-72 lg:w-80 drop-shadow-2xl" />
          </div>

          <div className="lg:w-1/2 text-center lg:text-left">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">Aplicativo Móvel</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
              Faça tudo no conforto da palma da sua mão
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Usar o aplicativo permite que você receba notificações de pedidos e pacotes em tempo real. Use seu celular diretamente para fotografar os produtos e visualizar uma grande variedade de itens.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a
                href="#"
                className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <Apple className="w-5 h-5" />
                Baixar para iOS
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
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
