import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSupportChat } from "@/hooks/useSupportChat";
import { Loader2, MessageSquarePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const FaleConosco = () => {
  const chat = useSupportChat();
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
            Envie sua dúvida por aqui — a equipe responde nesta mesma conversa.
            Nas outras páginas do site, o mesmo atendimento abre pelo ícone de
            mensagem no canto inferior direito. Também há{" "}
            <Link
              to="/#contato"
              className="text-china-red font-medium hover:underline"
            >
              e-mail na seção de contato
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
                          m.sender === "USER"
                            ? "text-white/80"
                            : "text-muted-foreground"
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
