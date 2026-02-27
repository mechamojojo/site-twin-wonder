import { useLocation, Link, useNavigate } from "react-router-dom";
import { apiUrl } from "@/lib/api";
import { ensureHttpsImage } from "@/lib/utils";
import { isValidProductUrl } from "@/lib/urlValidation";
import { ExternalLink, ShoppingCart, ArrowLeft, RefreshCw, AlertCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";

const getQueryParam = (search: string, key: string) => {
  const params = new URLSearchParams(search);
  return params.get(key) ?? "";
};

const getSourceLabel = (url: string) => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("taobao")) return "Taobao";
    if (host.includes("1688")) return "1688";
    if (host.includes("weidian")) return "Weidian";
    if (host.includes("tmall")) return "TMALL";
    if (host.includes("jd.com")) return "JD.com";
    if (host.includes("pinduoduo")) return "Pinduoduo";
    if (host.includes("goofish")) return "Goofish";
    if (host.includes("dangdang")) return "Dangdang";
    if (host.includes("vip.com") || host.includes("vipshop")) return "VIP Shop";
    return "Loja chinesa";
  } catch {
    return "Loja chinesa";
  }
};

const Order = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const url = getQueryParam(location.search, "url");

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [variation, setVariation] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<{
    productPriceCny: number;
    rateCnyToBrl: number;
    costBrl?: number;
    marginPercent?: number;
    totalProductBrl: number;
  } | null>(null);

  const [productPreview, setProductPreview] = useState<{
    title: string | null;
    titlePt: string | null;
    priceCny: number | null;
    images: string[];
    variants: { color?: string[]; size?: string[]; colorImages?: string[] };
    optionGroups: { name: string; values: string[]; images: string[] }[];
    specs: { key: string; value: string }[];
    description: string | null;
  } | null>(null);
  const [selectedOptionByGroup, setSelectedOptionByGroup] = useState<Record<string, string>>({});
  const [productPreviewLoading, setProductPreviewLoading] = useState(false);
  const [productPreviewError, setProductPreviewError] = useState<string | null>(null);

  const sourceLabel = url ? getSourceLabel(url) : "";

  useEffect(() => {
    const fetchProductPreview = async () => {
      if (!url) return;
      try {
        setProductPreviewLoading(true);
        setProductPreviewError(null);
        const res = await fetch(apiUrl(`/api/product/preview?url=${encodeURIComponent(url)}`));
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Preview indisponível");
        }
        const data = await res.json();
        setProductPreview({
          title: data.title ?? null,
          titlePt: data.titlePt ?? null,
          priceCny: data.priceCny ?? null,
          images: Array.isArray(data.images) ? data.images : [],
          variants: data.variants ?? {},
          optionGroups: Array.isArray(data.optionGroups) ? data.optionGroups : [],
          specs: Array.isArray(data.specs) ? data.specs : [],
          description: data.description ?? null,
        });
        setSelectedImageIndex(0);
        setSelectedOptionByGroup({});
      } catch {
        setProductPreview(null);
      } finally {
        setProductPreviewLoading(false);
      }
    };
    fetchProductPreview();
  }, [url]);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!url) return;
      try {
        setPreviewLoading(true);
        const res = await fetch(apiUrl(`/api/price/preview?url=${encodeURIComponent(url)}`));
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Não foi possível obter o preço aproximado.");
        }
        const data = await res.json();
        setPreview({
          productPriceCny: data.productPriceCny,
          rateCnyToBrl: data.rateCnyToBrl,
          costBrl: data.costBrl,
          marginPercent: data.marginPercent,
          totalProductBrl: data.totalProductBrl,
        });
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    };
    fetchPreview();
  }, [url]);

  // Quando o product preview trouxer preço, atualiza o preço em reais (backend usa cache)
  useEffect(() => {
    if (!url || !productPreview?.priceCny || productPreviewLoading) return;
    let cancelled = false;
    fetch(apiUrl(`/api/price/preview?url=${encodeURIComponent(url)}`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPreview({
          productPriceCny: data.productPriceCny,
          rateCnyToBrl: data.rateCnyToBrl,
          costBrl: data.costBrl,
          marginPercent: data.marginPercent,
          totalProductBrl: data.totalProductBrl,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [url, productPreview?.priceCny, productPreviewLoading]);

  // Em desenvolvimento: se a API não retornar preço, usa valor de teste para você ver a tela
  useEffect(() => {
    if (import.meta.env.DEV && url && !productPreviewLoading && !previewLoading && preview == null && productPreview?.priceCny == null) {
      const t = setTimeout(() => {
        setPreview({
          productPriceCny: 100,
          rateCnyToBrl: 0.75,
          totalProductBrl: 101.25,
        });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [url, productPreviewLoading, previewLoading, preview, productPreview?.priceCny]);

  if (!url) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground mb-6">
            Nenhum produto selecionado. Cole o link do produto ou pesquise por palavras-chave na página inicial.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-china-red text-white px-6 py-3 rounded-full font-heading font-bold text-sm hover:bg-china-red/90 transition-colors"
          >
            Voltar para ComprasChina
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isValidProductUrl(url)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-20 max-w-lg mx-auto">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">Link inválido</h2>
            <p className="text-muted-foreground mb-4">
              O link informado não é válido ou não é de um marketplace suportado. Confirme se o link está correto e se é de Taobao, 1688, Weidian, TMALL, JD.com ou outras lojas chinesas.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Se você queria pesquisar produtos, use palavras-chave como "bolsa", "tenis" ou "celular" na barra de pesquisa.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-china-red text-white px-6 py-3 rounded-full font-heading font-bold text-sm hover:bg-china-red/90 transition-colors"
              >
                Voltar para ComprasChina
              </Link>
              <Link
                to="/explorar"
                className="inline-flex items-center gap-2 border border-border bg-background px-6 py-3 rounded-full font-heading font-bold text-sm hover:bg-muted transition-colors"
              >
                <Search className="w-4 h-4" />
                Explorar produtos
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-10 pb-20 max-w-6xl">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Continuar comprando
          </Link>
          <span aria-hidden>·</span>
          <span className="text-foreground/80">Produto</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10 items-start">
          {/* Coluna esquerda: galeria do produto */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card sticky top-[4.5rem]">
              {productPreviewLoading && (
                <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center min-h-[280px]">
                  <p className="text-sm text-muted-foreground">Carregando dados do produto...</p>
                </div>
              )}

              {!productPreviewLoading && productPreview && (productPreview.images.length > 0 || productPreview.title || productPreview.titlePt || (productPreview.specs?.length ?? 0) > 0 || productPreview.description) && (
                <>
                  <div className="bg-[#f5f5f5] overflow-hidden">
                    {productPreview.images.length > 0 ? (
                      <>
                        {/* Imagem principal — estilo CSSBuy: fundo claro, produto em destaque */}
                        <div className="aspect-square sm:aspect-[4/3] max-h-[420px] flex items-center justify-center p-4 sm:p-6 bg-white border-b border-[#e8e8e8]">
                          <img
                            src={ensureHttpsImage(productPreview.images[Math.min(selectedImageIndex, productPreview.images.length - 1)])}
                            alt=""
                            className="max-w-full max-h-full w-auto h-auto object-contain"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                        {/* Galeria de miniaturas — fila horizontal com borda cinza (estilo CSSBuy) */}
                        <div className="p-3 flex gap-2 overflow-x-auto border-t border-[#e8e8e8] bg-white">
                          {productPreview.images.slice(0, 12).map((src, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedImageIndex(i)}
                              className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded border-2 overflow-hidden bg-[#fafafa] transition-colors ${
                                selectedImageIndex === i
                                  ? "border-china-red ring-2 ring-china-red/30"
                                  : "border-[#e0e0e0] hover:border-[#bdbdbd]"
                              }`}
                            >
                              <img
                                src={ensureHttpsImage(src)}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="aspect-[4/3] flex items-center justify-center text-muted-foreground text-sm bg-white">
                        Sem imagens disponíveis
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{sourceLabel}</span>
                    <a href={url} target="_blank" rel="noreferrer" className="text-xs text-china-red font-medium hover:underline inline-flex items-center gap-1">
                      Abrir em nova aba <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </>
              )}

              {!productPreviewLoading && (!productPreview || (
                productPreview.images.length === 0 && !productPreview.title && !productPreview.titlePt &&
                (productPreview.specs?.length ?? 0) === 0 && !productPreview.description
              )) && (
                <>
                  <div className="aspect-[4/3] bg-muted/50 relative min-h-[320px]">
                    <iframe
                      src={url}
                      title="Produto"
                      className="absolute inset-0 w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-end p-3">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-[11px] font-medium bg-black/30 px-2.5 py-1 rounded-full backdrop-blur-sm"
                      >
                        Abrir em nova aba
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div className="p-4 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      {sourceLabel}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Coluna direita: experiência de compra ComprasChina */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-[4.5rem] rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
              {/* Título do produto — como em qualquer e-commerce */}
              {(productPreview?.titlePt || productPreview?.title) && (
                <h1 className="font-heading font-bold text-foreground text-xl leading-snug">
                  {productPreview.titlePt || productPreview.title}
                </h1>
              )}
              {!(productPreview?.titlePt || productPreview?.title) && (
                <h1 className="font-heading font-bold text-foreground text-xl leading-snug">
                  Produto
                </h1>
              )}

              {/* Preço direto em reais — você paga aqui, pela comunidade */}
              <div className="pb-4 border-b border-border">
                {preview && (
                  <>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-3xl font-heading font-bold text-china-red">
                        R$ {preview.totalProductBrl.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground/70" title="Atualizado pela ComprasChina">
                        <RefreshCw className="w-4 h-4 inline" />
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você paga em reais · Entrega no Brasil · Preço já inclui nosso serviço
                    </p>
                    {preview.productPriceCny != null && (
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                        Referência na loja: CNY ¥ {preview.productPriceCny.toFixed(2)}
                      </p>
                    )}
                  </>
                )}
                {!preview && productPreview?.priceCny != null && (
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-2xl font-heading font-bold text-china-red">
                      CNY ¥ {productPreview.priceCny.toFixed(2)}
                    </span>
                  </div>
                )}
                {!preview && !productPreview?.priceCny && previewLoading && (
                  <p className="text-sm text-muted-foreground">Calculando preço...</p>
                )}
                {!preview && !productPreview?.priceCny && !previewLoading && null}
              </div>

              {/* Mensagem de confiança */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">✓ Pagamento em reais</span>
                <span className="inline-flex items-center gap-1">✓ Entrega no Brasil</span>
                <span className="inline-flex items-center gap-1">✓ Você paga pela comunidade</span>
              </div>

              {/* Entrega — sensação de “enviamos para você” */}
              <div className="rounded-lg bg-muted/40 border border-border p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Entrega</p>
                <p className="text-xs text-muted-foreground">
                  Enviamos este produto até você no Brasil. O frete é calculado no carrinho conforme seu CEP.
                </p>
                <Link to="/#shipping" className="text-xs text-china-red font-medium hover:underline mt-1 inline-block">
                  Ver opções de frete →
                </Link>
              </div>

              {/* Escolha o tipo de produto: múltiplos grupos (estilo, cor, tamanho) com miniatura por opção */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Escolha as opções
                </p>
                {productPreview?.optionGroups && productPreview.optionGroups.length > 0 ? (
                  <>
                    {productPreview.optionGroups.map((group, gIdx) => (
                      <div key={gIdx}>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">{group.name}:</p>
                        <ul className="space-y-3">
                          {group.values.map((value, i) => {
                            const isSelected = selectedOptionByGroup[group.name] === value;
                            const thumb = group.images?.[i] || "";
                            const priceStr = preview ? `R$ ${preview.totalProductBrl.toFixed(2)}` : productPreview.priceCny != null ? `CNY ¥ ${productPreview.priceCny.toFixed(2)}` : "—";
                            return (
                              <li key={i} className="flex items-center gap-3 flex-wrap border-b border-border/50 pb-3 last:border-0 last:pb-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOptionByGroup((prev) => ({ ...prev, [group.name]: prev[group.name] === value ? "" : value }))}
                                  className={`shrink-0 w-12 h-12 rounded-lg border-2 overflow-hidden bg-muted flex items-center justify-center text-[10px] font-medium transition-colors ${
                                    isSelected ? "border-china-red ring-1 ring-china-red" : "border-border hover:border-muted-foreground/50"
                                  }`}
                                  title={value}
                                >
                                  {thumb ? (
                                    <img src={ensureHttpsImage(thumb)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }} />
                                  ) : null}
                                  <span className={thumb ? "hidden" : ""}>{value.slice(0, 2)}</span>
                                </button>
                                <span className="text-sm font-medium text-foreground min-w-[80px]">{value}</span>
                                <span className="text-sm font-medium text-china-red">{priceStr}</span>
                                <span className="text-[11px] text-muted-foreground">Inventário: consultar</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Quantidade:</p>
                      <div className="flex items-center gap-0 w-fit">
                        <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-l-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">−</button>
                        <input type="number" min={1} max={99} className="w-12 text-center border-y border-border bg-background py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-china-red/40" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} />
                        <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="w-9 h-9 rounded-r-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">+</button>
                      </div>
                    </div>
                  </>
                ) : (productPreview?.variants?.color?.length || productPreview?.variants?.size?.length) ? (
                  <>
                    {productPreview.variants.color?.length ? (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">cor / estilo:</p>
                        <ul className="space-y-3">
                          {productPreview.variants.color.map((c, i) => {
                            const isSelected = selectedColor === c;
                            const thumb = productPreview.variants?.colorImages?.[i] ?? productPreview.images[i];
                            const priceStr = preview ? `R$ ${preview.totalProductBrl.toFixed(2)}` : productPreview.priceCny != null ? `CNY ¥ ${productPreview.priceCny.toFixed(2)}` : "—";
                            return (
                              <li key={i} className="flex items-center gap-3 flex-wrap border-b border-border/50 pb-3 last:border-0 last:pb-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedColor(selectedColor === c ? "" : c)}
                                  className={`shrink-0 w-12 h-12 rounded-lg border-2 overflow-hidden bg-muted flex items-center justify-center text-[10px] font-medium transition-colors ${
                                    isSelected ? "border-china-red ring-1 ring-china-red" : "border-border hover:border-muted-foreground/50"
                                  }`}
                                  title={c}
                                >
                                  {thumb ? (
                                    <img src={ensureHttpsImage(thumb)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }} />
                                  ) : null}
                                  <span className={thumb ? "hidden" : ""}>{c.slice(0, 2)}</span>
                                </button>
                                <span className="text-sm font-medium text-foreground min-w-[80px]">{c}</span>
                                <span className="text-sm font-medium text-china-red">{priceStr}</span>
                                <span className="text-[11px] text-muted-foreground">Inventário: consultar</span>
                                <div className="flex items-center gap-0 ml-auto">
                                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-l border border-border bg-background flex items-center justify-center text-sm font-bold hover:bg-muted">−</button>
                                  <input type="number" min={1} max={99} className="w-10 h-8 text-center border-y border-border bg-background text-xs font-semibold outline-none focus:ring-1 focus:ring-china-red/40" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} />
                                  <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="w-8 h-8 rounded-r border border-border bg-background flex items-center justify-center text-sm font-bold hover:bg-muted">+</button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                    {productPreview.variants.size?.length ? (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Tamanho:</p>
                        <div className="flex flex-wrap gap-2">
                          {productPreview.variants.size.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedSize(selectedSize === s ? "" : s)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                selectedSize === s ? "border-china-red bg-china-red/10 text-china-red" : "border-border bg-background hover:border-china-red/50"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {!productPreview.variants.color?.length && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Quantidade:</p>
                        <div className="flex items-center gap-0 w-fit">
                          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-l-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">−</button>
                          <input type="number" min={1} max={99} className="w-12 text-center border-y border-border bg-background py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-china-red/40" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} />
                          <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="w-9 h-9 rounded-r-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">+</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Variação (cor, tamanho, etc.)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40"
                      placeholder="Ex: Preto, 42"
                      value={variation}
                      onChange={(e) => setVariation(e.target.value)}
                    />
                  </div>
                )}

                {!(productPreview?.optionGroups?.length) && !(productPreview?.variants?.color?.length) && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Quantidade:</p>
                    <div className="flex items-center gap-0">
                      <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-l-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">−</button>
                      <input type="number" min={1} max={99} className="w-12 text-center border-y border-border bg-background py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-china-red/40" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} />
                      <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="w-9 h-9 rounded-r-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">+</button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Observação do pedido (opcional)</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40 min-h-[72px] resize-y"
                    placeholder="Ex.: cor específica, tamanho, instruções para o vendedor..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <details className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                  <summary className="px-3 py-2 text-[11px] text-muted-foreground cursor-pointer hover:bg-muted/30">
                    Isenção de responsabilidade
                  </summary>
                  <div className="p-3 pt-0 text-[11px] text-muted-foreground space-y-2">
                    <p className="leading-relaxed">
                      Os produtos exibidos são de marketplaces de terceiros. A ComprasChina atua como intermediária. Verifique as informações e aceite os riscos associados à qualidade e autenticidade.
                    </p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={disclaimerAccepted}
                        onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                        className="mt-0.5 rounded border-border"
                      />
                      <span>Li e concordo com o aviso e os termos de serviço.</span>
                    </label>
                  </div>
                </details>

                {/* CTAs no estilo e-commerce: Comprar agora em destaque */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!url) return;
                      if (!disclaimerAccepted) {
                        alert("Por favor, abra \"Isenção de responsabilidade\" e aceite para continuar.");
                        return;
                      }
                      const variationStr = productPreview?.optionGroups?.length
                        ? Object.entries(selectedOptionByGroup).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("; ")
                        : variation.trim();
                      addItem({
                        url,
                        quantity,
                        color: selectedColor || undefined,
                        size: selectedSize || undefined,
                        variation: variationStr || undefined,
                        notes: notes.trim() || undefined,
                        title: productPreview?.title ?? undefined,
                        titlePt: productPreview?.titlePt ?? undefined,
                        priceCny: productPreview?.priceCny ?? undefined,
                        priceBrl: preview?.totalProductBrl ?? undefined,
                        image: productPreview?.images?.[0] ?? undefined,
                      });
                      navigate("/carrinho");
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-china-red text-white px-5 py-4 rounded-xl text-base font-heading font-bold hover:bg-china-red/90 transition-colors shadow-md"
                  >
                    Comprar agora
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!url) return;
                      const variationStr = productPreview?.optionGroups?.length
                        ? Object.entries(selectedOptionByGroup).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("; ")
                        : variation.trim();
                      addItem({
                        url,
                        quantity,
                        color: selectedColor || undefined,
                        size: selectedSize || undefined,
                        variation: variationStr || undefined,
                        notes: notes.trim() || undefined,
                        title: productPreview?.title ?? undefined,
                        titlePt: productPreview?.titlePt ?? undefined,
                        priceCny: productPreview?.priceCny ?? undefined,
                        priceBrl: preview?.totalProductBrl ?? undefined,
                        image: productPreview?.images?.[0] ?? undefined,
                      });
                      navigate("/carrinho");
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 border-2 border-border text-foreground px-4 py-3 rounded-xl text-sm font-heading font-semibold hover:bg-muted/50 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Adicionar ao carrinho
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground text-center pt-2 border-t border-border">
                  Produto da loja {sourceLabel}.{" "}
                  <a href={url} target="_blank" rel="noreferrer" className="text-china-red hover:underline inline-flex items-center gap-0.5">
                    Ver na loja original <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>

              {(productPreview?.specs?.length || productPreview?.description) && (
                <details className="rounded-lg border border-border overflow-hidden">
                  <summary className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 cursor-pointer">Detalhes do item</summary>
                  <div className="p-3 space-y-3 text-xs">
                    {productPreview.specs.length > 0 && (
                      <dl className="divide-y divide-border">
                        {productPreview.specs.slice(0, 10).map((s, i) => (
                          <div key={i} className="flex justify-between gap-2 py-1.5">
                            <dt className="text-muted-foreground">{s.key}</dt>
                            <dd className="text-foreground text-right">{s.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {productPreview.description && <p className="text-muted-foreground whitespace-pre-wrap line-clamp-6">{productPreview.description}</p>}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Order;
