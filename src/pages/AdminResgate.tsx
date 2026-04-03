import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Download, Lock, Package, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ADMIN_TOKEN_KEY = "compraschina-admin-token";

function csvEscape(cell: string): string {
  const s = String(cell ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: string[][]): string {
  const head = headers.map(csvEscape).join(",");
  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  return `${head}\r\n${body}`;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type RecoveryPayload = {
  products: Array<{
    id: string;
    originalUrl: string;
    slug: string;
    title: string;
    titlePt: string | null;
    featured: boolean;
    sortOrder: number;
    createdAt: string;
  }>;
  orderUrls: Array<{
    originalUrl: string;
    productTitle: string | null;
    createdAt: string;
  }>;
  previewSnapshots: Array<{ urlKey: string; updatedAt: string }>;
  users: Array<{
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    createdAt: string;
    customerWhatsapp: string | null;
  }>;
};

const AdminResgate = () => {
  const [token, setToken] = useState<string | null>(() =>
    typeof localStorage !== "undefined"
      ? localStorage.getItem(ADMIN_TOKEN_KEY)
      : null,
  );
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [data, setData] = useState<RecoveryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (authToken: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(apiUrl("/api/admin/data-recovery"), {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.status === 401) {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          setToken(null);
          setData(null);
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(
            typeof j.error === "string" ? j.error : "Erro ao carregar dados",
          );
          setData(null);
          return;
        }
        const json = (await res.json()) as RecoveryPayload;
        setData(json);
      } catch {
        setError("Erro de conexão");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (token) load(token);
  }, [token, load]);

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
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(d.error || "Senha incorreta");
        return;
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, d.token);
      setToken(d.token);
      setPassword("");
    } catch {
      setLoginError("Erro ao conectar.");
    } finally {
      setLoginLoading(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  const csvCatalog = () => {
    if (!data?.products.length) {
      toast.message("Nenhum produto no catálogo");
      return;
    }
    const csv = rowsToCsv(
      [
        "originalUrl",
        "slug",
        "title",
        "titlePt",
        "featured",
        "sortOrder",
        "createdAt",
      ],
      data.products.map((p) => [
        p.originalUrl,
        p.slug,
        p.title,
        p.titlePt ?? "",
        p.featured ? "sim" : "não",
        String(p.sortOrder),
        p.createdAt,
      ]),
    );
    downloadCsv(`compraschina-catalogo-${Date.now()}.csv`, csv);
    toast.success("CSV do catálogo baixado");
  };

  const csvOrders = () => {
    if (!data?.orderUrls.length) {
      toast.message("Nenhuma URL distinta em pedidos");
      return;
    }
    const csv = rowsToCsv(
      ["originalUrl", "productTitle", "firstSeenAt"],
      data.orderUrls.map((o) => [
        o.originalUrl,
        o.productTitle ?? "",
        o.createdAt,
      ]),
    );
    downloadCsv(`compraschina-pedidos-urls-${Date.now()}.csv`, csv);
    toast.success("CSV de URLs dos pedidos baixado");
  };

  const csvPreviews = () => {
    if (!data?.previewSnapshots.length) {
      toast.message("Nenhum snapshot de preview");
      return;
    }
    const csv = rowsToCsv(
      ["urlKey", "updatedAt"],
      data.previewSnapshots.map((s) => [s.urlKey, s.updatedAt]),
    );
    downloadCsv(`compraschina-preview-urls-${Date.now()}.csv`, csv);
    toast.success("CSV de previews baixado");
  };

  const csvUsers = () => {
    if (!data?.users.length) {
      toast.message("Nenhum usuário cadastrado");
      return;
    }
    const csv = rowsToCsv(
      ["id", "email", "name", "emailVerified", "whatsapp", "createdAt"],
      data.users.map((u) => [
        u.id,
        u.email,
        u.name,
        u.emailVerified ? "sim" : "não",
        u.customerWhatsapp ?? "",
        u.createdAt,
      ]),
    );
    downloadCsv(`compraschina-usuarios-${Date.now()}.csv`, csv);
    toast.success("CSV de usuários baixado (sem senhas)");
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-md">
          <div className="rounded-xl border border-border bg-card p-6">
            <h1 className="text-lg font-heading font-bold text-foreground flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-china-red" />
              Resgate de dados
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              Acesso restrito ao administrador. As senhas de usuários nunca são
              expostas.
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                placeholder="Senha admin"
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
              to="/admin"
              className="inline-flex items-center gap-1 mt-4 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar ao painel admin
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
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-china-red" />
              Resgate de dados (banco)
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Listas lidas diretamente do PostgreSQL conectado ao backend. Use os
              CSVs para arquivo ou para recadastrar produtos. Contas: exportamos
              id, e-mail e nome — a senha continua só como hash no banco (não
              recuperável).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">Painel admin</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => token && load(token)}
              disabled={loading}
            >
              Atualizar
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        {loading && !data && (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        )}

        {data && (
          <div className="space-y-10">
            <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="font-heading font-bold text-foreground">
                  Catálogo —{" "}
                  <span className="text-muted-foreground font-normal">
                    {data.products.length} produto(s)
                  </span>
                </h2>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={csvCatalog}>
                  <Download className="w-4 h-4" />
                  Baixar CSV
                </Button>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto text-xs border border-border rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 font-semibold">URL</th>
                      <th className="p-2 font-semibold">Slug</th>
                      <th className="p-2 font-semibold">Destaque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="p-2 max-w-[280px] truncate" title={p.originalUrl}>
                          {p.originalUrl}
                        </td>
                        <td className="p-2 whitespace-nowrap">{p.slug}</td>
                        <td className="p-2">{p.featured ? "Sim" : "Não"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="font-heading font-bold text-foreground">
                  URLs em pedidos (únicas) —{" "}
                  <span className="text-muted-foreground font-normal">
                    {data.orderUrls.length}
                  </span>
                </h2>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={csvOrders}>
                  <Download className="w-4 h-4" />
                  Baixar CSV
                </Button>
              </div>
              <div className="overflow-x-auto max-h-56 overflow-y-auto text-xs border border-border rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 font-semibold">URL</th>
                      <th className="p-2 font-semibold">Título</th>
                      <th className="p-2 font-semibold">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orderUrls.map((o, i) => (
                      <tr key={`${o.originalUrl}-${i}`} className="border-t border-border">
                        <td className="p-2 max-w-[280px] truncate" title={o.originalUrl}>
                          {o.originalUrl}
                        </td>
                        <td className="p-2 max-w-[160px] truncate" title={o.productTitle ?? ""}>
                          {o.productTitle ?? "—"}
                        </td>
                        <td className="p-2 whitespace-nowrap">{fmt(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="font-heading font-bold text-foreground">
                  Preview (snapshots) —{" "}
                  <span className="text-muted-foreground font-normal">
                    {data.previewSnapshots.length}
                  </span>
                </h2>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={csvPreviews}>
                  <Download className="w-4 h-4" />
                  Baixar CSV
                </Button>
              </div>
              <div className="overflow-x-auto max-h-48 overflow-y-auto text-xs border border-border rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 font-semibold">urlKey</th>
                      <th className="p-2 font-semibold">Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.previewSnapshots.map((s) => (
                      <tr key={s.urlKey} className="border-t border-border">
                        <td className="p-2 max-w-md truncate" title={s.urlKey}>
                          {s.urlKey}
                        </td>
                        <td className="p-2 whitespace-nowrap">{fmt(s.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="font-heading font-bold text-foreground">
                  Contas criadas —{" "}
                  <span className="text-muted-foreground font-normal">
                    {data.users.length}
                  </span>
                </h2>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={csvUsers}>
                  <Download className="w-4 h-4" />
                  Baixar CSV
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Para “recriar” contas com a mesma senha é preciso importar a linha
                completa da tabela User (incluindo o hash) via backup SQL — não
                dá para derivar a senha desta lista.
              </p>
              <div className="overflow-x-auto max-h-64 overflow-y-auto text-xs border border-border rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 font-semibold">E-mail</th>
                      <th className="p-2 font-semibold">Nome</th>
                      <th className="p-2 font-semibold">Verificado</th>
                      <th className="p-2 font-semibold">Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} className="border-t border-border">
                        <td className="p-2 whitespace-nowrap">{u.email}</td>
                        <td className="p-2">{u.name}</td>
                        <td className="p-2">{u.emailVerified ? "Sim" : "Não"}</td>
                        <td className="p-2 whitespace-nowrap">{fmt(u.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminResgate;
