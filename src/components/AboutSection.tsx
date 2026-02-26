import { Link } from "react-router-dom";
import { Users, Package, Star, Globe } from "lucide-react";

const stats = [
  { icon: Users, value: "1.2M+", label: "Clientes Atendidos" },
  { icon: Package, value: "5M+", label: "Pacotes Enviados" },
  { icon: Star, value: "4.8", label: "Avaliação Média" },
  { icon: Globe, value: "50+", label: "Países Atendidos" },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-20 bg-section-alt">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <span className="text-xs font-bold text-china-red uppercase tracking-widest">Sobre Nós</span>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2 mb-4">
                Seu serviço <span className="text-china-red">brasileiro</span> de compras da China
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A ComprasChina é um serviço brasileiro que utiliza a infraestrutura da CSSBuy para facilitar a compra de produtos nos maiores marketplaces chineses como Taobao, 1688, Weidian e TMALL.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Atendimento 100% em português, suporte dedicado e foco total no cliente brasileiro. Inspeção de qualidade, fotos de QC ilimitadas e embalagem profissional.
              </p>
              <Link
                to="/servicos"
                className="inline-flex items-center gap-2 bg-china-red text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-china-red/90 transition-colors shadow-md"
              >
                Conheça nosso serviço →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="bg-background rounded-2xl p-6 border border-border shadow-card text-center hover:shadow-card-hover transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-china-red/10 to-gold/10 flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="w-6 h-6 text-china-red" />
                  </div>
                  <p className="font-heading font-extrabold text-2xl text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
