import { Link } from "react-router-dom";
import { Clock, PackageCheck, Star, MessageCircle } from "lucide-react";

const stats = [
  { icon: Clock,        value: "24h",   label: "Processamento do pedido" },
  { icon: PackageCheck, value: "100%",  label: "Pedidos rastreados" },
  { icon: Star,         value: "4.8",   label: "Avaliação média" },
  { icon: MessageCircle,value: "PT-BR", label: "Suporte em português" },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-20 bg-section-alt">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <span className="text-xs font-bold text-china-red uppercase tracking-widest">Por que a ComprasChina?</span>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2 mb-4">
                Acesso direto ao maior mercado de produtos do mundo
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A China concentra as maiores fábricas do planeta. Com a ComprasChina, você compra diretamente da fonte — moda, eletrônicos, acessórios, casa e muito mais — com preço em reais e entrega no seu CEP.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Sem precisar de conta em site chinês, sem cartão internacional e sem dor de cabeça com o idioma. Nós cuidamos de tudo: compra, inspeção de qualidade, embalagem e envio.
              </p>
              <Link
                to="/servicos"
                className="inline-flex items-center gap-2 bg-china-red text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-china-red/90 transition-colors shadow-md"
              >
                Como funciona →
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
