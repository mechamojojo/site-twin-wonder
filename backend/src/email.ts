/**
 * Envio de e-mails via Resend (confirmação de conta e recuperação de senha).
 * Se RESEND_API_KEY não estiver definida, os métodos não enviam e apenas logam.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM || "ComprasChina <onboarding@resend.dev>";
const SITE_URL = process.env.SITE_URL || "http://localhost:5173";

function canSend(): boolean {
  return Boolean(RESEND_API_KEY?.trim());
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
): Promise<boolean> {
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

export async function sendOrderStatusEmail(
  email: string,
  name: string,
  orderId: string,
  status: string,
  productTitle: string | null,
): Promise<boolean> {
  const STATUS_LABELS: Record<string, { label: string; message: string }> = {
    PAGO: {
      label: "Pago ✓",
      message:
        "Recebemos a confirmação do seu pagamento. Seu pedido está em processamento.",
    },
    COMPRADO: {
      label: "Comprado",
      message:
        "Seu produto foi comprado no fornecedor e está sendo preparado para envio ao Brasil.",
    },
    NO_ESTOQUE: {
      label: "No estoque",
      message:
        "Seu produto chegou ao nosso estoque na China e será enviado em breve.",
    },
    AGUARDANDO_ENVIO: {
      label: "Aguardando envio",
      message: "Seu pedido está embalado e aguardando despacho para o Brasil.",
    },
    EM_ENVIO: {
      label: "Em envio 🚀",
      message:
        "Seu pedido foi despachado para o Brasil! Em breve você receberá o código de rastreamento.",
    },
    CONCLUIDO: {
      label: "Entregue 🎉",
      message:
        "Seu pedido foi concluído! Obrigado por comprar na ComprasChina.",
    },
    CANCELADO: {
      label: "Cancelado",
      message:
        "Seu pedido foi cancelado. Entre em contato conosco se precisar de ajuda.",
    },
  };

  const info = STATUS_LABELS[status];
  if (!info) return true; // not a user-visible status, skip email

  const link = `${SITE_URL.replace(/\/$/, "")}/pedido-confirmado/${orderId}`;
  const productName = productTitle || "seu produto";

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
      <h2 style="color:#b22222;margin-bottom:4px">ComprasChina</h2>
      <hr style="border:none;border-top:1px solid #eee;margin:12px 0 20px">
      <p>Olá, ${escapeHtml(name)}!</p>
      <p>Seu pedido foi atualizado:</p>
      <div style="background:#f7f7f7;border-left:4px solid #b22222;padding:12px 16px;border-radius:4px;margin:16px 0">
        <p style="margin:0 0 6px;font-weight:600">${escapeHtml(productName)}</p>
        <p style="margin:0;font-size:15px">Status: <strong>${escapeHtml(info.label)}</strong></p>
      </div>
      <p>${escapeHtml(info.message)}</p>
      <p style="margin-top:24px">
        <a href="${escapeHtml(link)}" style="background:#b22222;color:#fff;padding:10px 20px;border-radius:20px;text-decoration:none;font-weight:bold;font-size:14px">
          Ver detalhes do pedido →
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0 12px">
      <p style="font-size:12px;color:#888">ComprasChina — Intermediário brasileiro de compras na China</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Pedido atualizado: ${info.label} — ComprasChina`,
    html,
  });
}

/** Base pública onde `/uploads/...` está acessível (ex.: URL do backend na Railway). */
function assetBaseForEmail(): string {
  const api = process.env.API_PUBLIC_URL?.trim();
  if (api) return api.replace(/\/$/, "");
  return SITE_URL.replace(/\/$/, "");
}

export async function sendWarehousePhotosEmail(
  toEmail: string,
  name: string,
  orderId: string,
  productTitle: string | null,
  photoPaths: string[],
  extraMessage?: string,
): Promise<boolean> {
  const base = assetBaseForEmail();
  const productName = productTitle || "seu pedido";
  const orderLink = `${SITE_URL.replace(/\/$/, "")}/pedido-confirmado/${orderId}`;
  const absUrls = photoPaths.map((p) =>
    p.startsWith("http")
      ? p
      : `${base}${p.startsWith("/") ? p : `/${p}`}`,
  );
  const imgsHtml = absUrls
    .map(
      (url, i) =>
        `<p style="margin:12px 0"><a href="${escapeHtml(url)}" style="color:#b22222">Abrir foto ${i + 1} em tamanho real</a></p>` +
        `<p style="margin:0"><img src="${escapeHtml(url)}" alt="Foto ${i + 1} do armazém" width="560" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #eee;display:block" /></p>`,
    )
    .join("");
  const noteBlock = extraMessage
    ? `<p style="margin:16px 0;padding:12px;background:#f9f9f9;border-radius:8px">${escapeHtml(extraMessage)}</p>`
    : "";
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <h2 style="color:#b22222;margin-bottom:4px">ComprasChina</h2>
      <hr style="border:none;border-top:1px solid #eee;margin:12px 0 20px">
      <p>Olá, ${escapeHtml(name)}!</p>
      <p>Seguem as <strong>fotos do seu produto</strong> recebidas no nosso armazém na China (conferência de qualidade) referentes a <strong>${escapeHtml(productName)}</strong>.</p>
      ${noteBlock}
      ${imgsHtml}
      <p style="margin-top:24px">
        <a href="${escapeHtml(orderLink)}" style="background:#b22222;color:#fff;padding:10px 20px;border-radius:20px;text-decoration:none;font-weight:bold;font-size:14px">
          Ver pedido no site →
        </a>
      </p>
      <p style="font-size:12px;color:#888;margin-top:20px">Se as imagens não aparecerem no e-mail, use os links &quot;Abrir foto&quot; acima.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0 12px">
      <p style="font-size:12px;color:#888">ComprasChina — Intermediário brasileiro de compras na China</p>
    </div>
  `;
  return sendEmail({
    to: toEmail,
    subject: `Fotos do seu produto no armazém — ComprasChina`,
    html,
  });
}

/** Aviso ao cliente quando a equipe responde no chat (Fale conosco). */
export async function sendSupportStaffReplyEmail(
  email: string,
  recipientName: string,
  conversationId: string,
  replyPreview: string,
): Promise<boolean> {
  const base = SITE_URL.replace(/\/$/, "");
  const chatLink = `${base}/fale-conosco?open=${encodeURIComponent(conversationId)}`;
  const rawPreview = replyPreview.trim();
  const preview = rawPreview.slice(0, 220);
  const safeName = recipientName.trim() || "Olá";
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
      <h2 style="color:#b22222;margin-bottom:4px">ComprasChina</h2>
      <hr style="border:none;border-top:1px solid #eee;margin:12px 0 20px">
      <p>Olá, ${escapeHtml(safeName)}!</p>
      <p><strong>Você tem uma nova resposta</strong> da nossa equipe no atendimento do site.</p>
      ${
        preview
          ? `<p style="background:#f7f7f7;border-left:4px solid #b22222;padding:12px 16px;border-radius:4px;margin:16px 0;font-size:14px;line-height:1.5">${escapeHtml(preview)}${rawPreview.length > 220 ? "…" : ""}</p>`
          : ""
      }
      <p style="margin-top:24px">
        <a href="${escapeHtml(chatLink)}" style="background:#b22222;color:#fff;padding:10px 20px;border-radius:20px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">
          Abrir conversa em compraschina.com.br →
        </a>
      </p>
      <p style="font-size:13px;color:#555;margin-top:20px;line-height:1.5">
        Se você iniciou o chat <strong>sem estar logado</strong>, abra o link acima no <strong>mesmo aparelho e navegador</strong> em que começou a conversa — ou faça login com o mesmo e-mail para ver todas as mensagens.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0 12px">
      <p style="font-size:12px;color:#888">ComprasChina — Atendimento</p>
    </div>
  `;
  return sendEmail({
    to: email,
    subject: "Você tem uma resposta — ComprasChina",
    html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string,
): Promise<boolean> {
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

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!canSend()) {
    console.log(
      "[email] RESEND_API_KEY não configurada. E-mail não enviado:",
      params.subject,
      "→",
      params.to,
    );
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
