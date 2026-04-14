import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export const GUEST_THREAD_KEY = "compraschina-support-guest";

export type GuestStored = { conversationId: string; visitorToken: string };

export type ConvListItem = {
  id: string;
  status: string;
  lastMessageAt: string;
  lastPreview: string;
};

export type ThreadMsg = {
  id: string;
  sender: "USER" | "STAFF";
  body: string;
  createdAt: string;
};

export function loadGuestThread(): GuestStored | null {
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

export function saveGuestThread(v: GuestStored) {
  localStorage.setItem(GUEST_THREAD_KEY, JSON.stringify(v));
}

export function useSupportChat() {
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
        setThread((prev) => {
          if (prev && prev.id === data.id) {
            const prevIds = new Set(prev.messages.map((m) => m.id));
            const newStaff = data.messages.filter(
              (m) => m.sender === "STAFF" && !prevIds.has(m.id),
            );
            if (newStaff.length > 0) {
              toast.success(
                "Você tem uma resposta da equipe — confira abaixo.",
                { duration: 6500 },
              );
            }
          }
          return data;
        });
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

  const showGuestComposer =
    !user && guestThread && thread?.id === guestThread.conversationId;
  const showUserComposer =
    user && selectedId && thread?.id === selectedId && !showNewForm;

  return {
    authLoading,
    user,
    token,
    guestThread,
    list,
    selectedId,
    setSelectedId,
    thread,
    loadingList,
    loadingThread,
    sending,
    newName,
    setNewName,
    newEmail,
    setNewEmail,
    newMessage,
    setNewMessage,
    replyText,
    setReplyText,
    showNewForm,
    setShowNewForm,
    fetchUserList,
    fetchThread,
    startGuestConversation,
    startUserConversation,
    sendReply,
    clearGuestThread,
    showGuestComposer,
    showUserComposer,
  };
}
