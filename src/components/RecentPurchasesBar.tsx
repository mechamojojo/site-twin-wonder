import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "@/lib/api";
import { ShoppingBag } from "lucide-react";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect fill='%23f1f5f9' width='120' height='120'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='12' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EProduto%3C/text%3E%3C/svg%3E";

type RecentPurchase = {
  url: string;
  title: string;
  image: string | null;
  slug?: string | null;
};

export default function RecentPurchasesBar() {
  const [items, setItems] = useState<RecentPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(() => {
    fetch(apiUrl("/api/recent-purchases"))
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.items?.length) setItems(data.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 60000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  if (loading || items.length === 0) return null;

  return (
    <section className="bg-muted/40 py-6 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-start gap-2.5 mb-3">
          <ShoppingBag className="w-4 h-4 text-china-red shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-sm font-heading font-bold text-foreground tracking-tight">
              Últimas compras feitas no site
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug max-w-xl">
              Pedidos reais de quem já fechou com a gente — inspire-se e peça o
              seu pelo mesmo link, com intermediação e suporte até o Brasil.
            </p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent -mx-1">
          {items.map((item, i) => (
            <Link
              key={`${item.url}-${i}`}
              to={`/pedido?url=${encodeURIComponent(item.url)}`}
              className="shrink-0 w-28 sm:w-32 group"
            >
              <div className="aspect-square rounded-xl border border-border bg-white overflow-hidden mb-2 shadow-sm group-hover:border-china-red/50 transition-colors">
                <img
                  src={item.image || PLACEHOLDER_IMAGE}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                  }}
                />
              </div>
              <p
                className="text-xs font-medium text-foreground line-clamp-3 group-hover:text-china-red transition-colors"
                title={item.title}
              >
                {item.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
