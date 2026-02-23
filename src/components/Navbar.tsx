import { Search, ShoppingCart, User, ChevronDown, Globe, Camera, Menu } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <div className="flex flex-col items-start shrink-0">
          <span className="text-2xl font-heading font-extrabold">
            <span className="text-china-red">Compras</span>
            <span className="text-gold">China</span>
          </span>
          <span className="text-[10px] text-muted-foreground -mt-1">Powered by CSSBuy</span>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-xl mx-6">
          <div className="relative w-full flex items-center bg-muted rounded-full border border-border overflow-hidden hover:border-china-red/30 transition-colors">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cole o link do produto ou pesquise por palavras-chave"
              className="w-full py-2.5 pl-10 pr-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="absolute right-2 p-1.5 rounded-full hover:bg-accent transition-colors">
              <Camera className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Nav Links */}
        <div className="hidden lg:flex items-center gap-5 text-sm font-medium text-foreground">
          <button className="flex items-center gap-1 hover:text-china-red transition-colors">
            Serviços <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1 hover:text-china-red transition-colors">
            Recursos <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1 hover:text-china-red transition-colors">
            Empresa <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-4">
          <button className="hidden sm:flex items-center gap-1.5 text-xs border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-colors">
            <Globe className="w-3.5 h-3.5" />
            PT-BR
          </button>
          <button className="relative p-2 rounded-full hover:bg-muted transition-colors text-foreground">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-china-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              0
            </span>
          </button>
          <a
            href="#"
            className="hidden sm:inline-flex bg-china-red text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-china-red/90 transition-colors"
          >
            Entrar
          </a>
          <button className="lg:hidden p-2 rounded-full hover:bg-muted transition-colors text-foreground">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
