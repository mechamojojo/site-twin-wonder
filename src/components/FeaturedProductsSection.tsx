import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  EXPLORAR_PRODUCTS,
  CURATED_TITLE_BY_CANONICAL_KEY,
} from "@/data/explorarProducts";
import { CATEGORY_LABELS as CATALOG_CATEGORY_LABELS } from "@/lib/categoryLabels";
import { apiUrl } from "@/lib/api";
import {
  ensureHttpsImage,
  referrerPolicyForImage,
  productUrlToCanonicalKey,
} from "@/lib/utils";
import { getDisplayPriceBrl } from "@/lib/pricing";
import {
  hasProductDisplayTitle,
  catalogCardTitle,
  catalogCardHeadline,
} from "@/lib/productDisplayTitle";
import { SupplierTag } from "@/components/SupplierTag";
import { useLazyProductImage } from "@/hooks/useLazyProductImage";
import { ChevronDown, ShoppingBag, Sparkles, ShieldCheck } from "lucide-react";

/** Número de produtos exibidos antes de "Ver mais" (≈ 8 linhas no desktop com 5 colunas). */
const INITIAL_VISIBLE = 40;

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f1f5f9' width='400' height='400'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EProduto%3C/text%3E%3C/svg%3E";

type ProductLike = {
  id: string;
  url?: string;
  originalUrl?: string;
  title: string;
  titlePt?: string | null;
  image?: string | null;
  priceCny?: number | null;
  priceBrl?: number | null;
  source: string;
  slug?: string;
  category: string;
  brand?: string;
  storeName?: string;
  isChineseBrand?: boolean;
  supplierName?: string | null;
};

function ProductCard({ product }: { product: ProductLike }) {
  const url = product.originalUrl ?? product.url ?? "";
  const [lazyImage, containerRef] = useLazyProductImage(
    url || undefined,
    product.image ?? undefined,
  );
  const imgSrc = lazyImage ? ensureHttpsImage(lazyImage) : PLACEHOLDER_IMAGE;
  const displayBrl = getDisplayPriceBrl(product.priceCny, product.priceBrl);
  const priceStr =
    displayBrl != null ? `R$ ${displayBrl.toFixed(2)}` : "Consultar";
  const to = `/pedido?url=${encodeURIComponent(url)}`;
  const headline = catalogCardHeadline(
    product.titlePt,
    product.title,
    product.supplierName,
    "Produto",
  );
  const imgAlt = catalogCardTitle(
    product.titlePt,
    product.title,
    product.supplierName,
    "Produto",
  );

  return (
    <div ref={containerRef} className="h-full">
      <Card className="overflow-hidden border-0 shadow-none rounded-none hover:shadow-md transition-shadow h-full flex flex-col bg-transparent">
        <Link to={to} className="flex flex-col flex-1 group">
          <div className="aspect-[3/4] bg-muted/50 relative overflow-hidden">
            <img
              src={imgSrc}
              alt={imgAlt}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              referrerPolicy={referrerPolicyForImage(imgSrc)}
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
              }}
            />
          </div>
          <CardContent className="p-3 flex-1 flex flex-col">
            {(product.isChineseBrand ||
              product.brand ||
              product.storeName ||
              product.supplierName?.trim()) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                {product.isChineseBrand && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-2.5 h-2.5" /> Marca chinesa
                  </span>
                )}
                {product.brand && (
                  <span
                    className="text-[10px] font-medium text-muted-foreground truncate"
                    title={product.brand}
                  >
                    {product.brand}
                  </span>
                )}
                {product.storeName && (
                  <span
                    className="text-[10px] text-muted-foreground truncate"
                    title={product.storeName}
                  >
                    {product.storeName}
                  </span>
                )}
                {product.supplierName?.trim() && (
                  <SupplierTag supplierName={product.supplierName} />
                )}
              </div>
            )}
            <h3 className="font-medium text-foreground text-sm line-clamp-2">
              {headline}
            </h3>
            <div className="mt-auto pt-2 flex items-center justify-between">
              <span className="text-base font-bold text-china-red">
                {priceStr}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-china-red transition-colors">
                Pedir <ShoppingBag className="w-3.5 h-3.5" />
              </span>
            </div>
          </CardContent>
        </Link>
      </Card>
    </div>
  );
}

export default function FeaturedProductsSection() {
  const [apiProducts, setApiProducts] = useState<ProductLike[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/api/products?limit=500"))
      .then((r) => r.json())
      .then((data) => {
        const list = data.products ?? [];
        const fromApi = Array.isArray(list) ? list : [];
        setApiProducts(fromApi); // ordem = exatamente a do admin (sortOrder 0,1,2...), não reordenar
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const explorarTitleByKey = useMemo(() => {
    const m = new Map<string, { title: string; titlePt: string }>();
    for (const p of EXPLORAR_PRODUCTS) {
      const k = productUrlToCanonicalKey(p.url);
      if (k) m.set(k, { title: p.title, titlePt: p.titlePt });
    }
    return m;
  }, []);

  // Só produtos do catálogo (API / admin — ordem sortOrder). Lista estática EXPLORAR não aparece na home.
  const allProducts = useMemo(() => {
    return apiProducts.map((p) => {
      if (hasProductDisplayTitle(p.titlePt, p.title)) return p;
      const key = productUrlToCanonicalKey(p.originalUrl || p.url);
      const curated = key ? CURATED_TITLE_BY_CANONICAL_KEY.get(key) : undefined;
      if (curated) return { ...p, title: curated, titlePt: curated };
      const explorar = key ? explorarTitleByKey.get(key) : undefined;
      if (explorar)
        return { ...p, title: explorar.title, titlePt: explorar.titlePt };
      return p;
    });
  }, [apiProducts, explorarTitleByKey]);
  const categoriesWithProducts = Array.from(
    new Set(allProducts.map((p) => p.category)),
  ).sort((a, b) => {
    const order = [
      "marcas-chinesas",
      "moda",
      "eletronicos",
      "acessorios",
      "beleza",
      "casa",
      "outros",
    ];
    return order.indexOf(a) - order.indexOf(b);
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expanded, setExpanded] = useState(false);
  const verMaisRef = useRef<HTMLDivElement>(null);

  const products =
    selectedCategory === "all"
      ? allProducts
      : allProducts.filter((p) => p.category === selectedCategory);

  const visibleProducts = expanded
    ? products
    : products.slice(0, INITIAL_VISIBLE);
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
              <Sparkles className="w-4 h-4" /> O que estão comprando
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2">
              Aprovados por quem já comprou
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl">
              O que nossos clientes estão trazendo da China.
            </p>
          </div>
          <Link
            to="/explorar"
            className="text-china-red font-semibold text-sm hover:underline shrink-0"
          >
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
              <div
                key={i}
                className="aspect-[3/4] bg-muted rounded-sm animate-pulse"
              />
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
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {hasMore && (
              <div ref={verMaisRef} className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (expanded) {
                      setExpanded(false);
                      setTimeout(
                        () =>
                          verMaisRef.current?.scrollIntoView({
                            block: "center",
                          }),
                        80,
                      );
                    } else {
                      setExpanded(true);
                    }
                  }}
                  className="touch-target min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-china-red transition-colors rounded-lg active:bg-muted/50"
                >
                  {expanded ? (
                    <>
                      Ver menos{" "}
                      <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                    </>
                  ) : (
                    <>
                      Ver mais ({products.length - INITIAL_VISIBLE}){" "}
                      <ChevronDown className="w-3.5 h-3.5" />
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
