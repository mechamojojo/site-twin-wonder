import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.png";
import { looksLikeUrl } from "@/lib/urlValidation";

const FULL_PLACEHOLDER = "Cole o link do produto ou busque no catálogo...";
const SHORT_PLACEHOLDER = "Link ou busca...";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholder, setPlaceholder] = useState(FULL_PLACEHOLDER);
  const navigate = useNavigate();

  useEffect(() => {
    const update = () =>
      setPlaceholder(
        window.innerWidth >= 400 ? FULL_PLACEHOLDER : SHORT_PLACEHOLDER,
      );
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
        alt="Horizonte urbano moderno na China"
        className="absolute inset-0 w-full h-full object-cover scale-105"
      />
      {/* Overlay duplo: base escuro + gradiente direcional */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />

      <div className="relative z-10 text-center px-3 sm:px-4 max-w-3xl mx-auto py-16">
        <div className="inline-block mb-4">
          <span className="bg-china-red/90 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
            🇧🇷 Pague em reais · Entrega no Brasil
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-white leading-tight mb-4">
          <span className="whitespace-nowrap">
            Tudo que a <span className="text-gold">China</span> oferece,
          </span>
          <br />
          entregue na sua porta
        </h1>
        <p className="text-white/90 text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
          Ajudamos você a comprar da China com segurança. Cole o link do produto
          ou busque no catálogo.
        </p>

        {/* Search bar */}
        <div className="relative w-full max-w-xl sm:max-w-2xl mx-auto mb-4">
          <div className="w-full flex items-center bg-white rounded-2xl overflow-hidden shadow-lg shadow-black/25 border border-gray-200/80 focus-within:ring-2 focus-within:ring-china-red/30 focus-within:border-china-red/50 transition-shadow">
            <label className="flex items-center flex-1 min-w-0 pl-4 sm:pl-5 pr-2 py-3 sm:py-4 cursor-text">
              <Search
                className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0 mr-3"
                aria-hidden
              />
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
      </div>
    </section>
  );
};

export default HeroSection;
