import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const TermosServico = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Termos de Serviço</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 2024. Ao usar a ComprasChina, você concorda com estes termos.
        </p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">1. Serviço</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A ComprasChina atua como intermediária de compras: você envia o link do produto e os dados do
              pedido; nós cotamos em reais, você paga em reais (PIX, cartão ou boleto) e nós realizamos a compra
              na China usando nossa estrutura (incluindo parceiros como a CSSBuy) e enviamos até você no Brasil.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">2. Responsabilidades do cliente</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Você é responsável por informar corretamente o link do produto, variação (cor, tamanho),
              quantidade e endereço de entrega. É sua responsabilidade verificar a autenticidade das informações
              do produto no site de origem e aceitar os riscos associados à qualidade e à entrega internacional.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">3. Preços e pagamento</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Os valores finais em reais (incluindo taxa de serviço e frete) são informados pela ComprasChina
              antes do pagamento. O pagamento é feito em reais. Impostos de importação e eventuais taxas
              aduaneiras podem ser aplicados pela Receita Federal; orientamos sobre isso quando relevante.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">4. Cancelamento e reembolso</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Cancelamentos e reembolsos são tratados conforme a política específica informada no momento da
              compra e conforme a legislação aplicável. Em geral, após a compra ter sido realizada na China, o
              cancelamento pode não ser possível; reembolsos parciais ou totais dependem do caso.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">5. Limitação de responsabilidade</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A ComprasChina não se responsabiliza por atrasos ou perdas causados por transportadoras, alfândega
              ou por informações incorretas fornecidas pelo cliente ou pelo site de origem. Nosso compromisso é
              com a transparência e o cumprimento do combinado em cada pedido.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">6. Alterações</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Podemos alterar estes termos a qualquer momento. A versão vigente será a publicada nesta página.
              O uso continuado do site após alterações constitui aceitação dos novos termos.
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

export default TermosServico;
