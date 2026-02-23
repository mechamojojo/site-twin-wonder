import { Search, Camera, TrendingUp, Shield, Truck } from "lucide-react";
import { useState } from "react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <section className="relative min-h-[420px] flex items-center justify-center overflow-hidden">
      <img src={heroBg} alt="Produtos do mercado chinês" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-hero-overlay" />

      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in-up">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-primary-foreground leading-tight mb-3">
          Compre da China com facilidade, do Brasil 🇧🇷
        </h1>
        <p className="text-primary-foreground/80 text-sm md:text-base mb-8 max-w-lg mx-auto">
          Somos um serviço brasileiro que facilita suas compras nos maiores marketplaces chineses. Atendimento em português e envio direto para o Brasil.
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-1.5 bg-primary-foreground/15 backdrop-blur-sm rounded-full px-3 py-1.5 text-primary-foreground text-xs font-medium">
            <Shield className="w-3.5 h-3.5" /> Compra Segura
          </div>
          <div className="flex items-center gap-1.5 bg-primary-foreground/15 backdrop-blur-sm rounded-full px-3 py-1.5 text-primary-foreground text-xs font-medium">
            <Truck className="w-3.5 h-3.5" /> Envio Garantido
          </div>
          <div className="flex items-center gap-1.5 bg-primary-foreground/15 backdrop-blur-sm rounded-full px-3 py-1.5 text-primary-foreground text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> +1M Produtos
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
