import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 2024. A ComprasChina respeita sua privacidade e trata seus dados conforme esta política.
        </p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">1. Dados que coletamos</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Coletamos apenas os dados necessários para processar seus pedidos e entrar em contato: nome, e-mail,
              número de WhatsApp, CEP e endereço de entrega quando você faz um pedido. Também registramos o link
              do produto, quantidade e observações que você enviar.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">2. Uso dos dados</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Usamos seus dados para: (a) processar e enviar seu pedido; (b) enviar orçamentos em reais e
              instruções de pagamento; (c) comunicar atualizações de envio e suporte; (d) cumprir obrigações
              legais quando aplicável. Não vendemos seus dados a terceiros para marketing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">3. Armazenamento e segurança</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Seus dados são armazenados em servidores seguros e acessados apenas por nossa equipe para fins
              operacionais. Mantemos os dados pelo tempo necessário para cumprir obrigações legais e resolver
              disputas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">4. Seus direitos</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Você pode solicitar acesso, correção ou exclusão dos seus dados pessoais entrando em contato conosco
              pelo canal “Fale Conosco” ou pelo e-mail informado no site. Respeitamos as disposições da LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">5. Alterações</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Podemos atualizar esta política periodicamente. A data da última atualização será indicada no topo
              desta página. O uso continuado do site após alterações constitui aceitação da nova versão.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <Link to="/#contact" className="text-sm text-china-red font-medium hover:underline">
            Fale Conosco
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PoliticaPrivacidade;
