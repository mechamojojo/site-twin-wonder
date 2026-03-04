import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { EXPLORAR_PRODUCTS } from "@/data/explorarProducts";
import { CATEGORY_LABELS as CATALOG_CATEGORY_LABELS } from "@/lib/categoryLabels";
import { apiUrl } from "@/lib/api";
import { ensureHttpsImage, referrerPolicyForImage } from "@/lib/utils";
import { ChevronDown, ShoppingBag, Sparkles } from "lucide-react";

/** Número de produtos exibidos antes de "Ver mais" (≈ 4 linhas no desktop com 5 colunas). */
const INITIAL_VISIBLE = 20;

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f1f5f9' width='400' height='400'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EProduto%3C/text%3E%3C/svg%3E";

type ProductLike = { id: string; url?: string; originalUrl?: string; title: string; titlePt?: string | null; image?: string | null; priceCny?: number | null; priceBrl?: number | null; source: string; slug?: string; category: string };

function ProductCard({ product, useSlug = false }: { product: ProductLike; useSlug?: boolean }) {
  const url = product.originalUrl ?? product.url ?? "";
  const imgSrc = product.image ? ensureHttpsImage(product.image) : PLACEHOLDER_IMAGE;
  const priceStr = product.priceBrl != null ? `R$ ${Number(product.priceBrl).toFixed(2)}` : product.priceCny != null ? `CNY ¥ ${Number(product.priceCny)}` : "Consultar";
  const to = useSlug && product.slug ? `/produto/${product.slug}` : `/pedido?url=${encodeURIComponent(url)}`;

  return (
    <Card className="overflow-hidden border-0 shadow-none rounded-none hover:shadow-md transition-shadow h-full flex flex-col bg-transparent">
      <Link to={to} className="flex flex-col flex-1 group">
        <div className="aspect-[3/4] bg-muted/50 relative overflow-hidden">
          <img
            src={imgSrc}
            alt={product.titlePt || product.title || "Produto"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy={referrerPolicyForImage(imgSrc)}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
            }}
          />
        </div>
        <CardContent className="p-3 flex-1 flex flex-col">
          <h3 className="font-medium text-foreground text-sm line-clamp-2">{product.titlePt || product.title}</h3>
          <div className="mt-auto pt-2 flex items-center justify-between">
            <span className="text-base font-bold text-china-red">{priceStr}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-china-red transition-colors">
              Ver <ShoppingBag className="w-3.5 h-3.5" />
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

export default function FeaturedProductsSection() {
  const [apiProducts, setApiProducts] = useState<ProductLike[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/api/products?featured=true&limit=60"))
      .then((r) => r.json())
      .then((data) => {
        const list = data.products ?? [];
        setApiProducts(Array.isArray(list) ? list : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const allProducts = apiProducts.length > 0 ? apiProducts : EXPLORAR_PRODUCTS;
  const useSlug = apiProducts.length > 0;
  const categoriesWithProducts = Array.from(new Set(allProducts.map((p) => p.category))).sort((a, b) => {
    const order = ["moda", "eletronicos", "acessorios", "beleza", "casa", "outros"];
    return order.indexOf(a) - order.indexOf(b);
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expanded, setExpanded] = useState(false);
  const verMaisRef = useRef<HTMLDivElement>(null);

  const products =
    selectedCategory === "all"
      ? allProducts
      : allProducts.filter((p) => p.category === selectedCategory);

  const visibleProducts = expanded ? products : products.slice(0, INITIAL_VISIBLE);
  const hasMore = products.length > INITIAL_VISIBLE;

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setExpanded(false);
  };

  if (allProducts.length === 0 && loaded) return null;

  return (
    <section id="explorar" className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-china-red uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> Explorar
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2">
              Produtos que você pode comprar
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Tudo da China em um só lugar. Clique para ver o preço em reais e adicionar ao carrinho.
            </p>
          </div>
          <Link to="/explorar" className="text-china-red font-semibold text-sm hover:underline shrink-0">
            Ver todos →
          </Link>
        </div>

        {categoriesWithProducts.length > 1 && loaded && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            <button
              type="button"
              onClick={() => handleCategoryChange("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-foreground text-background"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              }`}
            >
              Todos
            </button>
            {categoriesWithProducts.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-foreground text-background"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted"
                }`}
              >
                {CATALOG_CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        )}

        {!loaded ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[3/4] bg-muted rounded-sm animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8">
            Nenhum produto nesta categoria. Escolha outra acima.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} useSlug={useSlug} />
              ))}
            </div>
            {hasMore && (
              <div ref={verMaisRef} className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (expanded) {
                      setExpanded(false);
                      setTimeout(() => verMaisRef.current?.scrollIntoView({ block: "center" }), 80);
                    } else {
                      setExpanded(true);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-china-red transition-colors"
                >
                  {expanded ? (
                    <>
                      Ver menos <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                    </>
                  ) : (
                    <>
                      Ver mais ({products.length - INITIAL_VISIBLE}) <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
