import { TrendingDown, MapPin, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import FreightEstimator from "@/components/FreightEstimator";

const benefits = [
  {
    icon: Eye,
    title: "Veja o custo antes de pagar",
    description:
      "O valor exato do frete em reais aparece no carrinho antes de qualquer cobrança. Sem surpresa, sem taxa escondida.",
    highlight: null,
  },
  {
    icon: TrendingDown,
    title: "Quanto mais, menor o custo",
    description:
      "O frete é proporcional ao peso total. Agrupar produtos no mesmo pedido dilui o custo — vale juntar tudo numa encomenda só.",
    highlight: "Dica: junte itens e economize",
  },
  {
    icon: MapPin,
    title: "Rastreado do China ao seu CEP",
    description:
      "Código de rastreio assim que sai do armazém. Você acompanha cada etapa até a sua porta. Prazo médio: 15–30 dias.",
    highlight: "Entrega para todo o Brasil",
  },
];

const ShippingRates = () => {
  return (
    <section id="shipping" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-gold uppercase tracking-widest">Entrega</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2 mb-3">
            Da China direto na sua porta 🇧🇷
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Frete calculado automaticamente — você vê o valor em reais antes de pagar.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto items-start">
          {/* Benefits */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="flex gap-4 p-5 bg-background border border-border rounded-2xl shadow-card hover:shadow-card-hover transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-china-red to-gold flex items-center justify-center shrink-0 shadow-md">
                  <b.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-foreground text-sm mb-1">{b.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{b.description}</p>
                  {b.highlight && (
                    <p className="mt-2 text-xs font-semibold text-china-red">✓ {b.highlight}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Estimator */}
          <div className="w-full lg:w-auto lg:shrink-0">
            <FreightEstimator />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 max-w-lg mx-auto">
          Valor exato aparece no carrinho antes do pagamento.{" "}
          <Link to="/servicos" className="text-china-red hover:underline font-medium">
            Saiba mais sobre como funciona →
          </Link>
        </p>
      </div>
    </section>
  );
};

export default ShippingRates;
