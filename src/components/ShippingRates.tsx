import { useState } from "react";
import { Calculator, Plane, Ship, Zap } from "lucide-react";

const regions = [
  {
    label: "ENVIO PARA BR",
    flag: "🇧🇷",
    method: "FJ-BR-EXP",
    icon: Zap,
    weight: "(0-3KG)",
    firstWeight: "CN¥50 / 100G",
    additionalWeight: "CN¥10.5 / 100G",
    deliveryTime: "12-30 dias",
  },
  {
    label: "ENVIO PARA EUA",
    flag: "🇺🇸",
    method: "HZ-FEDEX-F",
    icon: Plane,
    weight: "(0-20kg)",
    firstWeight: "CN¥235 / 500G",
    additionalWeight: "CN¥55 / 500G",
    deliveryTime: "5-10 dias",
  },
  {
    label: "ENVIO PARA EUR",
    flag: "🇪🇺",
    method: "YW-CNLine-F",
    icon: Ship,
    weight: "(5-25KG)",
    firstWeight: "CN¥35 / 100G",
    additionalWeight: "CN¥6.5 / 100G",
    deliveryTime: "12-20 dias",
  },
];

const ShippingRates = () => {
  const [activeTab, setActiveTab] = useState(0);
  const region = regions[activeTab];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-gold uppercase tracking-widest">Logística</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2 mb-3">
            Envio Rápido e Seguro
          </h2>
          <p className="text-muted-foreground text-lg mb-6">
            Estime sua taxa de envio internacional com antecedência
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-china-red to-gold text-white px-6 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-opacity shadow-md"
          >
            <Calculator className="w-4 h-4" />
            Calculadora de Custos
          </a>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center gap-2 mb-6">
            {regions.map((r, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                  activeTab === i
                    ? "bg-china-red text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {r.flag} {r.label}
              </button>
            ))}
          </div>

          <div className="bg-background border border-border rounded-2xl p-8 shadow-card">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-china-red to-gold flex items-center justify-center shadow-md">
                  <region.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-foreground text-xl">{region.method}</h4>
                  <span className="text-sm text-muted-foreground">{region.weight}</span>
                </div>
              </div>
              <span className="text-4xl">{region.flag}</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-5 bg-muted rounded-2xl">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Peso Inicial</p>
                <p className="font-bold text-china-red">{region.firstWeight}</p>
              </div>
              <div className="text-center p-5 bg-muted rounded-2xl">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Peso Adicional</p>
                <p className="font-bold text-china-red">{region.additionalWeight}</p>
              </div>
              <div className="text-center p-5 bg-muted rounded-2xl">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Prazo de Entrega</p>
                <p className="font-bold text-foreground">{region.deliveryTime}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShippingRates;
