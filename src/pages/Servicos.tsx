import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShoppingCart, Truck } from "lucide-react";

const services = [
  {
    id: "compre-por-mim",
    icon: ShoppingCart,
    title: "Compre Por Mim",
    description: "Compramos produtos de lojas online da China em seu nome.",
    steps: [
      "Envie o link do produto (Taobao, 1688, Weidian, TMALL, etc.) pela nossa página.",
      "Informe a variação desejada (cor, tamanho), quantidade e seu CEP.",
      "Nossa equipe confere disponibilidade e envia o orçamento final em reais (produto + taxa ComprasChina + frete).",
      "Você paga em reais (PIX, cartão ou boleto). Nós compramos na China usando nossa estrutura e enviamos até você.",
    ],
  },
  {
    id: "envie-por-mim",
    icon: Truck,
    title: "Envie Por Mim",
    description: "Você já comprou no site chinês e quer que a gente receba e envie para o Brasil.",
    steps: [
      "Compre no marketplace chinês e use o endereço do nosso armazém na China como destino.",
      "Cadastre o pedido na ComprasChina com o número do rastreio e dados do pacote.",
      "Quando o item chegar ao armazém, fazemos inspeção (fotos, medições) e consolidamos se você tiver mais pacotes.",
      "Você escolhe o método de envio para o Brasil e paga o frete em reais. Enviamos até seu CEP.",
    ],
  },
];

const Servicos = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-10">
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Nossos Serviços</h1>
          <p className="text-muted-foreground">
            Tudo que você precisa para comprar da China com segurança, em reais e com suporte em português.
          </p>
        </div>

        <nav className="mb-10 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Nesta página</p>
          <ul className="flex flex-wrap gap-2">
            {services.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-china-red font-medium hover:underline">
                  {s.title}
                </a>
                {s.id !== services[services.length - 1].id && <span className="text-muted-foreground mx-1">·</span>}
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-16">
          {services.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-china-red to-gold flex items-center justify-center shrink-0">
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-foreground">{s.title}</h2>
                  <p className="text-muted-foreground mt-1">{s.description}</p>
                </div>
              </div>
              <div className="ml-16 pl-0 md:pl-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Como funciona</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  {s.steps.map((step, i) => (
                    <li key={i} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-china-red text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-china-red/90 transition-colors"
          >
            Ver preços e começar
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Servicos;
