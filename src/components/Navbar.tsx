import { Search, ShoppingCart, User, ChevronDown, Globe, Camera, Bell } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <nav className="sticky top-0 z-50">
      {/* Top bar - Shopee style gradient */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto flex items-center justify-between h-10 px-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="opacity-80">Baixe o App</span>
            <span className="opacity-60">|</span>
            <span className="opacity-80">Acompanhe seu Pedido</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <button className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
              <Globe className="w-3.5 h-3.5" />
              Português - BRL (R$)
            </button>
            <button className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
              <Bell className="w-3.5 h-3.5" />
              Notificações
            </button>
            <span className="opacity-60">|</span>
            <button className="opacity-80 hover:opacity-100 transition-opacity font-semibold">Cadastrar</button>
            <button className="opacity-80 hover:opacity-100 transition-opacity font-semibold">Entrar</button>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="bg-primary pb-3 pt-1">
        <div className="container mx-auto flex items-center justify-between px-4 gap-4">
          {/* Logo */}
          <div className="flex flex-col items-start shrink-0">
            <span className="text-2xl font-heading font-extrabold text-primary-foreground tracking-tight">
              Compras<span className="font-black">China</span>
            </span>
            <span className="text-[10px] text-primary-foreground/60 -mt-0.5">Powered by CSSBuy</span>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-xl">
            <div className="relative w-full flex items-center bg-background rounded-lg overflow-hidden">
              <input
                type="text"
                placeholder="Pesquise produtos, marcas ou cole um link..."
                className="w-full py-2.5 pl-4 pr-24 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-1 flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-muted transition-colors">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded text-sm font-semibold transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors text-primary-foreground relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 bg-background text-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
            </button>
          </div>
        </div>

        {/* Category links */}
        <div className="container mx-auto px-4 mt-2">
          <div className="hidden lg:flex items-center gap-5 text-xs text-primary-foreground/80">
            <a href="#" className="hover:text-primary-foreground transition-colors">Compre Por Mim</a>
            <a href="#" className="hover:text-primary-foreground transition-colors">Envie Por Mim</a>
            <a href="#" className="hover:text-primary-foreground transition-colors">Drop Shipping</a>
            <a href="#" className="hover:text-primary-foreground transition-colors">Calculadora de Frete</a>
            <a href="#" className="hover:text-primary-foreground transition-colors">Como Funciona</a>
            <a href="#" className="hover:text-primary-foreground transition-colors">Perguntas Frequentes</a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
