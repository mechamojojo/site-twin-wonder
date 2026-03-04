import { Search, Shield, Headphones, Package } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { looksLikeUrl } from "@/lib/urlValidation";

const trustBadges = [
  { icon: Shield, label: "Compra Segura" },
  { icon: Headphones, label: "Suporte em Português" },
  { icon: Package, label: "Envio Direto ao Brasil" },
];

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    if (looksLikeUrl(trimmed)) {
      navigate(`/pedido?url=${encodeURIComponent(trimmed)}`);
    } else {
      navigate(`/explorar?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-[540px] flex items-center justify-center overflow-hidden"
    >
      <img
        src={heroBg}
        alt="Produtos do mercado chinês"
        className="absolute inset-0 w-full h-full object-cover scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-china-red/30" />

      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto py-16">
        <div className="inline-block mb-6">
          <span className="bg-china-red/90 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
            🇧🇷 Serviço 100% Brasileiro
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-white leading-tight mb-4">
          Compre da <span className="text-gold">China</span> com facilidade,{" "}
          <span className="text-china-red-light">do Brasil</span>
        </h1>
        <p className="text-white/75 text-base md:text-lg mb-6 max-w-xl mx-auto leading-relaxed">
          Acesse os maiores marketplaces chineses — Taobao, 1688, Weidian, TMALL
          — com atendimento em português e envio direto para o Brasil.
        </p>
        <p className="text-white/90 text-sm md:text-base mb-4 font-medium">
          Informe o link do produto ou pesquise por palavras-chave.
        </p>

        <div className="relative max-w-xl sm:max-w-2xl mx-auto flex items-center mb-10">
          <div className="w-full flex items-center bg-white rounded-full overflow-hidden shadow-2xl ring-2 ring-white/20">
            <Search className="ml-5 w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Cole o link do produto (Taobao, 1688, Weidian...) ou pesquise"
              className="flex-1 h-14 px-4 bg-transparent text-base text-gray-800 placeholder:text-gray-400 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              onClick={handleSearch}
              className="bg-china-red hover:bg-china-red/90 text-white px-6 py-3 rounded-full mr-2 text-base font-bold transition-colors"
            >
              Buscar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {trustBadges.map((badge, i) => (
            <div key={i} className="flex items-center gap-2 text-white/80">
              <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <badge.icon className="w-4 h-4 text-gold" />
              </div>
              <span className="text-sm font-medium">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
