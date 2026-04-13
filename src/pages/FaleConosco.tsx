import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, MessageSquarePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const GUEST_THREAD_KEY = "compraschina-support-guest";

type GuestStored = { conversationId: string; visitorToken: string };

type ConvListItem = {
  id: string;
  status: string;
  lastMessageAt: string;
  lastPreview: string;
};

type ThreadMsg = {
  id: string;
  sender: "USER" | "STAFF";
  body: string;
  createdAt: string;
};

function loadGuestThread(): GuestStored | null {
  try {
    const raw = localStorage.getItem(GUEST_THREAD_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as GuestStored;
    if (
      o &&
      typeof o.conversationId === "string" &&
      typeof o.visitorToken === "string"
    ) {
      return o;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveGuestThread(v: GuestStored) {
  localStorage.setItem(GUEST_THREAD_KEY, JSON.stringify(v));
}

const FaleConosco = () => {
  const { user, token, loading: authLoading } = useAuth();

  const [guestThread, setGuestThread] = useState<GuestStored | null>(null);
  const [list, setList] = useState<ConvListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<{
    id: string;
    status: string;
    messages: ThreadMsg[];
  } | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      setGuestThread(loadGuestThread());
    } else {
      setGuestThread(null);
    }
  }, [user, authLoading]);

  const fetchUserList = useCallback(async () => {
    if (!token) return;
    setLoadingList(true);
    try {
      const res = await fetch(apiUrl("/api/support/conversations"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao listar");
      const data = (await res.json()) as { conversations: ConvListItem[] };
      setList(data.conversations ?? []);
    } catch {
      toast.error("Não foi possível carregar suas conversas.");
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      void fetchUserList();
    }
  }, [user, token, fetchUserList]);

  const fetchThread = useCallback(
    async (id: string, visitorToken?: string) => {
      const isGuest = Boolean(visitorToken);
      const url =
        apiUrl(`/api/support/conversations/${id}`) +
        (visitorToken ? `?token=${encodeURIComponent(visitorToken)}` : "");
      const headers: HeadersInit = {};
      if (!isGuest && token) {
        headers.Authorization = `Bearer ${token}`;
      }
      setLoadingThread(true);
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) {
          if (res.status === 403 || res.status === 404) {
            if (isGuest) {
              localStorage.removeItem(GUEST_THREAD_KEY);
              setGuestThread(null);
              setThread(null);
              toast.error("Conversa expirada ou inválida. Inicie outra.");
            }
          }
          throw new Error("Falha ao carregar");
        }
        const data = (await res.json()) as {
          id: string;
          status: string;
          messages: ThreadMsg[];
        };
        setThread(data);
      } catch {
        if (!isGuest) toast.error("Não foi possível carregar a conversa.");
      } finally {
        setLoadingThread(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!thread?.id) return;

    const tick = () => {
      if (user && token && selectedId) {
        void fetchThread(selectedId);
      } else if (guestThread) {
        void fetchThread(guestThread.conversationId, guestThread.visitorToken);
      }
    };
    pollRef.current = setInterval(tick, 12000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [thread?.id, user, token, selectedId, guestThread, fetchThread]);

  useEffect(() => {
    if (user && !selectedId) setThread(null);
  }, [user, selectedId]);

  useEffect(() => {
    if (user && token && selectedId) {
      void fetchThread(selectedId);
    }
  }, [user, token, selectedId, fetchThread]);

  useEffect(() => {
    if (!user && guestThread) {
      void fetchThread(guestThread.conversationId, guestThread.visitorToken);
    }
  }, [user, guestThread, fetchThread]);

  const startGuestConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch(apiUrl("/api/support/conversations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          message: newMessage.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
        visitorToken?: string | null;
      };
      if (!res.ok) {
        toast.error(data.error || "Não foi possível enviar.");
        return;
      }
      if (!data.id || !data.visitorToken) {
        toast.error("Resposta inválida do servidor.");
        return;
      }
      const stored: GuestStored = {
        conversationId: data.id,
        visitorToken: data.visitorToken,
      };
      saveGuestThread(stored);
      setGuestThread(stored);
      setNewMessage("");
      toast.success("Mensagem enviada! A equipe responde em breve.");
      await fetchThread(stored.conversationId, stored.visitorToken);
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const startUserConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSending(true);
    try {
      const res = await fetch(apiUrl("/api/support/conversations"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Não foi possível abrir a conversa.");
        return;
      }
      if (!data.id) {
        toast.error("Resposta inválida do servidor.");
        return;
      }
      setNewMessage("");
      setShowNewForm(false);
      toast.success("Conversa iniciada.");
      await fetchUserList();
      setSelectedId(data.id);
      await fetchThread(data.id);
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !thread) return;

    const id = thread.id;
    setSending(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const body: { body: string; visitorToken?: string } = { body: text };
      if (guestThread && guestThread.conversationId === id) {
        body.visitorToken = guestThread.visitorToken;
      }
      const res = await fetch(apiUrl(`/api/support/conversations/${id}/messages`), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Não foi possível enviar.");
        return;
      }
      setReplyText("");
      if (guestThread) {
        await fetchThread(id, guestThread.visitorToken);
      } else {
        await fetchThread(id);
      }
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const clearGuestThread = () => {
    localStorage.removeItem(GUEST_THREAD_KEY);
    setGuestThread(null);
    setThread(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-china-red" />
        </main>
        <Footer />
      </div>
    );
  }

  const showGuestComposer = !user && guestThread && thread?.id === guestThread.conversationId;
  const showUserComposer =
    user && selectedId && thread?.id === selectedId && !showNewForm;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <div className="mb-8">
          <span className="text-xs font-bold text-china-red uppercase tracking-widest">
            Atendimento
          </span>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground mt-1">
            Fale com a equipe
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Envie sua dúvida por aqui — a equipe do ComprasChina responde nesta
            mesma conversa. Você também pode usar{" "}
            <Link to="/#contato" className="text-china-red font-medium hover:underline">
              WhatsApp ou e-mail
            </Link>
            .
          </p>
        </div>

        {user && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button
              type="button"
              variant={showNewForm ? "secondary" : "default"}
              className="gap-2"
              onClick={() => {
                setShowNewForm((v) => !v);
                if (!showNewForm) setSelectedId(null);
              }}
            >
              <MessageSquarePlus className="w-4 h-4" />
              {showNewForm ? "Ver conversas" : "Nova conversa"}
            </Button>
            {loadingList && (
              <span className="text-xs text-muted-foreground self-center flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Carregando…
              </span>
            )}
          </div>
        )}

        {user && !showNewForm && list.length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Suas conversas
            </p>
            <ul className="rounded-xl border border-border divide-y divide-border bg-card overflow-hidden">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setShowNewForm(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/60 ${
                      selectedId === c.id ? "bg-muted/80" : ""
                    }`}
                  >
                    <span className="font-medium text-foreground block truncate">
                      {c.lastPreview || "(sem texto)"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.lastMessageAt).toLocaleString("pt-BR")} ·{" "}
                      {c.status === "OPEN" ? "Aberta" : "Encerrada"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {user && showNewForm && (
          <form
            onSubmit={startUserConversation}
            className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4 mb-6"
          >
            <label className="block text-sm font-medium text-foreground">
              Mensagem
              <textarea
                required
                rows={5}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-china-red/30"
                placeholder="Descreva sua dúvida ou pedido…"
                disabled={sending}
              />
            </label>
            <Button type="submit" disabled={sending} className="gap-2">
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Enviar para a equipe
            </Button>
          </form>
        )}

        {!user && !guestThread && (
          <form
            onSubmit={startGuestConversation}
            className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-foreground">
                Nome
                <input
                  required
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-china-red/30"
                  disabled={sending}
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                E-mail
                <input
                  required
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-china-red/30"
                  disabled={sending}
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-foreground">
              Mensagem
              <textarea
                required
                rows={5}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-china-red/30"
                placeholder="Descreva sua dúvida ou pedido…"
                disabled={sending}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              <Link to="/cadastro" className="text-china-red hover:underline">
                Crie uma conta
              </Link>{" "}
              para acompanhar várias conversas no mesmo lugar.
            </p>
            <Button type="submit" disabled={sending} className="gap-2">
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Enviar para a equipe
            </Button>
          </form>
        )}

        {(showGuestComposer || showUserComposer) && (
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2 bg-muted/30">
              <span className="text-sm font-semibold text-foreground">
                Conversa
                {thread?.status === "CLOSED" && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (encerrada — você ainda pode enviar para reabrir)
                  </span>
                )}
              </span>
              {!user && guestThread && (
                <button
                  type="button"
                  onClick={clearGuestThread}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Outro assunto
                </button>
              )}
            </div>
            <div className="p-4 min-h-[200px] max-h-[420px] overflow-y-auto space-y-3">
              {loadingThread && !thread?.messages?.length ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-china-red" />
                </div>
              ) : (
                thread?.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === "USER" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        m.sender === "USER"
                          ? "bg-china-red text-white rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className={`text-[10px] mt-1 opacity-80 ${
                          m.sender === "USER" ? "text-white/80" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(m.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form
              onSubmit={sendReply}
              className="border-t border-border p-4 flex flex-col sm:flex-row gap-2 bg-muted/20"
            >
              <textarea
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-china-red/30 resize-none"
                placeholder="Escreva uma mensagem…"
                disabled={sending || loadingThread}
              />
              <Button
                type="submit"
                disabled={sending || !replyText.trim() || loadingThread}
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
          </div>
        )}

        {user && !showNewForm && list.length === 0 && !loadingList && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            Você ainda não tem conversas. Clique em{" "}
            <strong className="text-foreground">Nova conversa</strong> para falar
            com a equipe.
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default FaleConosco;
