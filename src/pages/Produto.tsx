import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiUrl } from "@/lib/api";
import { getDisplayPriceBrl } from "@/lib/pricing";
import { catalogCardTitle } from "@/lib/productDisplayTitle";
import { useCart } from "@/context/CartContext";
import { ShoppingCart } from "lucide-react";
import { SaveProductHeart } from "@/components/SaveProductHeart";

type Product = {
  id: string;
  originalUrl: string;
  title: string;
  titlePt: string | null;
  description: string | null;
  image: string | null;
  images: string | null;
  priceCny: number | null;
  priceBrl: number | null;
  source: string;
  category: string;
  supplierName?: string | null;
};

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f1f5f9' width='400' height='400'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EProduto%3C/text%3E%3C/svg%3E";

const Produto = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(apiUrl(`/api/products/${slug}`))
      .then((r) => (r.ok ? r.json() : null))
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;
    const name = catalogCardTitle(
      product.titlePt,
      product.title,
      product.supplierName,
      "Produto",
    );
    addItem({
      url: product.originalUrl,
      quantity: 1,
      title: name,
      titlePt: name,
      priceCny: product.priceCny,
      priceBrl: displayBrl ?? product.priceBrl ?? undefined,
      image: product.image || undefined,
    });
    navigate("/carrinho");
  };

  const handleSeeDetails = () => {
    if (!product) return;
    navigate(`/pedido?url=${encodeURIComponent(product.originalUrl)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="animate-pulse h-64 bg-muted rounded-xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-4xl text-center">
          <p className="text-muted-foreground mb-4">Produto não encontrado.</p>
          <Link
            to="/explorar"
            className="text-china-red font-medium hover:underline"
          >
            Voltar ao Explorar
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const displayTitle = catalogCardTitle(
    product.titlePt,
    product.title,
    product.supplierName,
    "Produto",
  );
  const displayBrl = getDisplayPriceBrl(product.priceCny, product.priceBrl);
  const priceStr =
    displayBrl != null ? `R$ ${displayBrl.toFixed(2)}` : "Consultar";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square rounded-2xl border border-border bg-muted overflow-hidden">
            <img
              src={product.image || PLACEHOLDER}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER;
              }}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-china-red uppercase tracking-wider">
              {product.source}
            </p>
            <div className="flex items-start gap-2 mt-2">
              <h1 className="text-2xl font-heading font-bold text-foreground flex-1">
                {displayTitle}
              </h1>
              {slug && <SaveProductHeart slug={slug} variant="inline" />}
            </div>
            <p className="text-2xl font-bold text-china-red mt-4">{priceStr}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Preço em reais · Entrega no Brasil · Você paga aqui
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={handleAddToCart}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-china-red text-white px-6 py-3 rounded-xl font-bold hover:bg-china-red/90"
              >
                <ShoppingCart className="w-5 h-5" />
                Adicionar ao carrinho
              </button>
              <button
                onClick={handleSeeDetails}
                className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-border px-6 py-3 rounded-xl font-semibold hover:bg-muted"
              >
                Ver opções (cor, tamanho)
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              "Ver opções" abre a página completa do produto para você escolher
              cor, tamanho e outras variantes.
            </p>
            <Link
              to="/explorar"
              className="inline-block mt-6 text-sm text-china-red hover:underline"
            >
              ← Voltar ao Explorar
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Produto;
