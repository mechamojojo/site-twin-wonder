import { useLocation, Link, useNavigate } from "react-router-dom";
import { apiUrl } from "@/lib/api";
import { ensureHttpsImage } from "@/lib/utils";
import { isValidProductUrl } from "@/lib/urlValidation";
import { ExternalLink, ShoppingCart, ArrowLeft, RefreshCw, AlertCircle, Search, Save } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { detectCategory, categorySupportsKeepBox } from "@/lib/shipping";
import { getDisplayPriceBrl, priceCnyToBrl } from "@/lib/pricing";
import { toast } from "sonner";

const getQueryParam = (search: string, key: string) => {
  const params = new URLSearchParams(search);
  return params.get(key) ?? "";
};

const ADMIN_TOKEN_KEY = "compraschina-admin-token";

/** Valores que parecem tamanhos (M, L, XL, números 36-46 para calçados, etc.) */
const SIZE_LIKE = /^(M|L|XL|XXL|2XL|3XL|4XL|S|XS|均码|自由|Free|Large|Medium|Small|One\s*Size)$/i;
const SIZE_NUM = /^(3[4-9]|4[0-6])(\.5)?(码|号)?$|^\d{2,3}\s*(men|women|男|女)?$/i;
const SIZE_SPEC = /^C\d+\/\d+cm$|^J\d+\/\d+cm$|^M\d+m?\d*\/[\d-]+ code$|^M\d+\/[\d-]+ code$|^M\d+ code$/i;

/** Detecta se o grupo é de tamanho (para UX quantidade por tamanho). Usa valores quando o nome é ambíguo. */
const isSizeGroup = (name: string, values?: string[]) => {
  if (/cor|color|颜色|色彩|estilo|款式|modelo|型号|style/i.test(name)) return false;
  if (values && values.length > 0) {
    const allLookLikeSizes = values.every((v) => SIZE_LIKE.test(v.trim()) || SIZE_NUM.test(v.trim()) || SIZE_SPEC.test(v.trim()));
    if (allLookLikeSizes) return true;
  }
  return /tamanho|size|尺码|尺寸|尺码选择/i.test(name);
};

/** Grupo de nível de qualidade (não deve ser usado como galeria de imagens). */
const isQualityGradeGroup = (name: string) =>
  /^Quality grade$/i.test(name) || /品质等级|quality\s*level|quality\s*grade|nível\s*de\s*qualidade/i.test(name.trim());

const getSourceLabel = (url: string) => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("taobao")) return "Taobao";
    if (host.includes("1688")) return "1688";
    if (host.includes("weidian")) return "Weidian";
    if (host.includes("tmall")) return "TMALL";
    if (host.includes("jd.com") || host.includes("jd.")) return "JD.com";
    if (host.includes("pinduoduo") || host.includes("yangkeduo")) return "Pinduoduo";
    if (host.includes("goofish")) return "Goofish";
    if (host.includes("dangdang")) return "Dangdang";
    if (host.includes("vip.com") || host.includes("vipshop")) return "VIP Shop";
    if (host.includes("yupoo")) return "Yupoo";
    if (host.includes("cssbuy")) return "CSSBuy";
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
  const [disclaimerError, setDisclaimerError] = useState(false);
  const disclaimerDetailsRef = useRef<HTMLDetailsElement>(null);
  const [keepBox, setKeepBox] = useState(false);
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
    optionGroups: {
      name: string;
      values: string[];
      images: string[];
      displayAsImages?: boolean;
      inventoryByValue?: Record<string, number>;
      inventoryByColorAndValue?: Record<string, Record<string, number>>;
      priceByValue?: Record<string, number>;
    }[];
    specs: { key: string; value: string }[];
    description: string | null;
  } | null>(null);
  const [selectedOptionByGroup, setSelectedOptionByGroup] = useState<Record<string, string>>({});
  /** Quantidade por tamanho (estilo CSSBuy): M: 2, L: 1 */
  const [quantityBySize, setQuantityBySize] = useState<Record<string, number>>({});
  const [productPreviewLoading, setProductPreviewLoading] = useState(false);
  const [productPreviewError, setProductPreviewError] = useState<string | null>(null);
  const [saveSnapshotLoading, setSaveSnapshotLoading] = useState(false);
  const [adminTokenInvalidated, setAdminTokenInvalidated] = useState(false);

  const isAdmin = typeof sessionStorage !== "undefined" && !!sessionStorage.getItem(ADMIN_TOKEN_KEY) && !adminTokenInvalidated;
  const sourceLabel = url ? getSourceLabel(url) : "";

  const fetchProductPreview = useCallback(async (forceRefresh = false) => {
    if (!url) return;
    try {
      setProductPreviewLoading(true);
      setProductPreviewError(null);
      const nocache = forceRefresh ? "&nocache=1" : "";
      const res = await fetch(apiUrl(`/api/product/preview?url=${encodeURIComponent(url)}${nocache}`));
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Preview indisponível");
      }
      const data = await res.json();
      let optionGroups = Array.isArray(data.optionGroups) ? data.optionGroups : [];
      const variants = data.variants ?? {};
      if (optionGroups.length === 0 && (variants.color?.length || variants.size?.length)) {
        optionGroups = [];
        if (variants.color?.length) {
          const imgs = variants.colorImages ?? [];
          optionGroups.push({
            name: "Cor",
            values: variants.color,
            images: imgs.slice(0, variants.color.length),
          });
        }
        if (variants.size?.length) {
          optionGroups.push({
            name: "Tamanho",
            values: variants.size,
            images: [],
          });
        }
      }
      setProductPreview({
        title: data.title ?? null,
        titlePt: data.titlePt ?? null,
        priceCny: data.priceCny ?? null,
        images: Array.isArray(data.images) ? data.images : [],
        variants,
        optionGroups,
        specs: Array.isArray(data.specs) ? data.specs : [],
        description: data.description ?? null,
      });
      setSelectedImageIndex(0);
      setSelectedOptionByGroup({});
      setQuantityBySize({});
    } catch {
      setProductPreview(null);
    } finally {
      setProductPreviewLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchProductPreview();
  }, [fetchProductPreview]);

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

  // Preço efetivo: da variante selecionada (priceByValue por grupo). Prioriza Quality grade quando selecionado, depois Cor/Estilo, depois base.
  const effectivePriceCny = (() => {
    if (!productPreview?.priceCny) return null;
    const groupsWithPrice = (productPreview.optionGroups ?? []).filter((g) => {
      const selected = selectedOptionByGroup[g.name];
      return selected && g.priceByValue?.[selected] != null;
    });
    const qualityGroup = groupsWithPrice.find((g) => isQualityGradeGroup(g.name));
    const groupWithPrice = qualityGroup ?? groupsWithPrice[0];
    if (groupWithPrice) {
      const selected = selectedOptionByGroup[groupWithPrice.name];
      if (selected && groupWithPrice.priceByValue?.[selected] != null)
        return groupWithPrice.priceByValue[selected];
    }
    return productPreview.priceCny;
  })();

  // Quando o product preview ou a variante selecionada mudar, atualiza o preço em reais (usa preço da variante quando existir)
  useEffect(() => {
    if (!url || effectivePriceCny == null || productPreviewLoading) return;
    let cancelled = false;
    const priceParam = effectivePriceCny !== productPreview?.priceCny ? `&priceCny=${effectivePriceCny}` : "";
    fetch(apiUrl(`/api/price/preview?url=${encodeURIComponent(url)}${priceParam}`))
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
  }, [url, effectivePriceCny, productPreview?.priceCny, productPreviewLoading]);

  const saveSnapshotForAll = useCallback(async () => {
    if (!url || !productPreview) return;
    const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(ADMIN_TOKEN_KEY) : null;
    if (!token) return;
    try {
      setSaveSnapshotLoading(true);
      const res = await fetch(apiUrl("/api/admin/product-preview/save"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          url,
          data: { ...productPreview, rawUrl: url },
        }),
      });
      if (res.status === 401) {
        if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setAdminTokenInvalidated(true);
        setSaveSnapshotLoading(false);
        toast.error("Sessão expirada. Faça login em /admin e clique em \"Salvar para todos\" de novo.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Falha ao salvar");
      }
      toast.success("Página salva. Todos os usuários verão esta mesma página ao abrir este link.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar página");
    } finally {
      setSaveSnapshotLoading(false);
    }
  }, [url, productPreview]);

  if (!url) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground mb-6">
            Nenhum produto selecionado. Informe o link do produto na página inicial ou pesquise por palavras-chave.
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

      <main className="container mx-auto px-4 py-10 pb-[max(5rem,env(safe-area-inset-bottom))] max-w-6xl">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Continuar comprando
          </Link>
          <span aria-hidden>·</span>
          <span className="text-foreground/80">
            {productPreviewLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                Buscando informações do produto...
              </span>
            ) : (
              "Produto"
            )}
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10 items-start">
          {/* Coluna esquerda: galeria do produto */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card sticky top-[4.5rem]">
              {productPreviewLoading && (
                <div className="animate-pulse">
                  <div className="aspect-[4/3] bg-muted/60 min-h-[280px]" />
                  <div className="p-3 flex gap-2 border-t border-border">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-16 h-16 sm:w-20 sm:h-20 rounded bg-muted/60 shrink-0" />
                    ))}
                  </div>
                </div>
              )}

              {!productPreviewLoading && productPreview && (productPreview.images.length > 0 || productPreview.title || productPreview.titlePt || (productPreview.specs?.length ?? 0) > 0 || productPreview.description) && (
                <>
                  <div className="bg-[#f5f5f5] overflow-hidden">
                    {(productPreview.images.length > 0 || productPreview.optionGroups?.some((g) => (g.displayAsImages === true || (g.displayAsImages !== false && g.images?.some(Boolean))) && !isSizeGroup(g.name, g.values) && !isQualityGradeGroup(g.name))) ? (
                      <>
                        {/* Imagem principal — segue a miniatura clicada (grupo com imagens ou galeria) */}
                        <div className="aspect-square sm:aspect-[4/3] max-h-[420px] flex items-center justify-center p-4 sm:p-6 bg-white border-b border-[#e8e8e8]">
                          <img
                            src={ensureHttpsImage((() => {
                              const imageGroup = productPreview.optionGroups?.find((g) => !isSizeGroup(g.name, g.values) && !isQualityGradeGroup(g.name) && (g.displayAsImages === true || (g.displayAsImages !== false && g.images?.some(Boolean))));
                              const selectedVal = imageGroup ? selectedOptionByGroup[imageGroup.name] : undefined;
                              const imgIdx = selectedVal && imageGroup ? imageGroup.values.indexOf(selectedVal) : -1;
                              const optionImg = imageGroup && imgIdx >= 0 ? imageGroup.images?.[imgIdx] : null;
                              if (optionImg) return optionImg;
                              if (productPreview.images.length > 0) {
                                return productPreview.images[Math.min(selectedImageIndex, productPreview.images.length - 1)];
                              }
                              return imageGroup?.images?.[0] || "";
                            })())}
                            alt=""
                            className="max-w-full max-h-full w-auto h-auto object-contain"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                        {/* Miniaturas: clicar atualiza a opção e a imagem principal */}
                        <div className="p-3 flex gap-2 overflow-x-auto border-t border-[#e8e8e8] bg-white">
                          {(() => {
                            const imageGroup = productPreview.optionGroups?.find((g) => !isSizeGroup(g.name, g.values) && !isQualityGradeGroup(g.name) && (g.displayAsImages === true || (g.displayAsImages !== false && g.images?.some(Boolean))));
                            if (imageGroup && (imageGroup.displayAsImages === true || imageGroup.images?.some(Boolean))) {
                              const withThumbs = imageGroup.values
                                .map((value, i) => ({ value, i, thumb: imageGroup.images?.[i] }))
                                .filter(({ thumb }) => thumb && String(thumb).trim() !== "");
                              return withThumbs.map(({ value, i, thumb }) => {
                                const isSelected = selectedOptionByGroup[imageGroup.name] === value;
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSelectedOptionByGroup((prev) => ({ ...prev, [imageGroup.name]: value }))}
                                    className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded border-2 overflow-hidden bg-[#fafafa] transition-colors ${isSelected ? "border-china-red ring-2 ring-china-red/30" : "border-[#e0e0e0] hover:border-[#bdbdbd]"}`}
                                    title={value}
                                  >
                                    <img src={ensureHttpsImage(thumb!)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                  </button>
                                );
                              });
                            }
                            return productPreview.images.slice(0, 12).map((src, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setSelectedImageIndex(i)}
                                className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded border-2 overflow-hidden bg-[#fafafa] transition-colors ${
                                  selectedImageIndex === i ? "border-china-red ring-2 ring-china-red/30" : "border-[#e0e0e0] hover:border-[#bdbdbd]"
                                }`}
                              >
                                <img src={ensureHttpsImage(src)} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              </button>
                            ));
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="aspect-[4/3] flex items-center justify-center text-muted-foreground text-sm bg-white">
                        Sem imagens disponíveis
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{sourceLabel}</span>
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={saveSnapshotForAll}
                          disabled={saveSnapshotLoading}
                          className="text-xs text-amber-600 dark:text-amber-500 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                          title="Salvar esta página para que todos os usuários vejam o mesmo conteúdo (sem rodar o scrape de novo)"
                        >
                          <Save className={`w-3.5 h-3.5 ${saveSnapshotLoading ? "animate-pulse" : ""}`} />
                          {saveSnapshotLoading ? "Salvando..." : "Salvar para todos"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fetchProductPreview(true)}
                        disabled={productPreviewLoading}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 disabled:opacity-50"
                        title="Recarregar dados do produto"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${productPreviewLoading ? "animate-spin" : ""}`} />
                        Atualizar
                      </button>
                      <a href={url} target="_blank" rel="noreferrer" className="text-xs text-china-red font-medium hover:underline inline-flex items-center gap-1">
                        Abrir em nova aba <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
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
              {productPreviewLoading ? (
                /* Skeleton do conteúdo — estilo CSSBuy */
                <div className="animate-pulse space-y-5">
                  <div className="h-7 w-4/5 max-w-[280px] rounded bg-muted/60" />
                  <div className="h-4 w-full rounded bg-muted/60" />
                  <div className="h-4 w-3/4 max-w-[200px] rounded bg-muted/60" />
                  <div className="pb-4 border-b border-border space-y-3">
                    <div className="h-10 w-32 rounded bg-muted/60" />
                    <div className="h-3 w-full rounded bg-muted/50" />
                    <div className="h-3 w-2/3 rounded bg-muted/50" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-4 w-24 rounded bg-muted/50" />
                    <div className="h-4 w-24 rounded bg-muted/50" />
                    <div className="h-4 w-28 rounded bg-muted/50" />
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                    <div className="h-3 w-20 rounded bg-muted/50" />
                    <div className="h-3 w-full rounded bg-muted/50" />
                    <div className="h-3 w-1/2 rounded bg-muted/50" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-28 rounded bg-muted/50" />
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-14 w-14 rounded-lg bg-muted/60" />
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 space-y-2">
                    <div className="h-12 w-full rounded-xl bg-muted/60" />
                    <div className="h-11 w-full rounded-xl bg-muted/50" />
                  </div>
                </div>
              ) : (
                <>
              {/* Título do produto — como em qualquer e-commerce */}
              {(productPreview?.titlePt || productPreview?.title) && (
                <h1 className="font-heading font-bold text-foreground text-xl leading-snug">
                  {productPreview.titlePt || productPreview.title}
                </h1>
              )}
              {!(productPreview?.titlePt || productPreview?.title) && productPreview && (
                <h1 className="font-heading font-bold text-foreground text-xl leading-snug">
                  Produto
                </h1>
              )}

              {/* Preço direto em reais — sem valor fake enquanto carrega */}
              <div className="pb-4 border-b border-border">
                {preview?.totalProductBrl != null ? (
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
                        Preço em reais (já inclui nosso serviço)
                      </p>
                    )}
                  </>
                ) : productPreview?.priceCny != null ? (
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-2xl font-heading font-bold text-china-red">
                      R$ {priceCnyToBrl(productPreview.priceCny).toFixed(2)}
                    </span>
                  </div>
                ) : (productPreviewLoading || previewLoading) ? (
                  <div className="animate-pulse h-10 w-28 rounded bg-muted/50" />
                ) : null}
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
                    {productPreview.optionGroups.map((group, gIdx) =>
                      isSizeGroup(group.name, group.values) ? (
                        /* Estilo CSSBuy: quantidade por tamanho */
                        <div key={gIdx}>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">{group.name}:</p>
                          <ul className="space-y-3">
                            {group.values.map((value) => {
                              const qty = quantityBySize[value] ?? 0;
                              const colorGroup = productPreview.optionGroups.find((g) => /cor|color|estilo|style/i.test(g.name));
                              const selectedColor = colorGroup ? selectedOptionByGroup[colorGroup.name] : "";
                              const stock = group.inventoryByColorAndValue?.[selectedColor]?.[value] ?? group.inventoryByValue?.[value];
                              const maxQty = stock != null ? Math.min(99, stock) : 99;
                              const priceStr = preview?.totalProductBrl != null ? `R$ ${preview.totalProductBrl.toFixed(2)}` : productPreview.priceCny != null ? `R$ ${priceCnyToBrl(productPreview.priceCny).toFixed(2)}` : "—";
                              return (
                                <li key={value} className="flex items-center gap-3 flex-wrap border-b border-border/50 pb-3 last:border-0 last:pb-0">
                                  <span className="text-sm font-medium text-foreground min-w-[64px]">{value}</span>
                                  <span className="text-sm font-medium text-china-red">{priceStr}</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    Estoque: {stock != null ? stock : "consultar"}
                                  </span>
                                  <div className="flex items-center gap-0 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => setQuantityBySize((prev) => ({ ...prev, [value]: Math.max(0, (prev[value] ?? 0) - 1) }))}
                                      className="touch-target min-w-[44px] min-h-[44px] rounded-l-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted"
                                    >
                                      −
                                    </button>
                                    <input
                                      type="number"
                                      min={0}
                                      max={maxQty}
                                      className="w-12 min-h-[44px] text-center border-y border-border bg-background py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-china-red/40"
                                      value={qty}
                                      onChange={(e) => setQuantityBySize((prev) => ({ ...prev, [value]: Math.max(0, Math.min(maxQty, Number(e.target.value) || 0)) }))}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setQuantityBySize((prev) => ({ ...prev, [value]: Math.min(maxQty, (prev[value] ?? 0) + 1) }))}
                                      className="touch-target min-w-[44px] min-h-[44px] rounded-r-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted"
                                    >
                                      +
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                          {(() => {
                            const total = Object.values(quantityBySize).reduce((a, b) => a + b, 0);
                            return total > 0 ? (
                              <p className="text-sm font-semibold text-green-600 mt-2">Quantidade: {total}</p>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        /* Grupos não-tamanho: grid com miniaturas (cor) ou pills (Fabric etc) */
                        <div key={gIdx}>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">{group.name}:</p>
                          {(group.displayAsImages === true || (group.displayAsImages !== false && group.images?.some(Boolean))) ? (
                            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2">
                              {group.values
                                .map((value, i) => ({ value, i, thumb: group.images?.[i] || "" }))
                                .filter(({ thumb }) => thumb && thumb.trim() !== "")
                                .map(({ value, i, thumb }) => {
                                const isSelected = selectedOptionByGroup[group.name] === value;
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSelectedOptionByGroup((prev) => ({ ...prev, [group.name]: prev[group.name] === value ? "" : value }))}
                                    className={`flex flex-col items-center gap-1 p-2 sm:p-1.5 rounded-lg border-2 overflow-hidden transition-colors min-h-[52px] sm:min-h-0 ${
                                      isSelected ? "border-china-red ring-1 ring-china-red bg-china-red/5" : "border-border hover:border-muted-foreground/50 bg-muted/30"
                                    }`}
                                    title={value}
                                  >
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                      <img src={ensureHttpsImage(thumb)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }} />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {group.values.map((value, i) => {
                                const isSelected = selectedOptionByGroup[group.name] === value;
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSelectedOptionByGroup((prev) => ({ ...prev, [group.name]: prev[group.name] === value ? "" : value }))}
                                    className={`touch-target min-h-[44px] px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                                      isSelected ? "border-china-red bg-china-red/5 text-foreground" : "border-border bg-muted/30 hover:border-muted-foreground/50 text-foreground"
                                    }`}
                                    title={value}
                                  >
                                    {value}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-2">
                            {preview?.totalProductBrl != null ? `R$ ${preview.totalProductBrl.toFixed(2)}` : productPreview.priceCny != null ? `R$ ${priceCnyToBrl(productPreview.priceCny).toFixed(2)}` : "—"} · Inventário: consultar
                          </p>
                        </div>
                      )
                    )}
                    {!productPreview.optionGroups.some((g) => isSizeGroup(g.name, g.values)) && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Quantidade:</p>
                        <div className="flex items-center gap-0 w-fit">
                          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="touch-target min-w-[44px] min-h-[44px] rounded-l-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">−</button>
                          <input type="number" min={1} max={99} className="w-12 min-h-[44px] text-center border-y border-border bg-background py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-china-red/40" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} />
                          <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="touch-target min-w-[44px] min-h-[44px] rounded-r-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">+</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (productPreview?.variants?.color?.length || productPreview?.variants?.size?.length) ? (
                  <>
                    {productPreview.variants.color?.length ? (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Cor / estilo:</p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2">
                          {productPreview.variants.color.map((c, i) => {
                            const isSelected = selectedColor === c;
                            const thumb = productPreview.variants?.colorImages?.[i] ?? productPreview.images?.[i];
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setSelectedColor(selectedColor === c ? "" : c)}
                                className={`flex flex-col items-center gap-1 p-2 sm:p-1.5 rounded-lg border-2 overflow-hidden transition-colors min-h-[52px] sm:min-h-0 ${
                                  isSelected ? "border-china-red ring-1 ring-china-red bg-china-red/5" : "border-border hover:border-muted-foreground/50 bg-muted/30"
                                }`}
                                title={c}
                              >
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                  {thumb ? (
                                    <img src={ensureHttpsImage(thumb)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }} />
                                  ) : (
                                    <span className="text-[10px] font-medium text-muted-foreground">{c.slice(0, 4)}</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {preview?.totalProductBrl != null ? `R$ ${preview.totalProductBrl.toFixed(2)}` : productPreview.priceCny != null ? `R$ ${priceCnyToBrl(productPreview.priceCny).toFixed(2)}` : "—"} · Inventário: consultar
                        </p>
                        {!productPreview.variants.size?.length && (
                          <div className="flex items-center gap-0 mt-2">
                            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="touch-target min-w-[44px] min-h-[44px] rounded-l-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">−</button>
                            <input type="number" min={1} max={99} className="w-12 min-h-[44px] text-center border-y border-border bg-background py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-china-red/40" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} />
                            <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="touch-target min-w-[44px] min-h-[44px] rounded-r-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">+</button>
                          </div>
                        )}
                      </div>
                    ) : null}
                    {productPreview.variants.size?.length ? (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Tamanho (quantidade por tamanho):</p>
                        <ul className="space-y-3">
                          {productPreview.variants.size.map((value) => {
                            const sizeGroup = productPreview.optionGroups?.find((g) => isSizeGroup(g.name, g.values));
                            const colorGroup = productPreview.optionGroups?.find((g) => /cor|color|estilo|style/i.test(g.name));
                            const selectedColor = colorGroup ? selectedOptionByGroup[colorGroup.name] : "";
                            const stock = sizeGroup?.inventoryByColorAndValue?.[selectedColor]?.[value] ?? sizeGroup?.inventoryByValue?.[value];
                            const maxQty = stock != null ? Math.min(99, stock) : 99;
                            const qty = quantityBySize[value] ?? 0;
                            const priceStr = preview?.totalProductBrl != null ? `R$ ${preview.totalProductBrl.toFixed(2)}` : productPreview.priceCny != null ? `R$ ${priceCnyToBrl(productPreview.priceCny).toFixed(2)}` : "—";
                            return (
                              <li key={value} className="flex items-center gap-3 flex-wrap border-b border-border/50 pb-3 last:border-0 last:pb-0">
                                <span className="text-sm font-medium text-foreground min-w-[64px]">{value}</span>
                                <span className="text-sm font-medium text-china-red">{priceStr}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  Estoque: {stock != null ? stock : "consultar"}
                                </span>
                                <div className="flex items-center gap-0 ml-auto">
                                  <button type="button" onClick={() => setQuantityBySize((prev) => ({ ...prev, [value]: Math.max(0, (prev[value] ?? 0) - 1) }))} className="touch-target min-w-[44px] min-h-[44px] rounded-l-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">−</button>
                                  <input type="number" min={0} max={maxQty} className="w-12 min-h-[44px] text-center border-y border-border bg-background py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-china-red/40" value={qty} onChange={(e) => setQuantityBySize((prev) => ({ ...prev, [value]: Math.max(0, Math.min(maxQty, Number(e.target.value) || 0)) }))} />
                                  <button type="button" onClick={() => setQuantityBySize((prev) => ({ ...prev, [value]: Math.min(maxQty, (prev[value] ?? 0) + 1) }))} className="touch-target min-w-[44px] min-h-[44px] rounded-r-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">+</button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        {(() => {
                          const total = Object.values(quantityBySize).reduce((a, b) => a + b, 0);
                          return total > 0 ? <p className="text-sm font-semibold text-green-600 mt-2">Quantidade: {total}</p> : null;
                        })()}
                      </div>
                    ) : null}
                    {!productPreview.variants.color?.length && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Quantidade:</p>
                        <div className="flex items-center gap-0 w-fit">
                          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="touch-target min-w-[44px] min-h-[44px] rounded-l-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">−</button>
                          <input type="number" min={1} max={99} className="w-12 min-h-[44px] text-center border-y border-border bg-background py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-china-red/40" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} />
                          <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="touch-target min-w-[44px] min-h-[44px] rounded-r-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">+</button>
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
                      <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="touch-target min-w-[44px] min-h-[44px] rounded-l-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">−</button>
                      <input type="number" min={1} max={99} className="w-12 min-h-[44px] text-center border-y border-border bg-background py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-china-red/40" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} />
                      <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="touch-target min-w-[44px] min-h-[44px] rounded-r-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted">+</button>
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

                <details
                  ref={disclaimerDetailsRef}
                  open={disclaimerError}
                  className={`rounded-lg border overflow-hidden transition-colors ${
                    disclaimerError ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-500/50" : "border-border bg-muted/20"
                  }`}
                >
                  <summary className="px-3 py-2 text-[11px] text-muted-foreground cursor-pointer hover:bg-muted/30">
                    Isenção de responsabilidade
                  </summary>
                  <div className="p-3 pt-0 text-[11px] text-muted-foreground space-y-2">
                    <p className="leading-relaxed">
                      Os produtos são vendidos por lojas nos marketplaces chineses (Taobao, 1688, Weidian etc.). A ComprasChina realiza a compra em seu nome e cuida de todo o envio até o Brasil. A qualidade e as especificações dependem do vendedor na plataforma de origem; verifique as informações antes de finalizar.
                    </p>
                    <label className="flex items-start gap-2 cursor-pointer" onClick={() => setDisclaimerError(false)}>
                      <input
                        type="checkbox"
                        checked={disclaimerAccepted}
                        onChange={(e) => { setDisclaimerAccepted(e.target.checked); setDisclaimerError(false); }}
                        className="mt-0.5 rounded border-border"
                      />
                      <span>Li e concordo com o aviso e os termos de serviço.</span>
                    </label>
                    {disclaimerError && (
                      <p className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                        Aceite a isenção de responsabilidade para continuar.
                      </p>
                    )}
                  </div>
                </details>

                {/* CTAs no estilo e-commerce: Comprar agora em destaque */}
                <div className="flex flex-col gap-2 pt-1">
                  {(() => {
                    const hasQuantityBySize = Object.values(quantityBySize).some((q) => q > 0);
                    const effectiveQuantity = hasQuantityBySize
                      ? Object.values(quantityBySize).reduce((a, b) => a + b, 0)
                      : quantity;
                    const sizeBreakdown = Object.entries(quantityBySize)
                      .filter(([, q]) => q > 0)
                      .map(([s, q]) => `${s} x${q}`)
                      .join(", ");
                    const colorGroup = productPreview?.optionGroups?.find((g) => /^(Cor|Color|Style|Estilo|颜色|款式|Cor \/ Estilo)$/i.test(g.name));
                    const selectedColorValue = selectedColor || (colorGroup ? selectedOptionByGroup[colorGroup.name] : undefined);
                    const colorImgIdx = selectedColorValue && colorGroup ? colorGroup.values.indexOf(selectedColorValue) : -1;
                    const selectedVariantImage =
                      (colorGroup && colorImgIdx >= 0 && colorGroup.images?.[colorImgIdx])
                        ? colorGroup.images[colorImgIdx]
                        : productPreview?.images?.[Math.min(selectedImageIndex, (productPreview?.images?.length ?? 1) - 1)]
                          ?? colorGroup?.images?.[0]
                          ?? productPreview?.images?.[0];
                    const otherOptions = Object.entries(selectedOptionByGroup)
                      .filter(([, v]) => v)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("; ");
                    const colorPart = selectedColorValue ? `Cor: ${selectedColorValue}` : "";
                    const optsAndSize =
                      productPreview?.optionGroups?.length
                        ? [otherOptions, sizeBreakdown]
                        : [colorPart, sizeBreakdown];
                    const variationStr =
                      productPreview?.optionGroups?.length || productPreview?.variants?.size?.length || productPreview?.variants?.color?.length
                        ? optsAndSize.filter(Boolean).join("; ")
                        : variation.trim();

                    // Detect product category for keepBox eligibility
                    const productCategory = detectCategory(
                      productPreview?.titlePt ?? productPreview?.title,
                    );
                    const supportsKeepBox = categorySupportsKeepBox(productCategory);

                    const handleAddToCart = () => {
                      if (!url) return;
                      if (!disclaimerAccepted) {
                        setDisclaimerError(true);
                        disclaimerDetailsRef.current?.setAttribute("open", "");
                        disclaimerDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        return;
                      }
                      if (effectiveQuantity < 1) {
                        toast.error("Selecione pelo menos 1 unidade.");
                        return;
                      }
                      addItem({
                        url,
                        quantity: effectiveQuantity,
                        color: selectedColorValue || undefined,
                        size: hasQuantityBySize ? sizeBreakdown : selectedSize || undefined,
                        variation: variationStr || undefined,
                        notes: notes.trim() || undefined,
                        title: productPreview?.title ?? undefined,
                        titlePt: productPreview?.titlePt ?? undefined,
                        priceCny: effectivePriceCny ?? productPreview?.priceCny ?? undefined,
                        priceBrl: preview?.totalProductBrl ?? undefined,
                        image: selectedVariantImage ?? productPreview?.images?.[0] ?? undefined,
                        category: productCategory,
                        keepBox,
                      });
                      navigate("/carrinho");
                    };
                    return (
                      <>
                        {/* keepBox toggle — shown only for bulky-box categories */}
                        {supportsKeepBox && (
                          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                            <input
                              type="checkbox"
                              checked={keepBox}
                              onChange={(e) => setKeepBox(e.target.checked)}
                              className="rounded border-border w-4 h-4 accent-china-red"
                            />
                            <span className="text-sm text-muted-foreground">
                              Manter embalagem original
                              <span className="ml-1 text-xs text-muted-foreground/60">(+peso volumétrico)</span>
                            </span>
                          </label>
                        )}
                        <button type="button" onClick={handleAddToCart} className="w-full inline-flex items-center justify-center gap-2 bg-china-red text-white px-5 py-4 rounded-xl text-base font-heading font-bold hover:bg-china-red/90 transition-colors shadow-md">
                          Comprar agora
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!url) return;
                            if (!disclaimerAccepted) {
                              setDisclaimerError(true);
                              disclaimerDetailsRef.current?.setAttribute("open", "");
                              disclaimerDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                              return;
                            }
                            if (effectiveQuantity < 1) {
                              toast.error("Selecione pelo menos 1 unidade.");
                              return;
                            }
                            addItem({
                              url,
                              quantity: effectiveQuantity,
                              color: selectedColorValue || undefined,
                              size: hasQuantityBySize ? sizeBreakdown : selectedSize || undefined,
                              variation: variationStr || undefined,
                              notes: notes.trim() || undefined,
                              title: productPreview?.title ?? undefined,
                              titlePt: productPreview?.titlePt ?? undefined,
                              priceCny: effectivePriceCny ?? productPreview?.priceCny ?? undefined,
                              priceBrl: preview?.totalProductBrl ?? undefined,
                              image: selectedVariantImage ?? productPreview?.images?.[0] ?? undefined,
                              category: productCategory,
                              keepBox,
                            });
                            navigate("/carrinho");
                          }}
                          className="touch-target w-full min-h-[48px] inline-flex items-center justify-center gap-2 border-2 border-border text-foreground px-4 py-3 rounded-xl text-sm font-heading font-semibold hover:bg-muted/50 transition-colors"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Adicionar ao carrinho
                        </button>
                      </>
                    );
                  })()}
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
                </>
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
