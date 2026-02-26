import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiUrl } from "@/lib/api";
import { ShoppingBag, Search, Loader2 } from "lucide-react";

type Product = {
  id: string;
  originalUrl: string;
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
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "all";

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category !== "all") params.set("category", category);
    const url = apiUrl(`/api/products?${params.toString()}`);
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [q, category]);

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
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Explorar produtos</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Tudo da China em um só lugar. Pesquise e encontre o que você precisa.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-china-red text-white font-semibold text-sm hover:bg-china-red/90"
            >
              Buscar
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCategory(c.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  (c.id === "all" && !category) || category === c.id
                    ? "bg-china-red text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
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
              Ou cole o link de um produto para comprar →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{total} produto(s) encontrado(s)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((p) => {
                const displayTitle = p.titlePt || p.title;
                const priceStr =
                  p.priceBrl != null ? `R$ ${Number(p.priceBrl).toFixed(2)}` : p.priceCny != null ? `CNY ¥ ${Number(p.priceCny)}` : "Consultar";
                return (
                  <Link
                    key={p.id}
                    to={`/produto/${p.slug}`}
                    className="group rounded-xl border border-border bg-card overflow-hidden hover:border-china-red/40 transition-colors flex flex-col"
                  >
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      <img
                        src={p.image || PLACEHOLDER}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER;
                        }}
                      />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <p className="text-xs font-medium text-china-red uppercase tracking-wider">{p.source}</p>
                      <h3 className="font-semibold text-foreground line-clamp-2 mt-1">{displayTitle}</h3>
                      <div className="mt-auto pt-3 flex items-center justify-between">
                        <span className="text-lg font-bold text-china-red">{priceStr}</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver <ShoppingBag className="w-4 h-4" />
                        </span>
                      </div>
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
