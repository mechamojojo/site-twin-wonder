import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiUrl } from "@/lib/api";
import { Package, ChevronRight } from "lucide-react";

type SupplierRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
};

const Fornecedores = () => {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/suppliers"))
      .then((r) => r.json())
      .then((data) => {
        const list = data.suppliers;
        setSuppliers(Array.isArray(list) ? list : []);
      })
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Transparência
        </p>
        <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
          Fornecedores no catálogo
        </h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Cada produto no Explorar mostra no título de qual fornecedor ou tipo
          de peça se trata (ex.: <strong>Original</strong> ou o nome da loja),
          para você saber o que está comprando. Toque em um fornecedor para ver
          só os produtos dele.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : suppliers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há fornecedores cadastrados no catálogo.
          </p>
        ) : (
          <ul className="space-y-2">
            {suppliers.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/explorar?fornecedor=${encodeURIComponent(s.slug)}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-china-red/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {s.name}
                    </p>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {s.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Package className="w-3 h-3 shrink-0" />
                      {s.productCount}{" "}
                      {s.productCount === 1 ? "produto" : "produtos"} no
                      Explorar
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-sm">
          <Link
            to="/explorar"
            className="text-china-red font-medium hover:underline"
          >
            ← Ver todos os produtos no Explorar
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default Fornecedores;
