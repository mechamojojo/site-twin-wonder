import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { FEATURED_PRODUCTS, CATEGORY_LABELS as FEATURED_CATEGORY_LABELS, type FeaturedCategory, type FeaturedProduct } from "@/data/featuredProducts";
import { CATEGORY_LABELS as CATALOG_CATEGORY_LABELS } from "@/lib/categoryLabels";
import { apiUrl } from "@/lib/api";
import { ensureHttpsImage } from "@/lib/utils";
import { ShoppingBag, Sparkles } from "lucide-react";

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f1f5f9' width='400' height='400'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EProduto%3C/text%3E%3C/svg%3E";

type CatalogProduct = { id: string; originalUrl: string; title: string; titlePt: string | null; image: string | null; priceCny: number | null; priceBrl: number | null; source: string; slug: string; category: string };

function ProductCard({ product, useSlug = false }: { product: FeaturedProduct | CatalogProduct; useSlug?: boolean }) {
  const url = "originalUrl" in product ? product.originalUrl : (product as FeaturedProduct).url;
  const imgSrc = product.image ? ensureHttpsImage(product.image) : PLACEHOLDER_IMAGE;
  const priceStr = product.priceBrl != null ? `R$ ${Number(product.priceBrl).toFixed(2)}` : product.priceCny != null ? `CNY ¥ ${Number(product.priceCny)}` : "Consultar";
  const to = useSlug && "slug" in product ? `/produto/${product.slug}` : `/pedido?url=${encodeURIComponent(url)}`;

  return (
    <Card className="overflow-hidden border-border hover:border-china-red/40 transition-colors h-full flex flex-col">
      <Link to={to} className="flex flex-col flex-1">
        <div className="aspect-square bg-muted relative overflow-hidden">
          <img
            src={imgSrc}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
            }}
          />
        </div>
        <CardContent className="p-4 flex-1">
          <p className="text-xs font-medium text-china-red uppercase tracking-wider">{product.source}</p>
          <h3 className="font-semibold text-foreground line-clamp-2 mt-1">{product.titlePt || product.title}</h3>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex items-center justify-between">
          <span className="text-lg font-bold text-china-red">{priceStr}</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            Ver e comprar <ShoppingBag className="w-4 h-4" />
          </span>
        </CardFooter>
      </Link>
    </Card>
  );
}

export default function FeaturedProductsSection() {
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/api/products?featured=true&limit=12"))
      .then((r) => r.json())
      .then((data) => {
        setCatalogProducts(data.products ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const products = catalogProducts.length > 0 ? catalogProducts : FEATURED_PRODUCTS;
  const useSlug = catalogProducts.length > 0;
  const hasMultipleCategories = catalogProducts.length > 0 ? new Set(catalogProducts.map((p) => p.category)).size > 1 : new Set(FEATURED_PRODUCTS.map((p) => p.category)).size > 1;
  const categories: FeaturedCategory[] = ["destaques", "mais-vendidos", "tendencias"];
  const categoriesWithProducts = catalogProducts.length > 0
    ? Array.from(new Set(catalogProducts.map((p) => p.category)))
    : categories.filter((cat) => FEATURED_PRODUCTS.some((p) => p.category === cat));

  if (products.length === 0 && loaded) return null;

  return (
    <section id="explorar" className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
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

        {!loaded ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : hasMultipleCategories && categoriesWithProducts.length > 1 ? (
          <div className="space-y-12">
            {categoriesWithProducts.map((cat) => {
              const items = products.filter((p) => p.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="text-lg font-semibold text-foreground mb-4">{CATALOG_CATEGORY_LABELS[cat] ?? FEATURED_CATEGORY_LABELS[cat as FeaturedCategory] ?? cat}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {items.map((product) => (
                      <ProductCard key={product.id} product={product} useSlug={useSlug} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} useSlug={useSlug} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
