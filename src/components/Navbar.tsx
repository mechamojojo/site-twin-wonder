import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  ChevronDown,
  Menu,
  User,
  LogOut,
  Heart,
  Package,
} from "lucide-react";
import { useState } from "react";
import { looksLikeUrl } from "@/lib/urlValidation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { user, logout, resendVerification } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);

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
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {user && user.emailVerified === false && (
        <div className="bg-amber-500/15 text-amber-800 dark:text-amber-200 text-xs py-2 px-4 flex items-center justify-center gap-2 flex-wrap">
          <span>Confirme seu e-mail para ativar sua conta.</span>
          <button
            type="button"
            onClick={async () => {
              setResendLoading(true);
              try {
                await resendVerification();
                toast.success("E-mail reenviado. Verifique sua caixa de entrada.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erro ao reenviar. Tente novamente.");
              } finally {
                setResendLoading(false);
              }
            }}
            disabled={resendLoading}
            className="underline font-medium hover:no-underline disabled:opacity-60"
          >
            {resendLoading ? "Enviando..." : "Reenviar e-mail"}
          </button>
        </div>
      )}
      <div className="container mx-auto px-4">
        {/* Primeira linha: logo + ações (mobile) ou logo + search + nav (desktop) */}
        <div className="flex items-center justify-between h-14 md:h-16 gap-2">
          <Link
            to="/"
            onClick={handleLogoClick}
            className="flex flex-col items-start shrink-0 hover:opacity-90 transition-opacity"
            aria-label="Voltar ao início - ComprasChina"
          >
            <span className="text-xl sm:text-2xl font-heading font-extrabold">
              <span className="text-china-red">Compras</span>
              <span className="text-gold">China</span>
            </span>
          </Link>

          {/* Search Bar - apenas em md+ na mesma linha */}
          <div className="hidden md:flex items-center flex-1 min-w-0 max-w-xl mx-4 lg:mx-6">
            <form
              onSubmit={handleSearch}
              className="w-full flex items-center gap-1 bg-muted rounded-full border border-border overflow-hidden hover:border-china-red/30 transition-colors pl-3 pr-1 py-1"
            >
              <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
              <input
                type="text"
                placeholder="Cole o link do produto (Taobao, 1688, Weidian...) ou pesquise"
                className="flex-1 min-w-0 py-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="touch-target shrink-0 bg-china-red hover:bg-china-red/90 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors"
              >
                Buscar
              </button>
            </form>
          </div>

          {/* Nav Links - desktop */}
        <div className="hidden lg:flex items-center gap-5 text-sm font-medium text-foreground">
          <Link
            to="/#explorar"
            className="flex items-center gap-1 hover:text-china-red transition-colors"
          >
            Explorar
          </Link>
          <Link
            to="/servicos"
            className="flex items-center gap-1 hover:text-china-red transition-colors"
          >
            Serviços <ChevronDown className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/#how-it-works"
            className="flex items-center gap-1 hover:text-china-red transition-colors"
          >
            Recursos <ChevronDown className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/#about"
            className="flex items-center gap-1 hover:text-china-red transition-colors"
          >
            Empresa <ChevronDown className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-4">
          <Link
            to="/carrinho"
            className="touch-target relative flex items-center justify-center p-2 rounded-full hover:bg-muted transition-colors text-foreground"
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
                to="/produtos-salvos"
                className="p-2 rounded-full hover:bg-muted transition-colors text-foreground"
                aria-label="Produtos salvos"
                title="Produtos salvos"
              >
                <Heart className="w-4 h-4" />
              </Link>
              <div className="relative group">
                <button className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-china-red px-1 py-1">
                  <User className="w-4 h-4" />
                  {user.name.split(" ")[0]}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
                <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-50">
                  <div className="bg-background border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                    <Link
                      to="/minha-conta"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      Minha conta
                    </Link>
                    <Link
                      to="/meus-pedidos"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Package className="w-3.5 h-3.5 text-muted-foreground" />
                      Meus pedidos
                    </Link>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => logout()}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sair
                    </button>
                  </div>
                </div>
              </div>
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
              <button
                className="touch-target lg:hidden flex items-center justify-center p-2 rounded-full hover:bg-muted transition-colors text-foreground"
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(85vw,320px)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 mt-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="touch-target flex items-center text-foreground font-medium hover:text-china-red transition-colors py-3 px-2 -mx-2 rounded-lg active:bg-muted/50"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/carrinho"
                  onClick={() => setMobileOpen(false)}
                  className="touch-target flex items-center gap-2 text-foreground font-medium hover:text-china-red transition-colors py-3 px-2 -mx-2 rounded-lg active:bg-muted/50"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Carrinho {totalItems > 0 && `(${totalItems})`}
                </Link>
                {user && (
                  <>
                    <Link
                      to="/minha-conta"
                      onClick={() => setMobileOpen(false)}
                      className="touch-target flex items-center gap-2 text-foreground font-medium hover:text-china-red transition-colors py-3 px-2 -mx-2 rounded-lg active:bg-muted/50"
                    >
                      <User className="w-4 h-4" />
                      Minha conta
                    </Link>
                    <Link
                      to="/produtos-salvos"
                      onClick={() => setMobileOpen(false)}
                      className="touch-target flex items-center gap-2 text-foreground font-medium hover:text-china-red transition-colors py-3 px-2 -mx-2 rounded-lg active:bg-muted/50"
                    >
                      <Heart className="w-4 h-4" />
                      Produtos salvos
                    </Link>
                    <Link
                      to="/meus-pedidos"
                      onClick={() => setMobileOpen(false)}
                      className="touch-target flex items-center gap-2 text-foreground font-medium hover:text-china-red transition-colors py-3 px-2 -mx-2 rounded-lg active:bg-muted/50"
                    >
                      <Package className="w-4 h-4" />
                      Meus pedidos
                    </Link>
                  </>
                )}
                {user && (
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="touch-target w-full flex items-center gap-2 text-foreground font-medium hover:text-china-red transition-colors py-3 px-2 -mx-2 rounded-lg active:bg-muted/50 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                )}
                {!user && (
                  <>
                    <Link
                      to="/cadastro"
                      onClick={() => setMobileOpen(false)}
                      className="touch-target flex items-center text-foreground font-medium hover:text-china-red py-3 px-2 -mx-2 rounded-lg active:bg-muted/50"
                    >
                      Criar conta
                    </Link>
                    <Link
                      to="/entrar"
                      onClick={() => setMobileOpen(false)}
                      className="touch-target flex items-center text-foreground font-medium hover:text-china-red py-3 px-2 -mx-2 rounded-lg active:bg-muted/50"
                    >
                      Entrar
                    </Link>
                  </>
                )}
                <Link
                  to="/checkout"
                  onClick={() => setMobileOpen(false)}
                  className="touch-target flex items-center justify-center bg-china-red text-white px-4 py-3.5 rounded-full text-sm font-bold hover:bg-china-red/90 mt-4 min-h-[48px]"
                >
                  Finalizar pedido
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        </div>

        {/* Segunda linha no mobile: barra de busca em largura total */}
        <div className="md:hidden w-full pb-3 pt-1">
          <form
            onSubmit={handleSearch}
            className="w-full flex items-center gap-1 bg-muted rounded-full border border-border overflow-hidden hover:border-china-red/30 transition-colors pl-3 pr-1 py-1.5 min-h-[44px]"
          >
            <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
            <input
              type="text"
              placeholder="Cole o link do produto (Taobao, 1688, Weidian...) ou pesquise"
              className="flex-1 min-w-0 py-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="touch-target shrink-0 bg-china-red hover:bg-china-red/90 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
