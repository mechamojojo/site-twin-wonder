import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EXPLORAR_PRODUCTS } from "@/data/explorarProducts";
import { apiUrl } from "@/lib/api";
import { ensureHttpsImage, referrerPolicyForImage } from "@/lib/utils";
import { ShoppingBag, Search, Loader2 } from "lucide-react";

type Product = {
  id: string;
  originalUrl?: string;
  url?: string;
  title: string;
  titlePt: string | null;
  image: string | null;
  priceCny: number | null;
  priceBrl: number | null;
  source: string;
  category: string;
  slug: string;
};

const CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "eletronicos", label: "Eletrônicos" },
  { id: "moda", label: "Moda" },
  { id: "acessorios", label: "Acessórios" },
  { id: "casa", label: "Casa & Decoração" },
  { id: "beleza", label: "Beleza" },
  { id: "outros", label: "Outros" },
];

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f1f5f9' width='400' height='400'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EProduto%3C/text%3E%3C/svg%3E";

const Explorar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();
  const category = searchParams.get("category") ?? "all";

  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => setSearchInput(q), [q]);

  useEffect(() => {
    fetch(apiUrl("/api/products?limit=2000"))
      .then((r) => r.json())
      .then((data) => {
        const list = data.products ?? [];
        setApiProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => setApiProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const sourceList = useMemo(() => {
    if (apiProducts.length === 0) return EXPLORAR_PRODUCTS;
    const apiUrls = new Set(
      apiProducts.map((p) => (p.originalUrl || p.url || "").replace(/\?.*$/, "")),
    );
    const extra = EXPLORAR_PRODUCTS.filter(
      (p) => !apiUrls.has((p.url || "").replace(/\?.*$/, "")),
    );
    return [...apiProducts, ...extra];
  }, [apiProducts]);

  const apiUrlSet = useMemo(
    () => new Set(apiProducts.map((p) => (p.originalUrl || p.url || "").replace(/\?.*$/, ""))),
    [apiProducts],
  );

  const { products, total } = useMemo(() => {
    let list = sourceList;
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (q.length >= 2) {
      list = list.filter(
        (p) =>
          (p.titlePt?.toLowerCase().includes(q)) ||
          (p.title?.toLowerCase().includes(q)) ||
          (p.category?.toLowerCase().includes(q))
      );
    }
    return { products: list, total: list.length };
  }, [sourceList, q, category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setSearchParams(trimmed ? { q: trimmed, category } : category !== "all" ? { category } : {});
  };

  const handleCategory = (cat: string) => {
    setSearchParams(cat === "all" ? (q ? { q } : {}) : { ...(q ? { q } : {}), category: cat });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-[env(safe-area-inset-bottom)]">
        <div className="mb-6 sm:mb-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-2.5 rounded-md border border-border bg-background text-base sm:text-sm outline-none focus:border-foreground/30 min-h-[44px]"
              />
            </div>
            <button
              type="submit"
              className="touch-target min-h-[44px] px-5 py-3 sm:py-2.5 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              Buscar
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategory(c.id)}
                className={`touch-target min-h-[40px] px-4 py-2.5 rounded-full text-xs font-medium transition-colors ${
                  (c.id === "all" && category === "all") || category === c.id
                    ? "bg-foreground text-background"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-china-red" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">
              {q || category !== "all" ? "Nenhum produto encontrado. Tente outros termos." : "Catálogo em construção. Em breve mais produtos!"}
            </p>
            <Link to="/pedido" className="text-china-red font-medium hover:underline">
              Informe o link do produto na página inicial para comprar →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-5">{total} produto(s)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {products.map((p) => {
                const displayTitle = p.titlePt || p.title;
                const priceStr =
                  p.priceBrl != null ? `R$ ${Number(p.priceBrl).toFixed(2)}` : p.priceCny != null ? `CNY ¥ ${Number(p.priceCny)}` : "Consultar";
                return (
                  <Link
                    key={p.id}
                    to={p.slug && apiUrlSet.has((p.originalUrl ?? p.url ?? "").replace(/\?.*$/, "")) ? `/produto/${p.slug}` : `/pedido?url=${encodeURIComponent(p.originalUrl ?? p.url ?? "")}`}
                    className="group flex flex-col bg-transparent"
                  >
                    <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden rounded-sm">
                      <img
                        src={p.image ? ensureHttpsImage(p.image) : PLACEHOLDER}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy={referrerPolicyForImage(p.image ?? PLACEHOLDER)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER;
                        }}
                      />
                    </div>
                    <div className="pt-2.5 flex flex-col min-h-0">
                      <h3 className="text-sm text-foreground line-clamp-2 font-normal leading-snug">{displayTitle}</h3>
                      <p className="mt-1 text-sm font-semibold text-china-red">{priceStr}</p>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver produto <ShoppingBag className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Explorar;
