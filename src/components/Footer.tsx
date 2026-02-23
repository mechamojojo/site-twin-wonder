const Footer = () => {
  return (
    <footer className="bg-foreground py-14">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <span className="text-2xl font-heading font-extrabold">
              <span className="text-china-red">Compras</span>
              <span className="text-gold">China</span>
            </span>
            <p className="text-background/50 text-sm mt-4 leading-relaxed">
              Serviço brasileiro que facilita suas compras da China. Utilizamos a estrutura da CSSBuy para oferecer a melhor experiência aos brasileiros.
            </p>
            <div className="flex gap-3 mt-5">
              {["📷", "📘", "🐦", "💬"].map((emoji, i) => (
                <button key={i} className="w-9 h-9 rounded-full bg-background/10 hover:bg-background/20 flex items-center justify-center transition-colors text-sm">
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-background font-heading font-bold mb-5">Serviços</h4>
            <ul className="space-y-3 text-sm text-background/50">
              <li><a href="#" className="hover:text-gold transition-colors">Compre Por Mim</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Envie Por Mim</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Drop Shipping</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">FBA Para Amazon</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-background font-heading font-bold mb-5">Recursos</h4>
            <ul className="space-y-3 text-sm text-background/50">
              <li><a href="#" className="hover:text-gold transition-colors">Guia do Comprador</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Guia de Envio</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Calculadora de Custos</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Central de Ajuda</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-background font-heading font-bold mb-5">Empresa</h4>
            <ul className="space-y-3 text-sm text-background/50">
              <li><a href="#" className="hover:text-gold transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Fale Conosco</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Política de Privacidade</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Termos de Serviço</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/30">
          <span>© 2024 ComprasChina. Todos os direitos reservados.</span>
          <span>Powered by CSSBuy</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
