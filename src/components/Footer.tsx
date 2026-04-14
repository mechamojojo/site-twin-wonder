import { Link } from "react-router-dom";
import { Mail, MessagesSquare, Send } from "lucide-react";
import {
  CONTACT_EMAIL,
  CNPJ,
  TELEGRAM_URL,
  TELEGRAM_DISPLAY,
} from "@/data/siteConfig";

const Footer = () => {
  return (
    <footer id="contact" className="bg-foreground py-14 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <Link to="/" className="text-2xl font-heading font-extrabold inline-block">
              <span className="text-china-red">Compras</span>
              <span className="text-gold">China</span>
            </Link>
            <p className="text-background/50 text-sm mt-4 leading-relaxed">
              Serviço brasileiro que facilita suas compras da China. Atendimento em português e envio direto para o Brasil.
            </p>
            <div className="flex flex-col gap-2 mt-5">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 text-sm text-background/70 hover:text-gold transition-colors"
              >
                <Mail className="w-4 h-4" />
                {CONTACT_EMAIL}
              </a>
              <Link
                to="/fale-conosco"
                className="inline-flex items-center gap-2 text-sm text-background/70 hover:text-gold transition-colors"
              >
                <MessagesSquare className="w-4 h-4" />
                Atendimento (chat no site)
              </Link>
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-background/70 hover:text-gold transition-colors"
              >
                <Send className="w-4 h-4" />
                Telegram {TELEGRAM_DISPLAY}
              </a>
              {CNPJ ? (
                <p className="text-sm text-background/50 pt-1">CNPJ {CNPJ}</p>
              ) : null}
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

        <div className="border-t border-background/10 mt-12 pt-8 flex flex-col gap-4 text-sm text-background/30">
          <p className="text-xs leading-relaxed text-background/25 max-w-3xl">
            <strong className="text-background/40">Aviso Legal:</strong> A ComprasChina atua como intermediária de compras (mandatária), adquirindo produtos indicados pelo cliente em marketplaces chineses (Taobao, 1688, Weidian, TMALL etc.) em seu nome. Não somos vendedores, distribuidores nem importadores comerciais. Os produtos exibidos neste site são exemplos de itens comprados por clientes e não constituem oferta, recomendação ou endosso. Não verificamos autenticidade, originalidade ou conformidade de produtos. A responsabilidade pela legalidade de cada importação, incluindo direitos de propriedade intelectual e normas aduaneiras, é exclusivamente do cliente.
          </p>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <span>
              © {new Date().getFullYear()} ComprasChina. Todos os direitos reservados.
              {CNPJ ? ` · CNPJ ${CNPJ}` : ""}
            </span>
            <div className="flex gap-4">
              <Link to="/termos-de-servico" className="hover:text-background/60 transition-colors">Termos de Serviço</Link>
              <Link to="/politica-de-privacidade" className="hover:text-background/60 transition-colors">Privacidade</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
