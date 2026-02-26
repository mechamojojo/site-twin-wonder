import { Zap, Truck, Ship } from "lucide-react";

const methods = [
  {
    method: "FJ-BR-EXP",
    icon: Zap,
    weight: "0-3KG",
    firstWeight: "CN¥50 / 100G",
    additionalWeight: "CN¥10.5 / 100G",
    deliveryTime: "12-30 dias",
    tag: "Mais Popular",
  },
  {
    method: "BR-EMS",
    icon: Truck,
    weight: "0-20KG",
    firstWeight: "CN¥80 / 500G",
    additionalWeight: "CN¥25 / 500G",
    deliveryTime: "15-40 dias",
    tag: "Econômico",
  },
  {
    method: "BR-SEA",
    icon: Ship,
    weight: "5-30KG",
    firstWeight: "CN¥120 / 1KG",
    additionalWeight: "CN¥18 / 1KG",
    deliveryTime: "40-60 dias",
    tag: "Marítimo",
  },
];

const ShippingRates = () => {
  return (
    <section id="shipping" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-gold uppercase tracking-widest">Logística</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2 mb-3">
            Envio Direto para o Brasil 🇧🇷
          </h2>
          <p className="text-muted-foreground text-lg mb-6">
            Diversas opções de frete da China para o Brasil com rastreamento completo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {methods.map((m, i) => (
            <div
              key={i}
              className={`relative bg-background border rounded-2xl p-7 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 ${
                i === 0 ? "border-china-red/40 ring-1 ring-china-red/20" : "border-border"
              }`}
            >
              {m.tag && (
                <span className={`absolute -top-3 left-6 text-xs font-bold px-3 py-1 rounded-full ${
                  i === 0
                    ? "bg-china-red text-white"
                    : "bg-gold/20 text-gold"
                }`}>
                  {m.tag}
                </span>
              )}
              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-china-red to-gold flex items-center justify-center shadow-md">
                  <m.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-foreground text-lg">{m.method}</h4>
                  <span className="text-xs text-muted-foreground">{m.weight}</span>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Peso Inicial</span>
                  <span className="font-bold text-china-red">{m.firstWeight}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Peso Adicional</span>
                  <span className="font-bold text-china-red">{m.additionalWeight}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Prazo</span>
                  <span className="font-bold text-foreground">{m.deliveryTime}</span>
                </div>
              </div>

              <a href="#" className="block text-center text-sm text-china-red font-semibold hover:underline">
                Ver detalhes →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShippingRates;
