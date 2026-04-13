import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSupportChat } from "@/hooks/useSupportChat";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MessageSquarePlus,
  MessagesSquare,
  Send,
  X,
} from "lucide-react";

/**
 * Botão flutuante + painel de conversa (mesma API que /fale-conosco).
 * Oculto em /admin/* e na própria página /fale-conosco (evita dois hooks useSupportChat).
 */
const SupportChatWidget = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin") || pathname === "/fale-conosco") {
    return null;
  }
  return <SupportChatWidgetOpen />;
};

function SupportChatWidgetOpen() {
  const [open, setOpen] = useState(false);
  const chat = useSupportChat();

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("compraschina:open-support-chat", openChat);
    return () =>
      window.removeEventListener(
        "compraschina:open-support-chat",
        openChat,
      );
  }, []);

  const {
    authLoading,
    user,
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
    startGuestConversation,
    startUserConversation,
    sendReply,
    clearGuestThread,
    showGuestComposer,
    showUserComposer,
    guestThread,
  } = chat;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
      aria-live="polite"
    >
      {open && (
        <div
          className="flex w-[min(calc(100vw-2rem),380px)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          style={{ maxHeight: "min(520px, calc(100vh - 5.5rem))" }}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-china-red to-china-red/85 px-3 py-2.5 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-heading font-bold">
                Fale com a equipe
              </p>
              <p className="truncate text-[11px] text-white/85">
                Suporte em português — respondemos por aqui
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full p-1.5 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Fechar chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {authLoading ? (
              <div className="flex flex-1 items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-china-red" />
              </div>
            ) : (
              <>
                {user && (
                  <div className="flex shrink-0 gap-2 border-b border-border bg-muted/30 px-2 py-2">
                    <Button
                      type="button"
                      variant={showNewForm ? "secondary" : "default"}
                      size="sm"
                      className="h-8 flex-1 gap-1 text-xs"
                      onClick={() => {
                        setShowNewForm((v) => !v);
                        if (!showNewForm) setSelectedId(null);
                      }}
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      {showNewForm ? "Conversas" : "Nova"}
                    </Button>
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {user && !showNewForm && list.length > 0 && (
                    <ul className="divide-y divide-border border-b border-border">
                      {list.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(c.id);
                              setShowNewForm(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-muted/60 ${
                              selectedId === c.id ? "bg-muted/80" : ""
                            }`}
                          >
                            <span className="line-clamp-2 font-medium text-foreground">
                              {c.lastPreview || "(sem texto)"}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">
                              {new Date(c.lastMessageAt).toLocaleString("pt-BR")}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {user && showNewForm && (
                    <form
                      onSubmit={startUserConversation}
                      className="space-y-2 p-3"
                    >
                      <textarea
                        required
                        rows={4}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="w-full resize-none rounded-xl border border-border bg-background px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-china-red/30"
                        placeholder="Sua mensagem…"
                        disabled={sending}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={sending}
                        className="h-8 w-full gap-1 text-xs"
                      >
                        {sending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Enviar
                      </Button>
                    </form>
                  )}

                  {!user && !guestThread && (
                    <form
                      onSubmit={startGuestConversation}
                      className="space-y-2 p-3"
                    >
                      <input
                        required
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nome"
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-china-red/30"
                        disabled={sending}
                      />
                      <input
                        required
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="E-mail"
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-china-red/30"
                        disabled={sending}
                      />
                      <textarea
                        required
                        rows={3}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Como podemos ajudar?"
                        className="w-full resize-none rounded-xl border border-border bg-background px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-china-red/30"
                        disabled={sending}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={sending}
                        className="h-8 w-full gap-1 text-xs"
                      >
                        {sending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Enviar
                      </Button>
                    </form>
                  )}

                  {(showGuestComposer || showUserComposer) && (
                    <div className="flex min-h-[200px] flex-col border-t border-border">
                      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/20 px-2 py-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {thread?.status === "CLOSED"
                            ? "Encerrada — envie para reabrir"
                            : "Conversa"}
                        </span>
                        {!user && guestThread && (
                          <button
                            type="button"
                            onClick={clearGuestThread}
                            className="text-[10px] text-china-red hover:underline"
                          >
                            Novo assunto
                          </button>
                        )}
                      </div>
                      <div className="max-h-[200px] min-h-[120px] space-y-2 overflow-y-auto p-2">
                        {loadingThread && !thread?.messages?.length ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-china-red" />
                          </div>
                        ) : (
                          thread?.messages.map((m) => (
                            <div
                              key={m.id}
                              className={`flex ${m.sender === "USER" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[90%] rounded-2xl px-2.5 py-1.5 text-[11px] leading-snug ${
                                  m.sender === "USER"
                                    ? "rounded-br-sm bg-china-red text-white"
                                    : "rounded-bl-sm bg-muted text-foreground"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words">
                                  {m.body}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <form
                        onSubmit={sendReply}
                        className="flex gap-1.5 border-t border-border p-2"
                      >
                        <textarea
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-0 flex-1 resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-china-red/30"
                          placeholder="Mensagem…"
                          disabled={sending || loadingThread}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={
                            sending || !replyText.trim() || loadingThread
                          }
                          className="h-auto shrink-0 self-end px-2.5"
                        >
                          {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </form>
                    </div>
                  )}

                  {user &&
                    !showNewForm &&
                    list.length === 0 &&
                    !loadingList && (
                      <p className="p-3 text-center text-[11px] text-muted-foreground">
                        Nenhuma conversa ainda. Toque em{" "}
                        <strong className="text-foreground">Nova</strong>.
                      </p>
                    )}
                </div>

                <div className="shrink-0 border-t border-border bg-muted/20 px-2 py-1.5 text-center">
                  <Link
                    to="/fale-conosco"
                    onClick={() => setOpen(false)}
                    className="text-[10px] font-medium text-china-red hover:underline"
                  >
                    Abrir em página completa
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-china-red text-white shadow-lg transition-transform hover:scale-105 hover:bg-china-red/90 focus:outline-none focus:ring-4 focus:ring-china-red/35"
        aria-label={open ? "Fechar atendimento" : "Abrir atendimento"}
        aria-expanded={open}
      >
        {open ? (
          <X className="h-7 w-7" />
        ) : (
          <MessagesSquare className="h-7 w-7" />
        )}
      </button>
    </div>
  );
}

export default SupportChatWidget;
