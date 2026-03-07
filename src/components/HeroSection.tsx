import { Search, CreditCard, PackageCheck, Headphones, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { looksLikeUrl } from "@/lib/urlValidation";

const trustBadges = [
  { icon: CreditCard,   label: "PIX, Cartão e Boleto" },
  { icon: PackageCheck, label: "Inspeção antes do envio" },
  { icon: Headphones,   label: "Suporte em Português" },
];

const flowSteps = [
  "Cole o link",
  "Veja o preço em reais",
  "Pague e confirme",
  "Receba em casa",
];

const FULL_PLACEHOLDER = "Cole o link do produto (Taobao, 1688, Weidian...) ou pesquise";
const SHORT_PLACEHOLDER = "Link ou busque por nome...";

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
      className="relative min-h-[420px] sm:min-h-[480px] md:min-h-[560px] flex items-center justify-center overflow-hidden"
    >
      <img
        src={heroBg}
        alt="Produtos importados da China"
        className="absolute inset-0 w-full h-full object-cover scale-105"
      />
      {/* Overlay duplo: base escuro + gradiente direcional */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />

      <div className="relative z-10 text-center px-3 sm:px-4 max-w-3xl mx-auto py-16">
        <div className="inline-block mb-5">
          <span className="bg-china-red/90 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
            🇧🇷 Pagamento em Reais · Entrega no Brasil
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-white leading-tight mb-4">
          <span className="whitespace-nowrap">Tudo que a <span className="text-gold">China</span> oferece,</span>
          <br />
          entregue na sua porta
        </h1>
        <p className="text-white/90 text-base md:text-lg mb-6 max-w-xl mx-auto leading-relaxed drop-shadow-sm">
          Taobao, 1688, Weidian, TMALL e muito mais — sem cartão internacional, sem conta no exterior, sem burocracia.
        </p>

        {/* Search bar */}
        <div className="relative w-full max-w-xl sm:max-w-2xl mx-auto mb-4">
          <div className="w-full flex items-center bg-white rounded-2xl overflow-hidden shadow-lg shadow-black/25 border border-gray-200/80 focus-within:ring-2 focus-within:ring-china-red/30 focus-within:border-china-red/50 transition-shadow">
            <label className="flex items-center flex-1 min-w-0 pl-4 sm:pl-5 pr-2 py-3 sm:py-4 cursor-text">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0 mr-3" aria-hidden />
              <input
                type="text"
                placeholder={placeholder}
                className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-gray-800 placeholder:text-gray-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </label>
            <button
              type="button"
              onClick={handleSearch}
              className="shrink-0 self-stretch bg-china-red hover:bg-china-red/90 active:scale-[0.98] text-white min-h-[44px] px-4 sm:px-5 py-3 text-sm font-semibold transition-all rounded-r-2xl m-1 mr-2"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Micro-flow */}
        <div className="flex items-center justify-center flex-wrap gap-0 mb-5">
          {flowSteps.map((step, i) => (
            <div key={i} className="flex items-center">
              <span className="text-white/90 text-xs font-semibold px-1 py-0.5 drop-shadow">{step}</span>
              {i < flowSteps.length - 1 && (
                <ArrowRight className="w-3 h-3 text-white/50 mx-0.5 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Secondary path */}
        <p className="text-white/70 text-xs mb-7 drop-shadow">
          Não tem o link?{" "}
          <Link to="/explorar" className="text-gold font-semibold hover:underline">
            Explore o que outros brasileiros já compraram →
          </Link>
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-5">
          {trustBadges.map((badge, i) => (
            <div key={i} className="flex items-center gap-2 text-white/95">
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
