import { Search, Shield, Headphones, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { looksLikeUrl } from "@/lib/urlValidation";

const trustBadges = [
  { icon: Shield, label: "Compra Segura" },
  { icon: Headphones, label: "Suporte em Português" },
  { icon: Package, label: "Envio Direto ao Brasil" },
];

const FULL_PLACEHOLDER = "Cole o link do produto (Taobao, 1688, Weidian...) ou pesquise";
const SHORT_PLACEHOLDER = "Link do produto ou pesquise...";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholder, setPlaceholder] = useState(FULL_PLACEHOLDER);
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => setPlaceholder(window.innerWidth >= 400 ? FULL_PLACEHOLDER : SHORT_PLACEHOLDER);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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
      className="relative min-h-[420px] sm:min-h-[480px] md:min-h-[540px] flex items-center justify-center overflow-hidden"
    >
      <img
        src={heroBg}
        alt="Produtos do mercado chinês"
        className="absolute inset-0 w-full h-full object-cover scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-china-red/30" />

      <div className="relative z-10 text-center px-3 sm:px-4 max-w-3xl mx-auto py-16">
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

        <div className="relative w-full max-w-xl sm:max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="w-full flex items-center bg-white rounded-full overflow-hidden shadow-2xl ring-2 ring-white/20">
            <div className="flex items-center flex-1 min-w-0 pl-3 sm:pl-5 pr-1 py-2 sm:py-0 sm:h-14">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0 mr-2" />
              <input
                type="text"
                placeholder={placeholder}
                className="flex-1 min-w-0 h-11 sm:h-14 bg-transparent text-sm sm:text-base text-gray-800 placeholder:text-gray-400 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="touch-target shrink-0 bg-china-red hover:bg-china-red/90 text-white h-11 sm:h-14 px-4 sm:px-6 py-2.5 sm:py-3 mr-1.5 sm:mr-2 text-sm sm:text-base font-bold transition-colors rounded-full"
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
