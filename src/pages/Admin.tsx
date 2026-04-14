import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiUrl, publicUploadUrl } from "@/lib/api";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GripVertical,
  Loader2,
  Lock,
  LogOut,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Upload,
} from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/categoryLabels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FEATURED_PRODUCTS } from "@/data/featuredProducts";
import { EXPLORAR_PRODUCTS } from "@/data/explorarProducts";

type OrderWithDetails = {
  id: string;
  originalUrl: string;
  productDescription: string;
  productTitle: string | null;
  productImage: string | null;
  productColor: string | null;
  productSize: string | null;
  productVariation: string | null;
  quantity: number;
  status: string;
  cep: string;
  customerName: string | null;
  customerEmail: string | null;
  customerWhatsapp: string | null;
  customerCpf: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  deliveryInBrazil?: boolean;
  internationalAddressLines?: string | null;
  notes: string | null;
  checkoutGroupId?: string | null;
  orderItemsJson?: unknown;
  cssbuyOrderId: string | null;
  internalNotes: string | null;
  createdAt: string;
  quote?: { totalBrl: string };
  shipment?: { trackingCode: string | null; carrier: string | null } | null;
};

type CartSnapshotRow = {
  url?: string;
  quantity?: number;
  titlePt?: string | null;
  title?: string | null;
  lineProductBrl?: number;
  unitBrl?: number;
};

function parseCartSnapshot(raw: unknown): CartSnapshotRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === "object") as CartSnapshotRow[];
}

/** Primeiro pedido criado no grupo (mostra o snapshot completo uma vez). */
function isCartSnapshotLeader(
  o: OrderWithDetails,
  all: OrderWithDetails[],
): boolean {
  if (!o.checkoutGroupId) return true;
  const siblings = all.filter((x) => x.checkoutGroupId === o.checkoutGroupId);
  if (siblings.length <= 1) return true;
  const t = (x: OrderWithDetails) => new Date(x.createdAt).getTime();
  const leader = siblings.reduce((a, b) => (t(a) <= t(b) ? a : b));
  return leader.id === o.id;
}

function formatCpf(v: string | null): string {
  if (!v) return "";
  const d = v.replace(/\D/g, "");
  if (d.length !== 11) return v;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatAddress(o: OrderWithDetails): string {
  if (o.deliveryInBrazil === false && o.internationalAddressLines?.trim()) {
    return o.internationalAddressLines.trim();
  }
  const parts = [o.addressStreet, o.addressNumber, o.addressComplement].filter(
    Boolean,
  );
  const line1 = parts.join(", ");
  const line2 = [o.addressNeighborhood, o.addressCity, o.addressState]
    .filter(Boolean)
    .join(", ");
  const cepLine = o.cep && o.cep !== "00000000" ? `CEP ${o.cep}` : "";
  return [line1, line2, cepLine].filter(Boolean).join("\n");
}

function buildCssBuyCopyText(o: OrderWithDetails): string {
  const parts: string[] = [];
  if (o.productColor) parts.push(`Cor: ${o.productColor}`);
  if (o.productSize)
    parts.push(
      o.productSize.includes(" x")
        ? `Tamanhos: ${o.productSize}`
        : `Tamanho: ${o.productSize}`,
    );
  if (o.productVariation) parts.push(o.productVariation);
  if (o.notes) parts.push(o.notes);
  const nota = parts.length ? parts.join(" | ") : o.productDescription;

  const isExterior = o.deliveryInBrazil === false;
  const destBlock = isExterior
    ? "Destinatário (fora do Brasil / CSSBuy):"
    : "Destinatário Brasil:";
  const cpfLine = isExterior
    ? o.customerCpf
      ? `CPF/Documento: ${formatCpf(o.customerCpf)}`
      : "CPF/Documento: (não informado — conferir com cliente)"
    : `CPF: ${formatCpf(o.customerCpf)}`;

  return [
    "--- COMPRASCHINA → CSSBuy ---",
    `Link: ${o.originalUrl}`,
    `Título: ${o.productTitle || o.productDescription}`,
    `Nota (cor/tamanho/variante): ${nota}`,
    `Quantidade: ${o.quantity}`,
    "",
    destBlock,
    `Nome: ${o.customerName || "-"}`,
    cpfLine,
    `Endereço:\n${formatAddress(o)}`,
    `WhatsApp: ${o.customerWhatsapp || "-"}`,
    `E-mail: ${o.customerEmail || "-"}`,
    "---",
  ].join("\n");
}

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_COTACAO: "Aguardando cotação",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  ENVIADO_PARA_CSSBUY: "Enviado p/ CSSBuy",
  COMPRADO: "Comprado",
  NO_ESTOQUE: "No estoque",
  AGUARDANDO_ENVIO: "Aguardando envio",
  EM_ENVIO: "Em envio",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO_COTACAO: "bg-amber-100 text-amber-800",
  AGUARDANDO_PAGAMENTO: "bg-blue-100 text-blue-800",
  PAGO: "bg-green-100 text-green-800",
  ENVIADO_PARA_CSSBUY: "bg-cyan-100 text-cyan-800",
  COMPRADO: "bg-teal-100 text-teal-800",
  NO_ESTOQUE: "bg-emerald-100 text-emerald-800",
  AGUARDANDO_ENVIO: "bg-indigo-100 text-indigo-800",
  EM_ENVIO: "bg-purple-100 text-purple-800",
  CONCLUIDO: "bg-slate-100 text-slate-700",
  CANCELADO: "bg-red-100 text-red-800",
};

const CSSBUY_ORDER_LIST_URL = "https://www.cssbuy.com/?go=m&name=sendorderlist";

const ADMIN_TOKEN_KEY = "compraschina-admin-token";

const CATEGORIES = [
  "eletronicos",
  "moda",
  "acessorios",
  "casa",
  "beleza",
  "outros",
] as const;

type CatalogProduct = {
  id: string;
  originalUrl: string;
  title: string;
  titlePt: string | null;
  description: string | null;
  image: string | null;
  images: string | null; // JSON array of URLs
  priceCny: number | null;
  priceBrl: string | null;
  source: string;
  category: string;
  slug: string;
  featured: boolean;
};

function toCatalogProduct(p: Record<string, unknown>): CatalogProduct {
  return {
    id: String(p.id ?? ""),
    originalUrl: String(p.originalUrl ?? ""),
    title: String(p.title ?? ""),
    titlePt: p.titlePt != null ? String(p.titlePt) : null,
    description: p.description != null ? String(p.description) : null,
    image: p.image != null ? String(p.image) : null,
    images: p.images != null ? String(p.images) : null,
    priceCny:
      typeof p.priceCny === "number"
        ? p.priceCny
        : p.priceCny != null
          ? Number(p.priceCny)
          : null,
    priceBrl: p.priceBrl != null ? String(p.priceBrl) : null,
    source: String(p.source ?? ""),
    category: String(p.category ?? "outros"),
    slug: String(p.slug ?? ""),
    featured: Boolean(p.featured),
  };
}

const Admin = () => {
  const [token, setToken] = useState<string | null>(() =>
    typeof localStorage !== "undefined"
      ? localStorage.getItem(ADMIN_TOKEN_KEY)
      : null,
  );
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"pedidos" | "catálogo">("pedidos");
  const [addUrl, setAddUrl] = useState("");
  const [addCategory, setAddCategory] = useState<string>("outros");
  const [addFeatured, setAddFeatured] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  /** Uma URL por linha — importação sequencial (uma de cada vez no servidor). */
  const [bulkUrlsText, setBulkUrlsText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    url: string;
  } | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [positionDrafts, setPositionDrafts] = useState<Record<string, string>>(
    {},
  );
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    title: "",
    titlePt: "",
    category: "outros",
    featured: false,
    image: "",
    images: "",
  });
  const catalogImageInputRef = useRef<HTMLInputElement>(null);
  const [catalogImageUploading, setCatalogImageUploading] = useState(false);
  /** Rascunhos locais do título exibido no site (por id) — limpo após salvar. */
  const [inlineTitleDrafts, setInlineTitleDrafts] = useState<
    Record<string, string>
  >({});
  const [savingTitleId, setSavingTitleId] = useState<string | null>(null);
  const catalogTitleRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    created: number;
    skipped: number;
  } | null>(null);

  const fetchOrders = (authToken: string) => {
    const url =
      filter === "all"
        ? apiUrl("/api/admin/orders")
        : apiUrl(`/api/admin/orders?status=${filter}`);
    return fetch(url, {
      headers: { Authorization: `Bearer ${authToken}` },
    }).then((r) => {
      if (r.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken(null);
        return [];
      }
      return r.ok ? r.json() : [];
    });
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const url =
      filter === "all"
        ? apiUrl("/api/admin/orders")
        : apiUrl(`/api/admin/orders?status=${filter}`);
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          setToken(null);
          return [];
        }
        return r.ok ? r.json() : [];
      })
      .then(setOrders)
      .catch((e) => {
        if (e.name !== "AbortError") setOrders([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [token, filter]);

  const fetchCatalogProducts = useCallback(
    (options?: { mergeWithPrevious?: boolean }) => {
      if (!token) return Promise.resolve();
      setCatalogLoading(true);
      const mergeWithPrevious = options?.mergeWithPrevious ?? false;
      return fetch(apiUrl("/api/admin/products?limit=500"), {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : { products: [] }))
        .then((data) => {
          const fromServer = data.products ?? [];
          if (mergeWithPrevious) {
            setCatalogProducts((prev) => {
              const serverIds = new Set(
                fromServer.map((p: { id: string }) => p.id),
              );
              const missingFromServer = prev.filter(
                (p) => !serverIds.has(p.id),
              );
              return [...fromServer, ...missingFromServer];
            });
          } else {
            setCatalogProducts(fromServer);
          }
          return fromServer;
        })
        .catch(() => {
          setCatalogProducts([]);
          return [];
        })
        .finally(() => setCatalogLoading(false));
    },
    [token],
  );

  useEffect(() => {
    if (token && activeTab === "catálogo") fetchCatalogProducts();
  }, [token, activeTab, fetchCatalogProducts]);

  useEffect(() => {
    setPositionDrafts((prev) => {
      const next = { ...prev };
      for (let i = 0; i < catalogProducts.length; i++) {
        next[catalogProducts[i].id] = String(i + 1);
      }
      return next;
    });
  }, [catalogProducts]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(data.error || "Senha incorreta");
        return;
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword("");
    } catch {
      setLoginError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setOrders([]);
    toast.success("Sessão encerrada");
  };

  const [resyncPricesLoading, setResyncPricesLoading] = useState(false);

  const handleResyncCatalogPrices = async () => {
    if (!token) return;
    setResyncPricesLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/catalog/resync-prices"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "Falha ao sincronizar preços",
        );
        return;
      }
      toast.success(
        `Preços BRL: ${data.updated ?? 0} atualizados, ${data.skipped ?? 0} ignorados.`,
      );
      if (activeTab === "catálogo") void fetchCatalogProducts();
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setResyncPricesLoading(false);
    }
  };

  const [processarCssBuyId, setProcessarCssBuyId] = useState<string | null>(
    null,
  );

  const handleProcessarCssBuy = async (o: OrderWithDetails) => {
    if (!token) return;
    setProcessarCssBuyId(o.id);
    try {
      const res = await fetch(apiUrl(`/api/admin/orders/${o.id}/cssbuy-url`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      const url = data?.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.success("Abrindo produto no CSSBuy.");
      } else {
        toast.info(
          "Este marketplace não tem link direto no CSSBuy. Abra o link do produto.",
        );
      }
    } catch {
      toast.error("Erro ao obter link CSSBuy");
    } finally {
      setProcessarCssBuyId(null);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = addUrl.trim();
    if (!url || !url.startsWith("http")) {
      setAddError("Cole uma URL válida (Taobao, 1688, Weidian, etc.)");
      return;
    }
    setAddError("");
    setAddSuccess("");
    setAddLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/products"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url,
          category: addCategory,
          featured: addFeatured,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(data.error || "Erro ao adicionar produto");
        return;
      }
      setAddSuccess(`Produto adicionado: ${data.titlePt || data.title}`);
      setAddUrl("");
      const newProduct = toCatalogProduct(data as Record<string, unknown>);
      if (newProduct.id) {
        setCatalogProducts((prev) => [...prev, newProduct]);
      }
      await fetchCatalogProducts({ mergeWithPrevious: true });
      toast.success(
        "Produto adicionado ao catálogo! Você já pode alterar a posição na lista abaixo.",
      );
    } catch {
      setAddError("Erro de conexão. Tente novamente.");
    } finally {
      setAddLoading(false);
    }
  };

  const parseBulkUrls = (text: string): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("http")) continue;
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
    return out;
  };

  const BULK_IMPORT_MAX = 150;
  const BULK_GAP_MS = 450;

  const handleBulkImportProducts = async () => {
    if (!token) return;
    const urls = parseBulkUrls(bulkUrlsText);
    if (urls.length === 0) {
      toast.error("Cole pelo menos uma URL válida (uma por linha).");
      return;
    }
    if (urls.length > BULK_IMPORT_MAX) {
      toast.error(`No máximo ${BULK_IMPORT_MAX} links por vez.`);
      return;
    }
    setAddError("");
    setAddSuccess("");
    setBulkImporting(true);
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    try {
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]!;
        setBulkProgress({ current: i + 1, total: urls.length, url });
        try {
          const res = await fetch(apiUrl("/api/admin/products"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              url,
              category: addCategory,
              featured: addFeatured,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.status === 201) {
            imported++;
          } else if (res.ok) {
            skipped++;
          } else {
            failed++;
            console.warn("[bulk import]", url, data);
          }
        } catch {
          failed++;
        }
        if (i < urls.length - 1) {
          await new Promise((r) => setTimeout(r, BULK_GAP_MS));
        }
      }
      setBulkUrlsText("");
      setBulkProgress(null);
      await fetchCatalogProducts({ mergeWithPrevious: true });
      toast.success(
        `Lista concluída: ${imported} novos, ${skipped} já existiam, ${failed} falharam.`,
      );
    } finally {
      setBulkImporting(false);
      setBulkProgress(null);
    }
  };

  const openEditModal = (p: CatalogProduct) => {
    setEditingProduct(p);
    let imagesStr = "";
    if (p.images) {
      try {
        const arr = JSON.parse(p.images) as string[];
        imagesStr = Array.isArray(arr) ? arr.join("\n") : "";
      } catch {
        imagesStr = "";
      }
    }
    setEditForm({
      title: p.title,
      titlePt: p.titlePt ?? p.title,
      category: p.category,
      featured: p.featured,
      image: p.image ?? "",
      images: imagesStr,
    });
  };

  const handleCatalogImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setCatalogImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(apiUrl("/api/admin/products/upload-image"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        path?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Falha no upload da imagem");
        return;
      }
      const relPath = typeof data.path === "string" ? data.path : "";
      if (!relPath) {
        toast.error("Resposta inválida do servidor");
        return;
      }
      const url = publicUploadUrl(relPath);
      setEditForm((f) => {
        const prevMain = f.image.trim();
        const restLines = f.images
          .trim()
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);
        const withoutDup = restLines.filter((u) => u !== url);
        const promotePrev =
          prevMain &&
          prevMain !== url &&
          (prevMain.startsWith("http") || prevMain.startsWith("/"))
            ? prevMain
            : "";
        const mergedExtras = [
          ...(promotePrev ? [promotePrev] : []),
          ...withoutDup.filter((u) => u !== promotePrev),
        ].filter((u) => u !== url);
        return {
          ...f,
          image: url,
          images: mergedExtras.join("\n"),
        };
      });
      toast.success(
        "Imagem enviada. Clique em Salvar para publicar no Explorar.",
      );
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setCatalogImageUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct || !token) return;
    try {
      const res = await fetch(
        apiUrl(`/api/admin/products/${editingProduct.id}`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: editForm.title.trim() || undefined,
            titlePt: editForm.titlePt.trim() || null,
            category: editForm.category,
            featured: editForm.featured,
            image: editForm.image.trim(),
            images: editForm.images.trim()
              ? editForm.images
                  .trim()
                  .split(/\n/)
                  .map((u) => u.trim())
                  .filter((u) => u.startsWith("http"))
              : [],
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erro ao salvar");
        return;
      }
      setEditingProduct(null);
      fetchCatalogProducts();
      toast.success("Produto atualizado!");
    } catch {
      toast.error("Erro de conexão");
    }
  };

  const saveInlineTitle = useCallback(
    async (p: CatalogProduct, value: string) => {
      if (!token) return;
      const next = value.trim();
      const prev = (p.titlePt || p.title || "").trim();
      if (next === prev) {
        setInlineTitleDrafts((d) => {
          if (!(p.id in d)) return d;
          const { [p.id]: _, ...rest } = d;
          return rest;
        });
        return;
      }
      if (!next) {
        toast.error("Título não pode ficar vazio.");
        setInlineTitleDrafts((d) => ({
          ...d,
          [p.id]: prev || p.title || "",
        }));
        return;
      }
      setSavingTitleId(p.id);
      try {
        const res = await fetch(apiUrl(`/api/admin/products/${p.id}`), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: next, titlePt: next }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || "Erro ao salvar título");
          return;
        }
        const data = await res.json().catch(() => null);
        if (data && typeof data === "object") {
          const updated = toCatalogProduct(data as Record<string, unknown>);
          setCatalogProducts((list) =>
            list.map((x) => (x.id === p.id ? updated : x)),
          );
        } else {
          setCatalogProducts((list) =>
            list.map((x) =>
              x.id === p.id ? { ...x, title: next, titlePt: next } : x,
            ),
          );
        }
        setInlineTitleDrafts((d) => {
          const { [p.id]: _, ...rest } = d;
          return rest;
        });
      } catch {
        toast.error("Erro de conexão");
      } finally {
        setSavingTitleId(null);
      }
    },
    [token],
  );

  const handleReorder = useCallback(
    async (orderedIds: string[]) => {
      if (!token || orderedIds.length === 0) return;
      const ids = orderedIds
        .map((id) => String(id))
        .filter((id) => id.length > 0 && id !== "undefined");
      if (ids.length !== orderedIds.length) {
        toast.error(
          "Lista de produtos incompleta. Recarregue a página e tente novamente.",
        );
        return;
      }
      try {
        const res = await fetch(apiUrl("/api/admin/products/reorder"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: ids }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Erro ao reordenar");
          return;
        }
        await fetchCatalogProducts({ mergeWithPrevious: true });
        toast.success("Ordem atualizada");
      } catch {
        toast.error("Erro de conexão");
      }
    },
    [token, fetchCatalogProducts],
  );

  const moveProduct = (index: number, direction: "up" | "down") => {
    const list = [...catalogProducts];
    const next = direction === "up" ? index - 1 : index + 1;
    if (next < 0 || next >= list.length) return;
    [list[index], list[next]] = [list[next], list[index]];
    setCatalogProducts(list);
    const ids = list.map((p) => p.id).filter((id) => id && id !== "undefined");
    if (ids.length !== list.length) {
      toast.error("Algum produto sem id. Recarregue a página.");
      return;
    }
    handleReorder(ids);
  };

  const moveProductToIndex = (fromIndex: number, toIndex: number) => {
    const list = [...catalogProducts];
    if (fromIndex < 0 || fromIndex >= list.length) return;
    const clamped = Math.max(0, Math.min(list.length - 1, toIndex));
    if (clamped === fromIndex) return;
    const [removed] = list.splice(fromIndex, 1);
    list.splice(clamped, 0, removed);
    setCatalogProducts(list);
    const ids = list.map((p) => p.id).filter((id) => id && id !== "undefined");
    if (ids.length !== list.length) {
      toast.error("Algum produto sem id. Recarregue a página.");
      return;
    }
    handleReorder(ids);
  };

  // Map FeaturedCategory → DB category + featured flag
  const FEATURED_CAT_MAP: Record<
    string,
    { category: string; featured: boolean }
  > = {
    destaques: { category: "outros", featured: true },
    "mais-vendidos": { category: "outros", featured: true },
    tendencias: { category: "moda", featured: false },
    "marcas-chinesas": { category: "marcas-chinesas", featured: false },
  };

  // Produtos do Explorar que ainda não estão no catálogo (comparação por URL completa — não remover query, pois itemID etc. identificam o produto)
  const dbUrls = useMemo(
    () => new Set(catalogProducts.map((p) => (p.originalUrl || "").trim())),
    [catalogProducts],
  );

  const unimportedStatic = useMemo(
    () => EXPLORAR_PRODUCTS.filter((p) => !dbUrls.has((p.url || "").trim())),
    [dbUrls],
  );

  const handleSyncStatic = async () => {
    if (!token || unimportedStatic.length === 0) return;
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const payload = unimportedStatic.map((p) => {
        const cat =
          p.category &&
          !["destaques", "mais-vendidos", "tendencias"].includes(p.category)
            ? p.category
            : "outros";
        return {
          url: p.url || "",
          title: p.title || "",
          titlePt: p.titlePt ?? p.title ?? "",
          image: p.image ?? null,
          priceCny: p.priceCny ?? null,
          priceBrl: p.priceBrl ?? null,
          source: p.source || "1688",
          category: cat,
          featured: false,
        };
      });
      const res = await fetch(apiUrl("/api/admin/products/bulk-import"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ products: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Erro ao sincronizar");
        return;
      }
      setSyncResult({ created: data.created, skipped: data.skipped });
      toast.success(
        `Sincronização concluída: ${data.created} adicionados, ${data.skipped} já existentes.`,
      );
      await fetchCatalogProducts({ mergeWithPrevious: true });
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSyncLoading(false);
    }
  };

  const commitPosition = (productId: string) => {
    const fromIndex = catalogProducts.findIndex((p) => p.id === productId);
    if (fromIndex === -1) {
      toast.error("Produto não encontrado na lista. Recarregando...");
      fetchCatalogProducts({ mergeWithPrevious: true });
      return;
    }
    const raw = positionDrafts[productId];
    const desired = Number(raw);
    if (!Number.isFinite(desired)) {
      setPositionDrafts((prev) => ({
        ...prev,
        [productId]: String(fromIndex + 1),
      }));
      return;
    }
    const toIndex = Math.max(
      0,
      Math.min(catalogProducts.length - 1, Math.floor(desired) - 1),
    );
    setPositionDrafts((prev) => ({
      ...prev,
      [productId]: String(toIndex + 1),
    }));
    moveProductToIndex(fromIndex, toIndex);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(dragIndex) || dragIndex === dropIndex) return;
    const list = [...catalogProducts];
    const [removed] = list.splice(dragIndex, 1);
    list.splice(dropIndex, 0, removed);
    setCatalogProducts(list);
    const ids = list.map((p) => p.id).filter((id) => id && id !== "undefined");
    if (ids.length !== list.length) {
      toast.error("Algum produto sem id. Recarregue a página.");
      return;
    }
    handleReorder(ids);
  };

  const handleDeleteProduct = async (p: CatalogProduct) => {
    if (!window.confirm(`Excluir "${p.titlePt || p.title}" do catálogo?`))
      return;
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/products/${p.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erro ao excluir");
        return;
      }
      setEditingProduct(null);
      fetchCatalogProducts();
      toast.success("Produto excluído");
    } catch {
      toast.error("Erro de conexão");
    }
  };

  const paidCount = orders.filter((o) => o.status === "PAGO").length;

  const [orderEditDrafts, setOrderEditDrafts] = useState<
    Record<
      string,
      { cssbuyOrderId: string; internalNotes: string; status: string }
    >
  >({});
  const [orderSaving, setOrderSaving] = useState<string | null>(null);
  const [trackingDrafts, setTrackingDrafts] = useState<
    Record<string, { trackingCode: string; carrier: string }>
  >({});
  const [trackingSaving, setTrackingSaving] = useState<string | null>(null);

  const getOrderEditValues = (o: OrderWithDetails) => {
    const d = orderEditDrafts[o.id];
    return {
      cssbuyOrderId: d?.cssbuyOrderId ?? o.cssbuyOrderId ?? "",
      internalNotes: d?.internalNotes ?? o.internalNotes ?? "",
      status: d?.status ?? o.status,
    };
  };

  const setOrderEditValue = (
    orderId: string,
    field: "cssbuyOrderId" | "internalNotes" | "status",
    value: string,
  ) => {
    setOrderEditDrafts((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] ?? {}), [field]: value },
    }));
  };

  const getTrackingValues = (o: OrderWithDetails) => {
    const d = trackingDrafts[o.id];
    return {
      trackingCode: d?.trackingCode ?? o.shipment?.trackingCode ?? "",
      carrier: d?.carrier ?? o.shipment?.carrier ?? "",
    };
  };

  const setTrackingValue = (
    orderId: string,
    field: "trackingCode" | "carrier",
    value: string,
  ) => {
    setTrackingDrafts((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] ?? {}), [field]: value },
    }));
  };

  const handleSaveTracking = async (o: OrderWithDetails) => {
    if (!token) return;
    const v = getTrackingValues(o);
    setTrackingSaving(o.id);
    try {
      const res = await fetch(apiUrl(`/api/admin/orders/${o.id}/shipment`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trackingCode: v.trackingCode.trim() || null,
          carrier: v.carrier.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erro ao salvar");
        return;
      }
      setTrackingDrafts((prev) => {
        const next = { ...prev };
        delete next[o.id];
        return next;
      });
      fetchOrders(token);
      toast.success("Rastreio atualizado!");
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setTrackingSaving(null);
    }
  };

  const handleUpdateOrder = async (o: OrderWithDetails) => {
    if (!token) return;
    const v = getOrderEditValues(o);
    setOrderSaving(o.id);
    try {
      const res = await fetch(apiUrl(`/api/admin/orders/${o.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cssbuyOrderId: v.cssbuyOrderId.trim() || null,
          internalNotes: v.internalNotes.trim() || null,
          status: v.status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erro ao salvar");
        return;
      }
      setOrderEditDrafts((prev) => {
        const next = { ...prev };
        delete next[o.id];
        return next;
      });
      fetchOrders(token);
      toast.success("Pedido atualizado!");
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setOrderSaving(null);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-md">
          <div className="rounded-xl border border-border bg-card p-6">
            <h1 className="text-lg font-heading font-bold text-foreground flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-china-red" />
              Acesso restrito
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              Digite a senha de administrador para acessar o painel de pedidos.
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError("");
                }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40"
                autoFocus
                disabled={loginLoading}
              />
              {loginError && (
                <p className="text-sm text-red-600">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-china-red text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-china-red/90 disabled:opacity-60"
              >
                {loginLoading ? "Entrando..." : "Entrar"}
              </button>
            </form>
            <Link
              to="/"
              className="inline-block mt-4 text-xs text-muted-foreground hover:text-foreground"
            >
              Voltar ao site
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
                  <Package className="w-5 h-5 text-china-red" />
                  Painel admin
                </h1>
                <button
                  onClick={handleLogout}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  title="Sair"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Use os botões abaixo para copiar os dados e colar no CSSBuy
                Quick Buy.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Link
                to="/admin/resgate-dados"
                className="text-xs font-semibold text-china-red hover:underline mr-1"
              >
                Resgate CSV
              </Link>
              <Link
                to="/admin/cliente-pedido"
                className="text-xs font-semibold text-china-red hover:underline mr-1"
              >
                Cliente + pedido
              </Link>
              <Link
                to="/admin/conversas"
                className="text-xs font-semibold text-china-red hover:underline mr-1"
              >
                Conversas
              </Link>
              <button
                type="button"
                onClick={handleResyncCatalogPrices}
                disabled={resyncPricesLoading}
                className="text-xs font-semibold text-china-red hover:underline mr-1 disabled:opacity-50"
              >
                {resyncPricesLoading
                  ? "Sincronizando preços…"
                  : "Sincronizar preços BRL"}
              </button>
              {(
                [
                  "all",
                  "PAGO",
                  "AGUARDANDO_PAGAMENTO",
                  "ENVIADO_PARA_CSSBUY",
                  "COMPRADO",
                  "NO_ESTOQUE",
                  "AGUARDANDO_ENVIO",
                  "EM_ENVIO",
                  "CONCLUIDO",
                ] as const
              ).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-china-red text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {f === "all" ? "Todos" : STATUS_LABELS[f] || f}
                  {f === "PAGO" && paidCount > 0 && (
                    <span className="ml-1 bg-white/20 px-1 rounded">
                      {paidCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab("pedidos")}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
                activeTab === "pedidos"
                  ? "border-china-red text-china-red"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setActiveTab("catálogo")}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
                activeTab === "catálogo"
                  ? "border-china-red text-china-red"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Adicionar produto
            </button>
          </div>
        </div>

        {activeTab === "catálogo" ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-china-red" />
                Adicionar produto ao catálogo
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Cole o link de um produto (Taobao, 1688, Weidian, TMALL, etc.)
                ou use a caixa abaixo para várias URLs de uma vez — cada link é
                processado em sequência (um após o outro). A categoria e
                &quot;Em destaque&quot; valem para todos. Use
                &quot;Excluir&quot; na lista para remover itens.
              </p>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    URL do produto (um só)
                  </label>
                  <input
                    type="url"
                    placeholder="https://item.taobao.com/item.htm?id=..."
                    value={addUrl}
                    onChange={(e) => {
                      setAddUrl(e.target.value);
                      setAddError("");
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40"
                    disabled={addLoading || bulkImporting}
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Categoria
                    </label>
                    <select
                      value={addCategory}
                      onChange={(e) => setAddCategory(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40"
                      disabled={addLoading || bulkImporting}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c] ?? c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={addFeatured}
                      onChange={(e) => setAddFeatured(e.target.checked)}
                      disabled={addLoading || bulkImporting}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-foreground">
                      Em destaque na home
                    </span>
                  </label>
                </div>
                {addError && <p className="text-sm text-red-600">{addError}</p>}
                {addSuccess && (
                  <p className="text-sm text-green-600">{addSuccess}</p>
                )}
                <button
                  type="submit"
                  disabled={addLoading || bulkImporting}
                  className="bg-china-red text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-china-red/90 disabled:opacity-60 flex items-center gap-2"
                >
                  {addLoading ? (
                    "Importando..."
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Adicionar ao catálogo
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-border space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Várias URLs de uma vez
                </h3>
                <p className="text-xs text-muted-foreground">
                  Uma URL por linha. O site importa na ordem,{" "}
                  <strong>uma de cada vez</strong> (pausa curta entre cada uma
                  para não sobrecarregar o scraper). Máximo {BULK_IMPORT_MAX}{" "}
                  links.
                </p>
                <textarea
                  value={bulkUrlsText}
                  onChange={(e) => setBulkUrlsText(e.target.value)}
                  placeholder={
                    "https://weidian.com/item.html?itemID=...\nhttps://item.taobao.com/item.htm?id=..."
                  }
                  rows={8}
                  disabled={addLoading || bulkImporting}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono outline-none focus:ring-2 focus:ring-china-red/40 resize-y min-h-[120px]"
                />
                {bulkProgress && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Processando {bulkProgress.current} de{" "}
                        {bulkProgress.total}
                      </span>
                      <span className="truncate max-w-[60%] text-right">
                        {bulkProgress.url.slice(0, 70)}
                        {bulkProgress.url.length > 70 ? "…" : ""}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-china-red transition-[width] duration-300"
                        style={{
                          width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleBulkImportProducts}
                  disabled={addLoading || bulkImporting}
                  className="bg-foreground text-background px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                >
                  {bulkImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importando lista…
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Importar lista (sequencial)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sync static products */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-china-red" />
                    Importar produtos do Explorar
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Importa para o catálogo todos os produtos que aparecem na
                    página Explorar e ainda não estão no banco. Depois você pode
                    ordená-los na lista abaixo.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-foreground">
                    {unimportedStatic.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    do Explorar não importados
                  </p>
                </div>
              </div>
              {unimportedStatic.length > 0 ? (
                <div className="mt-4">
                  <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                    {unimportedStatic.map((p) => (
                      <p
                        key={p.url}
                        className="text-xs text-muted-foreground truncate"
                      >
                        <span className="text-foreground font-medium">
                          {p.titlePt || p.title}
                        </span>
                        {" · "}
                        {p.source}
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={handleSyncStatic}
                    disabled={syncLoading}
                    className="inline-flex items-center gap-2 bg-china-red text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-china-red/90 disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${syncLoading ? "animate-spin" : ""}`}
                    />
                    {syncLoading
                      ? "Importando..."
                      : `Importar ${unimportedStatic.length} produtos`}
                  </button>
                  {syncResult && (
                    <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                      ✓ {syncResult.created} adicionados, {syncResult.skipped}{" "}
                      já existiam.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-green-700 dark:text-green-400 font-medium">
                  ✓ Todos os produtos do Explorar já estão no catálogo.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Ordem dos produtos (Home e Explorar)
                </h2>
                <a
                  href="/explorar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-china-red font-medium hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver como no Explorar
                </a>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Esta lista define a ordem em que os produtos aparecem na{" "}
                <strong>seção Explorar da home</strong> e na{" "}
                <strong>página Explorar</strong> (quando o visitante escolhe
                &quot;Ordem do catálogo&quot;). Arraste o ícone ≡ para reordenar
                ou use Subir/Descer; o número é a posição (1 = primeiro).
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Para levar alterações para o código (na pasta{" "}
                <code className="bg-muted px-1 rounded">backend</code>):{" "}
                <code className="bg-muted px-1 rounded">
                  npx ts-node scripts/export-explorar-to-code.ts
                </code>{" "}
                e commite{" "}
                <code className="bg-muted px-1 rounded">
                  src/data/explorarProducts.export.json
                </code>
                .
              </p>
              {!catalogLoading && catalogProducts.length > 0 && (
                <p className="text-xs text-muted-foreground mb-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <strong>Título no site:</strong> edite na caixa de cada
                  produto; ao sair do campo salva sozinho.{" "}
                  <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
                    Enter
                  </kbd>{" "}
                  pula para o próximo;{" "}
                  <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
                    Shift+Enter
                  </kbd>{" "}
                  quebra linha no título.
                </p>
              )}
              {catalogLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : catalogProducts.length === 0 ? (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Nenhum produto ainda. Adicione um acima ou use{" "}
                    <strong>&quot;Importar X produtos&quot;</strong> para trazer
                    os itens da lista &quot;não importados&quot; para o catálogo
                    — depois você poderá ordená-los aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {catalogProducts.map((p, index) => (
                    <div
                      key={p.id || `product-${index}`}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", String(index))
                      }
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border bg-background/50 group hover:border-china-red/20 transition-colors"
                    >
                      <div
                        className="flex items-center gap-2 shrink-0 cursor-grab active:cursor-grabbing"
                        title="Arrastar para reordenar"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-muted shrink-0 overflow-hidden">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              —
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={`catalog-title-${p.id}`}
                            className="sr-only"
                          >
                            Título no site
                          </label>
                          <textarea
                            id={`catalog-title-${p.id}`}
                            ref={(el) => {
                              if (el) catalogTitleRefs.current.set(p.id, el);
                              else catalogTitleRefs.current.delete(p.id);
                            }}
                            rows={2}
                            className="w-full text-sm font-medium text-foreground bg-background border border-border rounded-md px-2 py-1.5 resize-y min-h-[2.75rem] leading-snug focus:outline-none focus:ring-2 focus:ring-china-red/30 disabled:opacity-60"
                            value={
                              inlineTitleDrafts[p.id] ?? (p.titlePt || p.title)
                            }
                            onChange={(e) =>
                              setInlineTitleDrafts((d) => ({
                                ...d,
                                [p.id]: e.target.value,
                              }))
                            }
                            onBlur={(e) =>
                              void saveInlineTitle(p, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                (e.currentTarget as HTMLTextAreaElement).blur();
                                const idx = catalogProducts.findIndex(
                                  (x) => x.id === p.id,
                                );
                                const nextId = catalogProducts[idx + 1]?.id;
                                if (nextId) {
                                  requestAnimationFrame(() => {
                                    const ta =
                                      catalogTitleRefs.current.get(nextId);
                                    ta?.focus();
                                    ta?.select();
                                  });
                                }
                              }
                            }}
                            disabled={savingTitleId === p.id}
                          />
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                            <span>{p.source}</span>
                            <span>·</span>
                            <span>
                              {CATEGORY_LABELS[p.category] ?? p.category}
                            </span>
                            {p.featured && (
                              <Badge className="text-[10px] py-0">
                                Destaque
                              </Badge>
                            )}
                          </div>
                          <a
                            href={p.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-china-red truncate block mt-0.5 hover:underline"
                          >
                            {p.originalUrl}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0 flex-wrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => moveProduct(index, "up")}
                          disabled={index === 0}
                          title="Subir"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => moveProduct(index, "down")}
                          disabled={index === catalogProducts.length - 1}
                          title="Descer"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Pos.
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={catalogProducts.length}
                          value={positionDrafts[p.id] ?? String(index + 1)}
                          onChange={(e) =>
                            setPositionDrafts((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.currentTarget as HTMLInputElement).blur();
                              commitPosition(p.id);
                            }
                          }}
                          onBlur={() => commitPosition(p.id)}
                          className="w-14 h-8 rounded-md border border-border bg-background text-xs text-center outline-none focus:ring-1 focus:ring-china-red/40"
                          title="Posição (1 = primeiro na Home e no Explorar)"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => openEditModal(p)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                          onClick={() => handleDeleteProduct(p)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={`/pedido?url=${encodeURIComponent(p.originalUrl || "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Ver
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {editingProduct &&
              (() => {
                const allImageUrls = [
                  editForm.image,
                  ...(editForm.images.trim()
                    ? editForm.images
                        .trim()
                        .split(/\n/)
                        .map((u) => u.trim())
                        .filter((u) => u.startsWith("http"))
                    : []),
                ].filter(Boolean) as string[];
                const setMainImage = (url: string) => {
                  const rest = allImageUrls.filter((u) => u !== url);
                  setEditForm((f) => ({
                    ...f,
                    image: url,
                    images: rest.join("\n"),
                  }));
                };
                return (
                  <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setEditingProduct(null)}
                  >
                    <div
                      className="bg-card rounded-xl border border-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        Editar produto
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            Imagem de preview (home e Explorar)
                          </label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Escolha qual imagem aparece no card da página
                            inicial. Clique em &quot;Usar na home&quot; na que
                            preferir.
                          </p>
                          {allImageUrls.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {allImageUrls.map((url) => (
                                <div key={url} className="relative group">
                                  <div className="w-20 h-20 rounded-lg border-2 overflow-hidden bg-muted border-border">
                                    <img
                                      src={url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                      onError={(e) =>
                                        (e.currentTarget.style.display = "none")
                                      }
                                    />
                                  </div>
                                  {editForm.image === url && (
                                    <span className="absolute top-0 left-0 right-0 bg-china-red text-white text-[10px] font-bold text-center py-0.5">
                                      Preview
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setMainImage(url)}
                                    className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] font-medium py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    {editForm.image === url
                                      ? "Principal"
                                      : "Usar na home"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <input
                            ref={catalogImageInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={handleCatalogImageUpload}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2 mt-2"
                            disabled={catalogImageUploading}
                            onClick={() =>
                              catalogImageInputRef.current?.click()
                            }
                          >
                            <Upload className="w-4 h-4" />
                            {catalogImageUploading
                              ? "Enviando…"
                              : "Enviar foto do computador"}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            JPG, PNG, WebP ou GIF até 5 MB. A imagem principal
                            vira o card na home e no Explorar após Salvar.
                          </p>
                          <input
                            type="url"
                            value={editForm.image}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                image: e.target.value,
                              }))
                            }
                            className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40"
                            placeholder="Ou cole a URL da imagem principal"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Outras imagens (URLs, uma por linha)
                          </label>
                          <textarea
                            value={editForm.images}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                images: e.target.value,
                              }))
                            }
                            placeholder="https://..."
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Título original
                          </label>
                          <input
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                title: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40"
                            placeholder="Título em chinês"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Título em português
                          </label>
                          <input
                            value={editForm.titlePt}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                titlePt: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40"
                            placeholder="Título traduzido"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Categoria
                          </label>
                          <select
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                category: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-china-red/40"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {CATEGORY_LABELS[c] ?? c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editForm.featured}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                featured: e.target.checked,
                              }))
                            }
                            className="rounded border-border"
                          />
                          <span className="text-sm text-foreground">
                            Em destaque na home
                          </span>
                        </label>
                      </div>
                      <div className="flex gap-2 mt-6">
                        <Button
                          onClick={() => setEditingProduct(null)}
                          variant="outline"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleSaveEdit}
                          className="bg-china-red hover:bg-china-red/90"
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Carregando pedidos...</p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
            <Link
              to="/"
              className="inline-flex mt-4 text-china-red text-sm font-medium hover:underline"
            >
              Voltar ao site
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div
                key={o.id}
                className={`rounded-xl border bg-card p-4 transition-colors ${
                  o.status === "PAGO"
                    ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/10"
                    : "border-border"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex flex-1 min-w-0 gap-3">
                    {o.productImage && (
                      <div className="shrink-0 w-14 h-14 rounded-lg border border-border bg-muted overflow-hidden">
                        <img
                          src={o.productImage}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {o.id.slice(0, 8)}
                        </span>
                        <Badge
                          className={
                            STATUS_COLORS[o.status] ||
                            "bg-muted text-muted-foreground"
                          }
                        >
                          {STATUS_LABELS[o.status] || o.status}
                        </Badge>
                        {o.checkoutGroupId && (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 border-china-red/40 text-china-red"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            Carrinho ·{" "}
                            {parseCartSnapshot(o.orderItemsJson).length ||
                              "vários"}{" "}
                            itens
                          </Badge>
                        )}
                        {o.quote && (
                          <span className="text-sm font-semibold text-china-red">
                            R$ {Number(o.quote.totalBrl).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {isCartSnapshotLeader(o, orders) &&
                        parseCartSnapshot(o.orderItemsJson).length > 1 && (
                          <div className="mb-3 rounded-lg border border-border bg-muted/40 p-3 text-xs">
                            <p className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
                              <ShoppingCart className="w-3.5 h-3.5 text-china-red" />
                              Produtos neste checkout
                            </p>
                            <ul className="space-y-2">
                              {parseCartSnapshot(o.orderItemsJson).map(
                                (row, idx) => (
                                  <li
                                    key={idx}
                                    className="border-b border-border/60 pb-2 last:border-0 last:pb-0"
                                  >
                                    <span className="font-medium text-foreground">
                                      {row.titlePt || row.title || "Produto"}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {" "}
                                      ×{row.quantity ?? 1}
                                    </span>
                                    {row.lineProductBrl != null && (
                                      <span className="text-china-red font-semibold ml-2">
                                        R${" "}
                                        {Number(row.lineProductBrl).toFixed(2)}
                                      </span>
                                    )}
                                    {row.url && (
                                      <a
                                        href={row.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block truncate text-[10px] text-blue-600 hover:underline mt-1"
                                      >
                                        {row.url}
                                      </a>
                                    )}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {o.productTitle || o.productDescription}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Qtd: {o.quantity}
                        {(o.productColor ||
                          o.productSize ||
                          o.productVariation) && (
                          <>
                            {" "}
                            ·{" "}
                            {[o.productColor, o.productSize, o.productVariation]
                              .filter(Boolean)
                              .join(", ")}
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {o.customerName} · {o.addressCity}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/admin/pedido/${o.id}`} className="gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Gerenciar
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => window.open(o.originalUrl, "_blank")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir link
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-china-red hover:bg-china-red/90"
                      onClick={() => handleProcessarCssBuy(o)}
                      disabled={processarCssBuyId === o.id}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {processarCssBuyId === o.id
                        ? "Abrindo…"
                        : "Processar no CSSBuy"}
                    </Button>
                  </div>
                </div>

                <details className="mt-3 group">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Ver dados completos e gerenciar
                  </summary>
                  <div className="mt-2 space-y-4">
                    <pre className="p-3 bg-muted/50 rounded-lg text-[11px] text-foreground overflow-x-auto whitespace-pre-wrap font-sans">
                      {buildCssBuyCopyText(o)}
                    </pre>
                    <div className="border-t border-border pt-3 space-y-3">
                      <p className="text-xs font-medium text-foreground">
                        Gerenciar pedido
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            ID pedido CSSBuy
                          </label>
                          <input
                            type="text"
                            value={getOrderEditValues(o).cssbuyOrderId}
                            onChange={(e) =>
                              setOrderEditValue(
                                o.id,
                                "cssbuyOrderId",
                                e.target.value,
                              )
                            }
                            placeholder="Ex: 12345678"
                            className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm outline-none focus:ring-1 focus:ring-china-red/40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            Status
                          </label>
                          <select
                            value={getOrderEditValues(o).status}
                            onChange={(e) =>
                              setOrderEditValue(o.id, "status", e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm outline-none focus:ring-1 focus:ring-china-red/40"
                          >
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Notas internas
                        </label>
                        <textarea
                          value={getOrderEditValues(o).internalNotes}
                          onChange={(e) =>
                            setOrderEditValue(
                              o.id,
                              "internalNotes",
                              e.target.value,
                            )
                          }
                          placeholder="Problemas, observações, fora de estoque..."
                          rows={2}
                          className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm outline-none focus:ring-1 focus:ring-china-red/40 resize-none"
                        />
                      </div>
                      <div className="border-t border-border pt-3 mt-3 space-y-2">
                        <p className="text-xs font-medium text-foreground">
                          Rastreio
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={getTrackingValues(o).trackingCode}
                            onChange={(e) =>
                              setTrackingValue(
                                o.id,
                                "trackingCode",
                                e.target.value,
                              )
                            }
                            placeholder="Código de rastreio"
                            className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm outline-none focus:ring-1 focus:ring-china-red/40"
                          />
                          <input
                            type="text"
                            value={getTrackingValues(o).carrier}
                            onChange={(e) =>
                              setTrackingValue(o.id, "carrier", e.target.value)
                            }
                            placeholder="Transportadora (ex: Correios)"
                            className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm outline-none focus:ring-1 focus:ring-china-red/40"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveTracking(o)}
                          disabled={trackingSaving === o.id}
                        >
                          {trackingSaving === o.id
                            ? "Salvando..."
                            : "Salvar rastreio"}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateOrder(o)}
                          disabled={orderSaving === o.id}
                          className="bg-china-red hover:bg-china-red/90"
                        >
                          {orderSaving === o.id ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={CSSBUY_ORDER_LIST_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Abrir CSSBuy
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
