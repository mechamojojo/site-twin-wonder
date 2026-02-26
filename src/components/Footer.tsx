import { Link } from "react-router-dom";
import { Mail, MessageCircle } from "lucide-react";
import { CONTACT_EMAIL, WHATSAPP_NUMBER } from "@/data/siteConfig";

const Footer = () => {
  return (
    <footer id="contact" className="bg-foreground py-14">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <Link to="/" className="text-2xl font-heading font-extrabold inline-block">
              <span className="text-china-red">Compras</span>
              <span className="text-gold">China</span>
            </Link>
            <p className="text-background/50 text-sm mt-4 leading-relaxed">
              Serviço brasileiro que facilita suas compras da China. Utilizamos a estrutura da CSSBuy para oferecer a melhor experiência aos brasileiros.
            </p>
            <div className="flex flex-col gap-2 mt-5">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 text-sm text-background/70 hover:text-gold transition-colors"
              >
                <Mail className="w-4 h-4" />
                {CONTACT_EMAIL}
              </a>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-background/70 hover:text-gold transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-background font-heading font-bold mb-5">Serviços</h4>
            <ul className="space-y-3 text-sm text-background/50">
              <li><Link to="/servicos#compre-por-mim" className="hover:text-gold transition-colors">Compre Por Mim</Link></li>
              <li><Link to="/servicos#envie-por-mim" className="hover:text-gold transition-colors">Envie Por Mim</Link></li>
              <li><Link to="/#contact" className="hover:text-gold transition-colors">Fazer Perguntas</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-background font-heading font-bold mb-5">Recursos</h4>
            <ul className="space-y-3 text-sm text-background/50">
              <li><Link to="/#how-it-works" className="hover:text-gold transition-colors">Guia do Comprador</Link></li>
              <li><Link to="/#shipping" className="hover:text-gold transition-colors">Guia de Envio</Link></li>
              <li><Link to="/#faq" className="hover:text-gold transition-colors">Central de Ajuda</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-background font-heading font-bold mb-5">Empresa</h4>
            <ul className="space-y-3 text-sm text-background/50">
              <li><Link to="/#about" className="hover:text-gold transition-colors">Sobre Nós</Link></li>
              <li><Link to="/#contact" className="hover:text-gold transition-colors">Fale Conosco</Link></li>
              <li><Link to="/politica-de-privacidade" className="hover:text-gold transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/termos-de-servico" className="hover:text-gold transition-colors">Termos de Serviço</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/30">
          <span>© {new Date().getFullYear()} ComprasChina. Todos os direitos reservados.</span>
          <span>Powered by CSSBuy</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
