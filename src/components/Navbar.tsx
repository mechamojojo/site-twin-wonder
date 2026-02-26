import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, ChevronDown, Menu, User, LogOut } from "lucide-react";
import { useState } from "react";
import { looksLikeUrl } from "@/lib/urlValidation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { user, logout } = useAuth();

  const navLinks = [
    { to: "/explorar", label: "Explorar" },
    { to: "/servicos", label: "Serviços" },
    { to: "/#how-it-works", label: "Recursos" },
    { to: "/#about", label: "Empresa" },
  ];

  const handleLogoClick = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    if (looksLikeUrl(trimmed)) {
      navigate(`/pedido?url=${encodeURIComponent(trimmed)}`);
    } else {
      navigate(`/explorar?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo - sempre leva ao início */}
        <Link
          to="/"
          onClick={handleLogoClick}
          className="flex flex-col items-start shrink-0 hover:opacity-90 transition-opacity"
          aria-label="Voltar ao início - ComprasChina"
        >
          <span className="text-2xl font-heading font-extrabold">
            <span className="text-china-red">Compras</span>
            <span className="text-gold">China</span>
          </span>
          <span className="text-[10px] text-muted-foreground -mt-1">Powered by CSSBuy</span>
        </Link>

        {/* Search Bar - sempre visível; leva a /pedido?url=... (igual à hero) */}
        <div className="flex items-center flex-1 min-w-0 max-w-xl mx-2 sm:mx-4 md:mx-6">
          <form onSubmit={handleSearch} className="w-full flex items-center gap-1 bg-muted rounded-full border border-border overflow-hidden hover:border-china-red/30 transition-colors pl-2 sm:pl-3 pr-1 py-1">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
            <input
              type="text"
              placeholder="Link ou palavras-chave"
              className="flex-1 min-w-0 py-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="shrink-0 bg-china-red hover:bg-china-red/90 text-white px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>

        {/* Nav Links */}
        <div className="hidden lg:flex items-center gap-5 text-sm font-medium text-foreground">
          <Link to="/#explorar" className="flex items-center gap-1 hover:text-china-red transition-colors">
            Explorar
          </Link>
          <Link to="/servicos" className="flex items-center gap-1 hover:text-china-red transition-colors">
            Serviços <ChevronDown className="w-3.5 h-3.5" />
          </Link>
          <Link to="/#how-it-works" className="flex items-center gap-1 hover:text-china-red transition-colors">
            Recursos <ChevronDown className="w-3.5 h-3.5" />
          </Link>
          <Link to="/#about" className="flex items-center gap-1 hover:text-china-red transition-colors">
            Empresa <ChevronDown className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-4">
          <Link
            to="/carrinho"
            className="relative p-2 rounded-full hover:bg-muted transition-colors text-foreground"
            aria-label="Ir para o carrinho"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 bg-china-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          )}
          </Link>
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/meus-pedidos"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-china-red"
              >
                <User className="w-4 h-4" />
                {user.name.split(" ")[0]}
              </Link>
              <button
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/cadastro"
                className="hidden sm:inline-flex border border-border px-4 py-2 rounded-full text-xs font-bold hover:bg-muted"
              >
                Criar conta
              </Link>
              <Link
                to="/entrar"
                className="hidden sm:inline-flex bg-china-red text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-china-red/90 transition-colors"
              >
                Entrar
              </Link>
            </>
          )}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden p-2 rounded-full hover:bg-muted transition-colors text-foreground" aria-label="Abrir menu">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="text-foreground font-medium hover:text-china-red transition-colors py-2"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/carrinho"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center gap-2 text-foreground font-medium hover:text-china-red transition-colors py-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Carrinho {totalItems > 0 && `(${totalItems})`}
                </Link>
                {user && (
                  <Link
                    to="/meus-pedidos"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center gap-2 text-foreground font-medium hover:text-china-red transition-colors py-2"
                  >
                    <User className="w-4 h-4" />
                    Meus pedidos
                  </Link>
                )}
                {user && (
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="inline-flex items-center gap-2 text-foreground font-medium hover:text-china-red transition-colors py-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                )}
                {!user && (
                  <>
                    <Link to="/cadastro" onClick={() => setMobileOpen(false)} className="text-foreground font-medium hover:text-china-red py-2">
                      Criar conta
                    </Link>
                    <Link to="/entrar" onClick={() => setMobileOpen(false)} className="text-foreground font-medium hover:text-china-red py-2">
                      Entrar
                    </Link>
                  </>
                )}
                <Link
                  to="/checkout"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex justify-center bg-china-red text-white px-4 py-2.5 rounded-full text-sm font-bold hover:bg-china-red/90 mt-4"
                >
                  Finalizar pedido
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
