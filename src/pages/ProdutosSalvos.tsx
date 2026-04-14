import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useSavedProducts } from "@/context/SavedProductsContext";
import { getAuthToken } from "@/context/AuthContext";
import { apiUrl } from "@/lib/api";
import { getDisplayPriceBrl } from "@/lib/pricing";
import { ensureHttpsImage, referrerPolicyForImage } from "@/lib/utils";
import { Heart, ShoppingBag } from "lucide-react";

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f1f5f9' width='400' height='400'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EProduto%3C/text%3E%3C/svg%3E";

type Product = {
  id: string;
  slug: string;
  originalUrl: string;
  title: string;
  titlePt: string | null;
  image: string | null;
  priceCny: number | null;
  priceBrl: number | null;
};

const ProdutosSalvos = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { savedSlugs, refetch, toggle, loading } = useSavedProducts();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/entrar", { replace: true });
      return;
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const token = getAuthToken();
    if (!token) return;
    fetch(apiUrl("/api/auth/me/saved-products"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setProducts([]));
  }, [user?.id, savedSlugs.size]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-xl font-heading font-bold text-foreground mb-1">
          Produtos salvos
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Itens que você salvou para ver depois. Clique no coração para remover.
        </p>

        {loading && products.length === 0 ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="text-foreground font-medium mb-1">
              Nenhum produto salvo
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Ao navegar pelo catálogo, clique no coração para salvar e
              encontrar aqui depois.
            </p>
            <Link
              to="/explorar"
              className="inline-flex items-center gap-2 bg-china-red text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-china-red/90"
            >
              <ShoppingBag className="w-4 h-4" />
              Explorar produtos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.map((p) => {
              const priceStr = (() => {
                const displayBrl = getDisplayPriceBrl(p.priceCny, p.priceBrl);
                return displayBrl != null
                  ? `R$ ${displayBrl.toFixed(2)}`
                  : "Consultar";
              })();
              return (
                <div
                  key={p.id}
                  className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                >
                  <Link
                    to={`/pedido?url=${encodeURIComponent(p.originalUrl || "")}`}
                    className="flex flex-col flex-1"
                  >
                    <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden">
                      <img
                        src={p.image ? ensureHttpsImage(p.image) : PLACEHOLDER}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy={referrerPolicyForImage(
                          p.image ?? PLACEHOLDER,
                        )}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER;
                        }}
                      />
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <h3 className="text-sm font-medium text-foreground line-clamp-2">
                        {p.titlePt || p.title}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-china-red">
                        {priceStr}
                      </p>
                    </div>
                  </Link>
                  <div className="p-2 border-t border-border flex justify-end">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        await toggle(p.slug);
                        setProducts((prev) =>
                          prev.filter((x) => x.slug !== p.slug),
                        );
                      }}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-china-red transition-colors"
                    >
                      <Heart className="w-4 h-4 fill-china-red text-china-red" />
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Link
          to="/explorar"
          className="inline-block mt-6 text-sm text-china-red hover:underline"
        >
          ← Voltar ao Explorar
        </Link>
      </main>
      <Footer />
    </div>
  );
};

export default ProdutosSalvos;
