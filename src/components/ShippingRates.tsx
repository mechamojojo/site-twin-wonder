import { useState } from "react";
import { Calculator } from "lucide-react";

const regions = [
  {
    label: "SHIPS TO USA",
    flag: "🇺🇸",
    method: "HZ-FEDEX-F",
    weight: "(0-20kg)",
    firstWeight: "CN¥235 / 500G",
    additionalWeight: "CN¥55 / 500G",
    deliveryTime: "5-10 days",
  },
  {
    label: "SHIPS TO BR",
    flag: "🇧🇷",
    method: "FJ-BR-EXP",
    weight: "(0-3KG)",
    firstWeight: "CN¥50 / 100G",
    additionalWeight: "CN¥10.5 / 100G",
    deliveryTime: "12-30 days",
  },
  {
    label: "SHIPS TO EUR",
    flag: "🇪🇺",
    method: "YW-CNLine-F",
    weight: "(5-25KG)",
    firstWeight: "CN¥35 / 100G",
    additionalWeight: "CN¥6.5 / 100G",
    deliveryTime: "12-20 days",
  },
];

const ShippingRates = () => {
  const [activeTab, setActiveTab] = useState(0);
  const region = regions[activeTab];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-4">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
            We Provide The Most Efficient Logistics Services!
          </h2>
          <p className="text-muted-foreground text-lg mb-6">
            Estimate your international shipping fee ahead of time
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Calculator className="w-4 h-4" />
            Cost Calculator
          </a>
        </div>

        <div className="max-w-2xl mx-auto mt-10">
          <p className="text-center text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">
            Shipping Rates
          </p>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-6">
            {regions.map((r, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {r.flag} {r.label}
              </button>
            ))}
          </div>

          {/* Card */}
          <div className="bg-background border border-border rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-heading font-bold text-foreground text-lg">{region.method}</h4>
                <span className="text-sm text-muted-foreground">{region.weight}</span>
              </div>
              <span className="text-3xl">{region.flag}</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">First Weight</p>
                <p className="font-bold text-primary text-sm">{region.firstWeight}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Additional Weight</p>
                <p className="font-bold text-primary text-sm">{region.additionalWeight}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Delivery Time</p>
                <p className="font-bold text-foreground text-sm">{region.deliveryTime}</p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a href="#" className="text-primary font-medium text-sm hover:underline">
                View Details →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShippingRates;
