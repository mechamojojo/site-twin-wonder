import { Users, Package } from "lucide-react";

const AboutSection = () => {
  return (
    <section className="py-20 bg-section-alt">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">Sobre Nós</h2>
            <p className="text-xl text-primary font-semibold mb-4">Conectando o Mercado Chinês com o Brasil</p>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              A CSSBuy oferece uma solução prática para a compra de produtos em grandes plataformas de marketplace chinesas, como JD, Taobao, TMALL, 1688 e Weidian. Esses marketplaces contêm bilhões de produtos, e você pode encontrar de tudo aqui.
            </p>
            <a href="#" className="inline-block mt-4 text-primary font-medium text-sm hover:underline">
              Leia Mais →
            </a>
          </div>

          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">serviço de qualidade</p>
            <h3 className="text-2xl font-heading font-bold text-foreground mb-3">
              Oferecendo serviço e produtos de qualidade aos nossos clientes
            </h3>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Diversos métodos de pagamento, inspeção de qualidade no armazém, imagens de QC ilimitadas, divisão de pedidos e longo tempo de armazenamento gratuito. Embalamos seu pacote profissionalmente com materiais de proteção.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
            <div className="flex items-center gap-4 bg-background rounded-xl p-5 border border-border shadow-card">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-heading font-bold text-2xl text-foreground">1.200.000+</p>
                <p className="text-sm text-muted-foreground">Clientes Atendidos</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-background rounded-xl p-5 border border-border shadow-card">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-heading font-bold text-2xl text-foreground">1M+</p>
                <p className="text-sm text-muted-foreground">Produtos Disponíveis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
