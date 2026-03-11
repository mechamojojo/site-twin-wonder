import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EXPLORAR_PRODUCTS, CURATED_TITLE_BY_CANONICAL_KEY } from "@/data/explorarProducts";
import { MARKETPLACE_SEARCH_URLS } from "@/data/siteConfig";
import { apiUrl } from "@/lib/api";
import { ensureHttpsImage, referrerPolicyForImage, productUrlToCanonicalKey } from "@/lib/utils";
import { getDisplayPriceBrl } from "@/lib/pricing";
import { useLazyProductImage } from "@/hooks/useLazyProductImage";
import { ShoppingBag, Search, Loader2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 40;

type SortOption = "default" | "price-asc" | "price-desc";

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
  brand?: string;
  storeName?: string;
  isChineseBrand?: boolean;
};

const CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "marcas-chinesas", label: "Marcas chinesas" },
  { id: "eletronicos", label: "Eletrônicos" },
  { id: "moda", label: "Moda" },
  { id: "acessorios", label: "Acessórios" },
  { id: "casa", label: "Casa & Decoração" },
  { id: "beleza", label: "Beleza" },
  { id: "outros", label: "Outros" },
];

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f1f5f9' width='400' height='400'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EProduto%3C/text%3E%3C/svg%3E";

function ExplorarProductCard({ p, to }: { p: Product; to: string }) {
  const url = (p.originalUrl ?? p.url ?? "").replace(/\?.*$/, "");
  const [lazyImage, containerRef] = useLazyProductImage(url || undefined, p.image ?? undefined);
  const imgSrc = lazyImage ? ensureHttpsImage(lazyImage) : PLACEHOLDER;
  const displayTitle = p.titlePt || p.title;
  const displayBrl = getDisplayPriceBrl(p.priceCny, p.priceBrl);
  const priceStr = displayBrl != null ? `R$ ${displayBrl.toFixed(2)}` : p.priceCny != null ? `CNY ¥ ${Number(p.priceCny)}` : "Consultar";

  return (
    <div ref={containerRef} className="h-full">
      <Link to={to} className="group flex flex-col bg-transparent h-full">
        <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden rounded-sm">
          <img
            src={imgSrc}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy={referrerPolicyForImage(imgSrc)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
        </div>
        <div className="pt-2.5 flex flex-col min-h-0">
          {(p.isChineseBrand || p.brand || p.storeName) && (
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {p.isChineseBrand && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  Marca chinesa
                </span>
              )}
              {p.brand && (
                <span className="text-[10px] font-medium text-muted-foreground truncate" title={p.brand}>
                  {p.brand}
                </span>
              )}
              {p.storeName && (
                <span className="text-[10px] text-muted-foreground truncate" title={p.storeName}>
                  {p.storeName}
                </span>
              )}
            </div>
          )}
          <h3 className="text-sm text-foreground line-clamp-2 font-normal leading-snug">{displayTitle}</h3>
          <p className="mt-1 text-sm font-semibold text-china-red">{priceStr}</p>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            Ver produto <ShoppingBag className="w-3 h-3" />
          </span>
        </div>
      </Link>
    </div>
  );
}

const Explorar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();
  const category = searchParams.get("category") ?? "all";
  const pageParam = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(q);
  const [sort, setSort] = useState<SortOption>("default");
  useEffect(() => setSearchInput(q), [q]);

  useEffect(() => {
    fetch(apiUrl("/api/products?limit=300"))
      .then((r) => r.json())
      .then((data) => {
        const list = data.products ?? [];
        setApiProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => setApiProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const explorarTitleByKey = useMemo(() => {
    const m = new Map<string, { title: string; titlePt: string }>();
    for (const p of EXPLORAR_PRODUCTS) {
      const k = productUrlToCanonicalKey(p.url);
      if (k) m.set(k, { title: p.title, titlePt: p.titlePt });
    }
    return m;
  }, []);

  const sourceList = useMemo(() => {
    const apiWithTitles = apiProducts.map((p) => {
      const key = productUrlToCanonicalKey(p.originalUrl || p.url);
      const curated = key ? CURATED_TITLE_BY_CANONICAL_KEY.get(key) : undefined;
      if (curated)
        return { ...p, title: curated, titlePt: curated };
      const explorar = key ? explorarTitleByKey.get(key) : undefined;
      if (explorar)
        return { ...p, title: explorar.title, titlePt: explorar.titlePt };
      return p;
    });
    if (apiWithTitles.length === 0) return EXPLORAR_PRODUCTS;
    const apiKeys = new Set(apiWithTitles.map((p) => productUrlToCanonicalKey(p.originalUrl || p.url)));
    const extra = EXPLORAR_PRODUCTS.filter(
      (p) => !apiKeys.has(productUrlToCanonicalKey(p.url)),
    );
    return [...apiWithTitles, ...extra];
  }, [apiProducts, explorarTitleByKey]);

  const apiUrlSet = useMemo(
    () => new Set(apiProducts.map((p) => productUrlToCanonicalKey(p.originalUrl || p.url))),
    [apiProducts],
  );

  const { products, total, totalPages } = useMemo(() => {
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
    // Sort
    if (sort === "price-asc") {
      list = [...list].sort((a, b) => {
        const pa = getDisplayPriceBrl(a.priceCny, a.priceBrl) ?? a.priceCny ?? Infinity;
        const pb = getDisplayPriceBrl(b.priceCny, b.priceBrl) ?? b.priceCny ?? Infinity;
        return pa - pb;
      });
    } else if (sort === "price-desc") {
      list = [...list].sort((a, b) => {
        const pa = getDisplayPriceBrl(a.priceCny, a.priceBrl) ?? a.priceCny ?? -Infinity;
        const pb = getDisplayPriceBrl(b.priceCny, b.priceBrl) ?? b.priceCny ?? -Infinity;
        return pb - pa;
      });
    }
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(pageParam, totalPages);
    const paginated = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return { products: paginated, total, totalPages };
  }, [sourceList, q, category, sort, pageParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setSearchParams(trimmed ? { q: trimmed, category } : category !== "all" ? { category } : {});
  };

  const handleCategory = (cat: string) => {
    setSearchParams(cat === "all" ? (q ? { q } : {}) : { ...(q ? { q } : {}), category: cat });
  };

  const handlePage = (p: number) => {
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (category !== "all") params.category = category;
    if (p > 1) params.page = String(p);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

          {q.length >= 2 && (
            <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30">
              <p className="text-sm font-medium text-foreground mb-2">
                Buscar &quot;{searchInput.trim()}&quot; também em:
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Abra a busca em cada marketplace e escolha o produto. Depois cole o link aqui no ComprasChina.
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(MARKETPLACE_SEARCH_URLS).map(([name, getUrl]) => (
                  <a
                    key={name}
                    href={getUrl(searchInput.trim())}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted hover:border-china-red/50 transition-colors"
                  >
                    {name}
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}
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
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {total} produto(s)
                {totalPages > 1 && ` · página ${Math.min(pageParam, totalPages)} de ${totalPages}`}
              </p>
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value as SortOption); handlePage(1); }}
                className="text-xs border border-border rounded-full px-3 py-1.5 bg-background text-foreground outline-none focus:border-foreground/30"
              >
                <option value="default">Relevância</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {products.map((p) => (
                <ExplorarProductCard
                  key={p.id}
                  p={p}
                  to={p.slug && apiUrlSet.has(productUrlToCanonicalKey(p.originalUrl ?? p.url)) ? `/produto/${p.slug}` : `/pedido?url=${encodeURIComponent(p.originalUrl ?? p.url ?? "")}`}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => handlePage(Math.max(1, pageParam - 1))}
                  disabled={pageParam <= 1}
                  className="flex items-center gap-1 px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - pageParam) <= 2)
                    .reduce<(number | "...")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, i) =>
                      item === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => handlePage(item as number)}
                          className={`min-w-[36px] h-9 rounded-full text-sm font-medium transition-colors ${
                            item === Math.min(pageParam, totalPages)
                              ? "bg-foreground text-background"
                              : "border border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                </div>
                <button
                  onClick={() => handlePage(Math.min(totalPages, pageParam + 1))}
                  disabled={pageParam >= totalPages}
                  className="flex items-center gap-1 px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Explorar;
