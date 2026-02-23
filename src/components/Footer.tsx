const Footer = () => {
  return (
    <footer className="bg-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <span className="text-2xl font-heading font-bold">
              <span className="text-china-red">Compras</span>
              <span className="text-primary">China</span>
            </span>
            <p className="text-background/60 text-sm mt-3 leading-relaxed">
              Serviço brasileiro que facilita suas compras da China. Utilizamos a estrutura da CSSBuy para oferecer a melhor experiência aos brasileiros.
            </p>
          </div>

          <div>
            <h4 className="text-background font-heading font-bold mb-4">Serviços</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><a href="#" className="hover:text-primary transition-colors">Compre Por Mim</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Envie Por Mim</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Drop Shipping</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FBA Para Amazon</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-background font-heading font-bold mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><a href="#" className="hover:text-primary transition-colors">Guia do Comprador</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Guia de Envio</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Calculadora de Custos</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Central de Ajuda</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-background font-heading font-bold mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><a href="#" className="hover:text-primary transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Fale Conosco</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Política de Privacidade</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Termos de Serviço</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 pt-6 text-center text-sm text-background/40">
          © 2024 ComprasChina. Todos os direitos reservados. Powered by CSSBuy.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
