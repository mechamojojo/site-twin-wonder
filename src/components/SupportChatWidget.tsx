import { useEffect, useRef, useState } from "react";
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

/** Tempo no site antes do convite (só depois disso). */
const WELCOME_NUDGE_DELAY_MS = 32_000;
/**
 * Uma vez por navegador (localStorage): evita reaparecer a cada rota, aba ou
 * remontagem do React. Limpar dados do site mostra de novo.
 */
const WELCOME_NUDGE_STORAGE_KEY = "compraschina-support-welcome-nudge-v1";

function isWelcomeNudgeConsumed(): boolean {
  try {
    return localStorage.getItem(WELCOME_NUDGE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function consumeWelcomeNudge(): void {
  try {
    localStorage.setItem(WELCOME_NUDGE_STORAGE_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * Botão flutuante + painel (estilo leve, inspirado em widgets tipo Intercom/Crisp).
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
  const [showWelcomeNudge, setShowWelcomeNudge] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;
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

  useEffect(() => {
    if (open) {
      setShowWelcomeNudge(false);
      consumeWelcomeNudge();
    }
  }, [open]);

  useEffect(() => {
    if (isWelcomeNudgeConsumed()) return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      if (openRef.current) return;
      if (isWelcomeNudgeConsumed()) return;
      consumeWelcomeNudge();
      setShowWelcomeNudge(true);
    }, WELCOME_NUDGE_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  const dismissWelcomeNudge = () => {
    setShowWelcomeNudge(false);
    consumeWelcomeNudge();
  };

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
      className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-4 sm:bottom-6 sm:right-6"
      aria-live="polite"
    >
      {open && (
        <div
          className="flex w-[min(calc(100vw-2rem),428px)] flex-col overflow-hidden rounded-[1.35rem] border border-border/80 bg-background shadow-[0_12px_48px_-8px_rgba(0,0,0,0.18),0_4px_16px_-4px_rgba(0,0,0,0.08)]"
          style={{ maxHeight: "min(620px, calc(100vh - 5rem))" }}
        >
          {/* Cabeçalho claro (evita faixa vermelha “pesada”) */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 bg-muted/25 px-4 py-4">
            <div className="flex min-w-0 gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-china-red/10 text-sm font-heading font-bold text-china-red"
                aria-hidden
              >
                CC
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="truncate font-heading text-base font-semibold leading-tight text-foreground">
                  ComprasChina
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                  Fale com nosso time e tire dúvidas sobre produtos, fornecedores
                  e importação.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-china-red/25"
              aria-label="Fechar chat"
            >
              <X className="h-6 w-6" strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            {authLoading ? (
              <div className="flex flex-1 items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {user && (
                  <div className="flex shrink-0 border-b border-border/60 bg-muted/15 px-3 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 flex-1 gap-2 border-border/80 bg-background text-[13px] font-medium text-foreground shadow-none hover:bg-muted/50"
                      onClick={() => {
                        setShowNewForm((v) => !v);
                        if (!showNewForm) setSelectedId(null);
                      }}
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      {showNewForm ? "Minhas conversas" : "Nova conversa"}
                    </Button>
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {user && !showNewForm && list.length > 0 && (
                    <ul className="divide-y divide-border/60">
                      {list.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(c.id);
                              setShowNewForm(false);
                            }}
                            className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40 ${
                              selectedId === c.id ? "bg-muted/50" : ""
                            }`}
                          >
                            <span className="line-clamp-2 text-[14px] font-medium leading-snug text-foreground">
                              {c.lastPreview || "Sem prévia ainda"}
                            </span>
                            <span className="mt-1 block text-[11px] text-muted-foreground">
                              {new Date(c.lastMessageAt).toLocaleString(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {user && showNewForm && (
                    <form
                      onSubmit={startUserConversation}
                      className="space-y-3 p-4"
                    >
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        Escreva sua dúvida ou pedido. Você recebe a resposta
                        aqui mesmo e pode acompanhar depois em “Minhas
                        conversas”.
                      </p>
                      <textarea
                        required
                        rows={4}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-[14px] leading-snug outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-china-red/30 focus:ring-2 focus:ring-china-red/15"
                        placeholder="Ex.: Quero cotar um produto do link que vou colar abaixo…"
                        disabled={sending}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={sending}
                        className="h-10 w-full text-[13px] font-semibold shadow-sm"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Enviar mensagem
                      </Button>
                    </form>
                  )}

                  {!user && !guestThread && (
                    <form
                      onSubmit={startGuestConversation}
                      className="space-y-3 p-4"
                    >
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        Olá! Preencha os campos abaixo. Nossa equipe lê tudo em
                        português e responde por aqui — sem precisar instalar
                        nada.
                      </p>
                      <input
                        required
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-china-red/30 focus:ring-2 focus:ring-china-red/15"
                        disabled={sending}
                      />
                      <input
                        required
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Seu melhor e-mail"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-china-red/30 focus:ring-2 focus:ring-china-red/15"
                        disabled={sending}
                      />
                      <textarea
                        required
                        rows={3}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Em uma ou duas frases: no que podemos ajudar?"
                        className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-[14px] leading-snug outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-china-red/30 focus:ring-2 focus:ring-china-red/15"
                        disabled={sending}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={sending}
                        className="h-10 w-full text-[13px] font-semibold shadow-sm"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Enviar para a equipe
                      </Button>
                    </form>
                  )}

                  {(showGuestComposer || showUserComposer) && (
                    <div className="flex min-h-[220px] flex-col border-t border-border/60">
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/10 px-3 py-2">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {thread?.status === "CLOSED"
                            ? "Conversa encerrada — envie uma mensagem para reabrir"
                            : "Sua conversa"}
                        </span>
                        {!user && guestThread && (
                          <button
                            type="button"
                            onClick={clearGuestThread}
                            className="text-[11px] font-medium text-china-red/90 hover:underline"
                          >
                            Outro assunto
                          </button>
                        )}
                      </div>
                      <div className="max-h-[280px] min-h-[140px] space-y-2.5 overflow-y-auto bg-muted/5 p-3">
                        {loadingThread && !thread?.messages?.length ? (
                          <div className="flex justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          thread?.messages.map((m) => (
                            <div
                              key={m.id}
                              className={`flex ${m.sender === "USER" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-sm ${
                                  m.sender === "USER"
                                    ? "rounded-br-md border border-china-red/15 bg-china-red/[0.08] text-foreground"
                                    : "rounded-bl-md border border-border/80 bg-card text-foreground"
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
                        className="flex gap-2 border-t border-border/60 bg-muted/10 p-3"
                      >
                        <textarea
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[48px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] leading-snug outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-china-red/30 focus:ring-2 focus:ring-china-red/15"
                          placeholder="Digite sua mensagem…"
                          disabled={sending || loadingThread}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={
                            sending || !replyText.trim() || loadingThread
                          }
                          className="h-12 w-12 shrink-0 rounded-full p-0 shadow-sm"
                          aria-label="Enviar mensagem"
                        >
                          {sending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </Button>
                      </form>
                    </div>
                  )}

                  {user &&
                    !showNewForm &&
                    list.length === 0 &&
                    !loadingList && (
                      <p className="px-4 py-6 text-center text-[13px] leading-relaxed text-muted-foreground">
                        Você ainda não tem conversas. Use{" "}
                        <strong className="font-medium text-foreground">
                          Nova conversa
                        </strong>{" "}
                        acima para falar com a gente.
                      </p>
                    )}
                </div>

                <div className="shrink-0 border-t border-border/60 bg-muted/10 px-3 py-2 text-center">
                  <Link
                    to="/fale-conosco"
                    onClick={() => setOpen(false)}
                    className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-china-red"
                  >
                    Abrir em tela cheia
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showWelcomeNudge && !open && (
        <div
          role="dialog"
          aria-labelledby="support-welcome-nudge-label"
          className="relative w-[min(calc(100vw-2rem),336px)] origin-bottom-right animate-in fade-in-0 zoom-in-95 duration-300"
        >
          <span id="support-welcome-nudge-label" className="sr-only">
            Nova mensagem da equipe ComprasChina
          </span>
          {/* Cartão opaco: legível em cima de foto/hero escuro */}
          <div className="rounded-2xl border-2 border-border bg-card p-3.5 shadow-[0_12px_40px_-4px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
            <button
              type="button"
              onClick={dismissWelcomeNudge}
              className="absolute -right-1.5 -top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-china-red/25"
              aria-label="Dispensar mensagem"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>

            <div className="flex gap-2.5 pr-6 pt-0.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-china-red/15 text-sm font-heading font-bold text-china-red"
                aria-hidden
              >
                CC
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-foreground">
                    ComprasChina
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    agora
                  </span>
                </div>
                <div className="rounded-2xl rounded-bl-md border border-border bg-muted px-3.5 py-3 text-[14px] leading-relaxed text-foreground shadow-inner">
                  <p className="font-medium">Oi! Seja bem-vindo.</p>
                  <p className="mt-2">
                    Se tiver alguma dúvida, clique no chat no canto da tela e
                    fale com nossa equipe.
                  </p>
                  <p className="mt-2">
                    Tem um produto em mente, mas não o encontrou no site? Envie
                    para nós e montamos o link para você.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 h-9 w-full bg-china-red text-[13px] font-semibold text-white shadow-sm hover:bg-china-red/90"
                  onClick={() => setOpen(true)}
                >
                  Abrir chat e responder
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB estilo “widget” comum: fundo claro + ícone da marca */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-16 w-16 items-center justify-center rounded-full border border-border/90 bg-background text-china-red shadow-[0_6px_24px_-2px_rgba(0,0,0,0.2)] transition-all hover:scale-[1.03] hover:shadow-[0_10px_32px_-4px_rgba(0,0,0,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-china-red/25 focus-visible:ring-offset-2"
        aria-label={open ? "Fechar atendimento" : "Abrir atendimento"}
        aria-expanded={open}
      >
        {open ? (
          <X className="h-7 w-7 text-muted-foreground" strokeWidth={1.75} />
        ) : (
          <MessagesSquare className="h-7 w-7" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}

export default SupportChatWidget;
