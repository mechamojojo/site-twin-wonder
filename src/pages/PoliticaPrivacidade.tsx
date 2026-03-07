import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: março de 2026. A ComprasChina trata seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
        </p>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">1. Controlador dos Dados</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              O controlador dos seus dados pessoais é a ComprasChina, empresa brasileira de intermediação de compras internacionais. Para exercer seus direitos ou tirar dúvidas sobre o tratamento dos seus dados, entre em contato pelo e-mail <strong>contato@compraschina.com.br</strong> ou pelo WhatsApp disponível no site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">2. Dados que Coletamos</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Coletamos apenas os dados estritamente necessários para a prestação do serviço de intermediação:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>Dados de identificação: nome completo e CPF (quando necessário para fins aduaneiros).</li>
              <li>Dados de contato: e-mail e número de WhatsApp.</li>
              <li>Dados de entrega: CEP e endereço completo.</li>
              <li>Dados do pedido: link do produto, variação, quantidade e observações fornecidas.</li>
              <li>Dados de pagamento: processados por gateways certificados (Mercado Pago); não armazenamos dados de cartão.</li>
              <li>Dados de navegação: logs de acesso (IP, data/hora, páginas visitadas) para fins de segurança e cumprimento legal (Marco Civil da Internet — Lei 12.965/2014).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">3. Finalidades e Base Legal do Tratamento</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tratamos seus dados com base nas seguintes hipóteses previstas na LGPD:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li><strong>Execução de contrato (art. 7º, V):</strong> para processar pedidos, realizar compras em seu nome, consolidar pacotes e efetuar o envio ao Brasil.</li>
              <li><strong>Obrigação legal (art. 7º, II):</strong> para cumprir exigências da Receita Federal (NF-e, declaração aduaneira), Marco Civil da Internet e demais normas aplicáveis.</li>
              <li><strong>Interesse legítimo (art. 7º, IX):</strong> para prevenção a fraudes, segurança da plataforma e melhoria do serviço.</li>
              <li><strong>Consentimento (art. 7º, I):</strong> para envio de comunicações de marketing, quando o cliente optar por recebê-las.</li>
            </ul>
            <p className="text-muted-foreground text-sm leading-relaxed mt-3">
              Não vendemos, cedemos nem alugamos seus dados pessoais a terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Podemos compartilhar seus dados com: (a) parceiros logísticos e armazéns na China, na medida necessária para executar o pedido; (b) transportadoras e parceiros de entrega no Brasil; (c) gateway de pagamento (Mercado Pago) para processamento seguro; (d) autoridades públicas quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">5. Transferência Internacional de Dados</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Para executar o serviço de intermediação, seus dados (nome, endereço, dados do pedido) podem ser transferidos a parceiros localizados na China. Adotamos cláusulas contratuais para garantir nível adequado de proteção, conforme as diretrizes da ANPD.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">6. Prazo de Retenção</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Mantemos seus dados pelo tempo necessário para: (a) executar o contrato e resolver eventuais disputas; (b) cumprir obrigações legais e fiscais (prazo mínimo de 5 anos para documentos contábeis e fiscais); (c) atender a requisições de autoridades públicas. Após o prazo necessário, os dados são eliminados ou anonimizados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">7. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Nos termos da LGPD, você tem direito a: (a) confirmar a existência de tratamento; (b) acessar seus dados; (c) corrigir dados incompletos, inexatos ou desatualizados; (d) solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei; (e) portabilidade dos dados; (f) revogar o consentimento a qualquer momento; (g) obter informações sobre os terceiros com quem compartilhamos seus dados; (h) apresentar petição à ANPD.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mt-3">
              Para exercer seus direitos, envie solicitação para <strong>contato@compraschina.com.br</strong>. Responderemos em até 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">8. Cookies e Rastreamento</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Utilizamos cookies técnicos essenciais para o funcionamento da plataforma (sessão, autenticação, carrinho). Não utilizamos cookies de rastreamento publicitário de terceiros sem seu consentimento explícito.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">9. Segurança</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados, incluindo criptografia em trânsito (HTTPS/TLS), controle de acesso restrito e monitoramento de segurança. Em caso de incidente que possa acarretar risco ou dano a titulares, notificaremos a ANPD e os afetados conforme exigido pela LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">10. Alterações desta Política</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Podemos atualizar esta Política periodicamente. A data da última atualização será sempre indicada no topo desta página. Para alterações materiais que afetem seus direitos, comunicaremos por e-mail ou aviso no site.
            </p>
          </section>

        </div>

        <div className="mt-10 flex flex-wrap gap-6">
          <Link to="/termos-de-servico" className="text-sm text-china-red font-medium hover:underline">
            Termos de Serviço
          </Link>
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
