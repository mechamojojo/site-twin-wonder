import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Lock,
  MessageCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ADMIN_TOKEN_KEY = "compraschina-admin-token";

type ConvRow = {
  id: string;
  status: string;
  guestName: string | null;
  guestEmail: string | null;
  user: { name: string; email: string } | null;
  lastMessageAt: string;
  lastPreview: string;
  unreadFromUser: number;
};

type ThreadMsg = {
  id: string;
  sender: "USER" | "STAFF";
  body: string;
  createdAt: string;
};

const AdminSuporte = () => {
  const navigate = useNavigate();
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(ADMIN_TOKEN_KEY)
      : null;

  const [list, setList] = useState<ConvRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<{
    id: string;
    status: string;
    guestName: string | null;
    guestEmail: string | null;
    user: { name: string; email: string } | null;
    messages: ThreadMsg[];
  } | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchList = useCallback(async () => {
    if (!token) return;
    const res = await fetch(apiUrl("/api/admin/support/conversations"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      navigate("/admin", { replace: true });
      return;
    }
    if (!res.ok) {
      toast.error("Erro ao listar conversas.");
      return;
    }
    const data = (await res.json()) as { conversations: ConvRow[] };
    setList(data.conversations ?? []);
  }, [token, navigate]);

  const fetchThread = useCallback(
    async (id: string) => {
      if (!token) return;
      setLoadingThread(true);
      try {
        const res = await fetch(apiUrl(`/api/admin/support/conversations/${id}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          navigate("/admin", { replace: true });
          return;
        }
        if (!res.ok) {
          toast.error("Conversa não encontrada.");
          return;
        }
        const data = (await res.json()) as {
          id: string;
          status: string;
          guestName: string | null;
          guestEmail: string | null;
          user: { name: string; email: string } | null;
          messages: ThreadMsg[];
        };
        setThread(data);
      } finally {
        setLoadingThread(false);
      }
    },
    [token, navigate],
  );

  useEffect(() => {
    if (!token) {
      navigate("/admin", { replace: true });
      return;
    }
    setLoadingList(true);
    fetchList()
      .catch(() => toast.error("Erro ao carregar."))
      .finally(() => setLoadingList(false));
  }, [token, navigate, fetchList]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedId || !token) return;
    pollRef.current = setInterval(() => {
      void fetchList();
      void fetchThread(selectedId);
    }, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedId, token, fetchList, fetchThread]);

  useEffect(() => {
    if (selectedId) void fetchThread(selectedId);
    else setThread(null);
  }, [selectedId, fetchThread]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text || !selectedId || !token) return;
    setSending(true);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/support/conversations/${selectedId}/messages`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body: text }),
        },
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error || "Falha ao enviar.");
        return;
      }
      setReply("");
      await fetchThread(selectedId);
      await fetchList();
      toast.success("Resposta enviada.");
    } catch {
      toast.error("Erro de rede.");
    } finally {
      setSending(false);
    }
  };

  const patchStatus = async (status: "OPEN" | "CLOSED") => {
    if (!selectedId || !token) return;
    setStatusBusy(true);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/support/conversations/${selectedId}`),
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) {
        toast.error("Não foi possível atualizar o status.");
        return;
      }
      await fetchThread(selectedId);
      await fetchList();
    } finally {
      setStatusBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <Lock className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Redirecionando…</p>
        </main>
        <Footer />
      </div>
    );
  }

  const rowDisplayName = (c: ConvRow) =>
    c.user?.name || c.guestName || "Visitante";
  const rowDisplayEmail = (c: ConvRow) =>
    c.user?.email || c.guestEmail || "—";

  const threadDisplayName = thread
    ? thread.user?.name || thread.guestName || "Visitante"
    : "";
  const threadDisplayEmail = thread
    ? thread.user?.email || thread.guestEmail || "—"
    : "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 text-sm text-china-red font-semibold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Painel admin
          </Link>
          <h1 className="text-xl font-heading font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-china-red" />
            Conversas do site
          </h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 ml-auto"
            onClick={() => {
              void fetchList();
              if (selectedId) void fetchThread(selectedId);
            }}
            disabled={loadingList}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[480px]">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden flex flex-col max-h-[70vh] lg:max-h-none">
            <div className="px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Caixa de entrada
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingList && list.length === 0 ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-china-red" />
                </div>
              ) : list.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Nenhuma conversa ainda.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {list.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left px-3 py-3 text-sm transition-colors hover:bg-muted/50 ${
                          selectedId === c.id ? "bg-muted/70" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-foreground truncate">
                            {rowDisplayName(c)}
                          </span>
                          {c.unreadFromUser > 0 && (
                            <Badge className="shrink-0 bg-china-red text-white text-[10px] px-1.5 py-0">
                              {c.unreadFromUser}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {rowDisplayEmail(c)}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {c.lastPreview}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 rounded-xl border border-border bg-card flex flex-col min-h-[360px] max-h-[70vh] lg:max-h-[calc(100vh-220px)]">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6">
                Selecione uma conversa à esquerda.
              </div>
            ) : loadingThread && !thread ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-china-red" />
              </div>
            ) : thread ? (
              <>
                <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2 justify-between bg-muted/20">
                  <div>
                    <p className="font-semibold text-foreground">
                      {threadDisplayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {threadDisplayEmail}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {thread.status === "OPEN" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={statusBusy}
                        onClick={() => patchStatus("CLOSED")}
                      >
                        Encerrar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={statusBusy}
                        onClick={() => patchStatus("OPEN")}
                      >
                        Reabrir
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {thread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.sender === "STAFF" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                          m.sender === "STAFF"
                            ? "bg-china-red text-white rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {m.body}
                        </p>
                        <p
                          className={`text-[10px] mt-1 opacity-80 ${
                            m.sender === "STAFF"
                              ? "text-white/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {m.sender === "STAFF" ? "Equipe" : "Cliente"} ·{" "}
                          {new Date(m.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={sendReply}
                  className="border-t border-border p-3 flex flex-col sm:flex-row gap-2 bg-muted/10"
                >
                  <textarea
                    rows={3}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-china-red/30 resize-none"
                    placeholder="Resposta ao cliente…"
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="shrink-0 gap-2 self-end sm:self-stretch"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Enviar
                  </Button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminSuporte;
