import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const TermosServico = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Termos de Serviço</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: março de 2026. Ao utilizar a ComprasChina, você declara ter lido e concordado com estes Termos.
        </p>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">

          {/* ── 1. NATUREZA DO SERVIÇO ── */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">1. Natureza do Serviço — Intermediário de Compras</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A ComprasChina atua exclusivamente como <strong>mandatária e intermediária de compras</strong> (agente de compras). Não somos vendedores, distribuidores, importadores comerciais nem representantes dos vendedores dos marketplaces chineses. Nossa função é adquirir, em nome e por conta do cliente, produtos já selecionados e indicados pelo próprio cliente em plataformas de terceiros (Taobao, 1688, Weidian, TMALL etc.), consolidá-los em nosso armazém parceiro e despachá-los ao endereço indicado no Brasil.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mt-3">
              A relação jurídica de compra e venda se dá diretamente entre o cliente e o vendedor da plataforma chinesa. A ComprasChina não é parte nessa relação e não assume responsabilidade pelas obrigações do vendedor.
            </p>
          </section>

          {/* ── 2. EXIBIÇÃO DE PRODUTOS — CARÁTER INFORMATIVO ── */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">2. Exibição de Produtos — Caráter Meramente Informativo</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Os produtos exibidos na plataforma (seções "Explorar", "O que estão comprando", destaques etc.) são exemplos de itens <strong>comprados por clientes</strong> nos marketplaces chineses por meio do nosso serviço de intermediação. Essa exibição tem caráter exclusivamente informativo e de referência; <strong>não constitui oferta, promoção, recomendação nem endosso</strong> de qualquer produto, marca, fabricante ou vendedor.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mt-3">
              A ComprasChina não produz, estoca, revende, distribui nem garante a qualidade de qualquer produto listado. Todas as imagens e descrições são provenientes das plataformas originais e pertencem aos respectivos vendedores e/ou detentores de direitos.
            </p>
          </section>

          {/* ── 3. PROPRIEDADE INTELECTUAL E AUTENTICIDADE ── */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">3. Propriedade Intelectual e Autenticidade dos Produtos</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A ComprasChina <strong>não verifica, certifica nem garante a autenticidade, originalidade ou procedência</strong> de qualquer produto disponível nas plataformas chinesas. Não temos meios de confirmar se um produto é genuíno, falsificado, réplica ou de fabricação independente.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mt-3">
              É responsabilidade exclusiva do cliente verificar, antes de realizar o pedido, se o produto desejado: (a) está em conformidade com a legislação brasileira de importação; (b) não viola direitos de propriedade intelectual de terceiros (marcas registradas, patentes, direitos autorais); (c) é legal para importação e uso no Brasil.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mt-3">
              A ComprasChina não se responsabiliza por eventuais apreensões aduaneiras, multas ou penalidades decorrentes de produtos que violem direitos de propriedade intelectual ou que sejam considerados ilegais pelas autoridades brasileiras. Os custos e consequências legais cabem inteiramente ao cliente.
            </p>
          </section>

          {/* ── 4. RESPONSABILIDADES DO CLIENTE ── */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">4. Responsabilidades do Cliente</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              O cliente é responsável por: (a) indicar corretamente o link do produto, variação (cor, tamanho, modelo), quantidade e endereço de entrega; (b) verificar a legalidade do produto para importação no Brasil; (c) certificar-se de que o produto não infringe direitos de terceiros; (d) arcar com impostos de importação, taxas aduaneiras (Imposto de Importação, ICMS-importação, IOF etc.) eventualmente cobrados pela Receita Federal do Brasil; (e) confirmar o limite de isenção vigente para importações de pessoa física (remessa internacional).
            </p>
          </section>

          {/* ── 5. PREÇOS, PAGAMENTO E TAXA DE SERVIÇO ── */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">5. Preços, Pagamento e Taxa de Serviço</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Os valores em reais informados na cotação incluem: o custo do produto (convertido para reais pela taxa de câmbio vigente), a taxa de serviço da ComprasChina e o frete internacional estimado. Eventuais impostos de importação cobrados pela Receita Federal não estão incluídos na cotação e são de responsabilidade do cliente. O pagamento é aceito em reais via PIX, boleto bancário e cartão de crédito.
            </p>
          </section>

          {/* ── 6. CANCELAMENTO E REEMBOLSO ── */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">6. Cancelamento e Reembolso</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Cancelamentos são aceitos antes da efetivação da compra na plataforma chinesa. Após a compra, o cancelamento depende da política do vendedor e pode não ser possível. Reembolsos parciais ou totais são analisados caso a caso. Em situações de apreensão aduaneira por violação de propriedade intelectual ou ilegalidade do produto, não há direito a reembolso por parte da ComprasChina, uma vez que o serviço de intermediação foi integralmente prestado.
            </p>
          </section>

          {/* ── 7. LIMITAÇÃO DE RESPONSABILIDADE ── */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">7. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A ComprasChina não se responsabiliza por: (a) qualidade, segurança ou conformidade dos produtos com normas técnicas brasileiras (INMETRO, ANVISA etc.); (b) atrasos causados por transportadoras, alfândega, Receita Federal ou condições extraordinárias; (c) danos decorrentes do uso dos produtos; (d) falsidade ou incorreção das informações prestadas pelo vendedor na plataforma de origem; (e) apreensão ou destruição de mercadorias por órgãos públicos. Nossa responsabilidade limita-se à prestação do serviço de intermediação conforme contratado.
            </p>
          </section>

          {/* ── 8. CONFORMIDADE LEGAL ── */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">8. Conformidade Legal</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              O cliente declara, ao realizar um pedido, que está agindo em conformidade com a legislação brasileira vigente, incluindo as normas de importação da Receita Federal, o Código de Defesa do Consumidor (Lei 8.078/90) no que couber, a Lei de Propriedade Industrial (Lei 9.279/96) e demais legislações aplicáveis. A utilização de nosso serviço para a importação de produtos falsificados, que infrinjam direitos de marca ou que sejam proibidos é vedada e de responsabilidade exclusiva do cliente.
            </p>
          </section>

          {/* ── 9. ALTERAÇÕES ── */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">9. Alterações dos Termos</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Podemos alterar estes Termos a qualquer momento. A versão vigente será sempre a publicada nesta página, com a data de atualização indicada no topo. O uso continuado da plataforma após alterações constitui aceitação dos novos termos.
            </p>
          </section>

          {/* ── 10. FORO ── */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">10. Foro e Lei Aplicável</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Estes Termos são regidos pela lei brasileira. Fica eleito o foro da comarca de domicílio do cliente para dirimir eventuais litígios, conforme o art. 101, I, do Código de Defesa do Consumidor.
            </p>
          </section>

        </div>

        <div className="mt-10 flex flex-wrap gap-6">
          <Link to="/politica-de-privacidade" className="text-sm text-china-red font-medium hover:underline">
            Política de Privacidade
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

export default TermosServico;
