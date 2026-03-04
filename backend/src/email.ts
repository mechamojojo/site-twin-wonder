/**
 * Envio de e-mails via Resend (confirmação de conta e recuperação de senha).
 * Se RESEND_API_KEY não estiver definida, os métodos não enviam e apenas logam.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "ComprasChina <onboarding@resend.dev>";
const SITE_URL = process.env.SITE_URL || "http://localhost:5173";

function canSend(): boolean {
  return Boolean(RESEND_API_KEY?.trim());
}

export async function sendVerificationEmail(email: string, name: string, token: string): Promise<boolean> {
  const link = `${SITE_URL.replace(/\/$/, "")}/confirmar-email?token=${encodeURIComponent(token)}`;
  const html = `
    <p>Olá, ${escapeHtml(name)}!</p>
    <p>Clique no link abaixo para confirmar seu e-mail e ativar sua conta na ComprasChina:</p>
    <p><a href="${escapeHtml(link)}" style="color:#b22222;">Confirmar meu e-mail</a></p>
    <p>Se você não criou uma conta, ignore este e-mail.</p>
    <p>Este link expira em 24 horas.</p>
    <p>— ComprasChina</p>
  `;
  return sendEmail({
    to: email,
    subject: "Confirme seu e-mail — ComprasChina",
    html,
  });
}

export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<boolean> {
  const link = `${SITE_URL.replace(/\/$/, "")}/redefinir-senha?token=${encodeURIComponent(token)}`;
  const html = `
    <p>Olá, ${escapeHtml(name)}!</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta ComprasChina.</p>
    <p><a href="${escapeHtml(link)}" style="color:#b22222;">Redefinir minha senha</a></p>
    <p>Se você não pediu isso, ignore este e-mail. Sua senha não será alterada.</p>
    <p>Este link expira em 1 hora.</p>
    <p>— ComprasChina</p>
  `;
  return sendEmail({
    to: email,
    subject: "Redefinir senha — ComprasChina",
    html,
  });
}

async function sendEmail(params: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!canSend()) {
    console.log("[email] RESEND_API_KEY não configurada. E-mail não enviado:", params.subject, "→", params.to);
    return true; // não falha o fluxo em dev
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Resend error:", res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Send failed:", err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
