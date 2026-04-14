/**
 * Mercado Pago Payments API - Checkout Transparente
 * Documentação: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
 */

const MP_API = "https://api.mercadopago.com/v1/payments";

/** Limite de parcelas no cartão (política da loja; tarifa absorvida pelo vendedor no MP). */
export const MP_MAX_INSTALLMENTS_CARD = 10;

export async function createPayment(params: {
  accessToken: string;
  idempotencyKey: string;
  transactionAmount: number;
  token?: string;
  paymentMethodId: string;
  payerEmail: string;
  payerName?: string;
  description?: string;
  installments?: number;
  issuerId?: string;
  identificationType?: string;
  identificationNumber?: string;
}): Promise<{ id: number; status: string; point_of_interaction?: unknown }> {
  const {
    accessToken,
    idempotencyKey,
    transactionAmount,
    token,
    paymentMethodId,
    payerEmail,
    payerName,
    description,
    installments = 1,
    issuerId,
    identificationType,
    identificationNumber,
  } = params;

  const isPix = paymentMethodId.toLowerCase() === "pix";
  const isCard = !isPix && token;

  if (!isPix && !token) {
    throw new Error("Token do cartão é obrigatório para pagamento com cartão");
  }

  const payer: Record<string, unknown> = {
    email: payerEmail,
    ...(payerName && { first_name: payerName.split(" ")[0] || payerName }),
    ...(identificationType &&
      identificationNumber && {
        identification: { type: identificationType, number: identificationNumber.replace(/\D/g, "") },
      }),
  };

  const body: Record<string, unknown> = {
    transaction_amount: Math.round(transactionAmount * 100) / 100,
    payment_method_id: paymentMethodId,
    payer,
    description: description || "ComprasChina - Pedido",
  };

  if (isCard) {
    const n = Number(installments);
    if (
      !Number.isFinite(n) ||
      n < 1 ||
      n > MP_MAX_INSTALLMENTS_CARD ||
      !Number.isInteger(n)
    ) {
      throw new Error(
        `Parcelas inválidas. Utilize de 1 a ${MP_MAX_INSTALLMENTS_CARD} parcelas.`,
      );
    }
    body.token = token;
    body.installments = n;
    if (issuerId) body.issuer_id = issuerId;
  }

  const res = await fetch(MP_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    id?: number;
    status?: string;
    message?: string;
    cause?: { description?: string }[];
    point_of_interaction?: unknown;
  };

  if (!res.ok) {
    const msg = data.message || data.cause?.[0]?.description || "Erro ao processar pagamento";
    throw new Error(msg);
  }

  return {
    id: data.id!,
    status: data.status!,
    point_of_interaction: data.point_of_interaction as {
      transaction_data?: {
        qr_code?: string;
        qr_code_base64?: string;
        ticket_url?: string;
      };
    } | undefined,
  };
}

/** Extrai QR / copia e cola / link do retorno do MP (estruturas variam por versão de API). */
export function extractPixTransactionData(pointOfInteraction: unknown): {
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
} | null {
  if (!pointOfInteraction || typeof pointOfInteraction !== "object") {
    return null;
  }
  const poi = pointOfInteraction as Record<string, unknown>;
  const rawTd = poi.transaction_data;
  const td =
    rawTd && typeof rawTd === "object"
      ? (rawTd as Record<string, unknown>)
      : poi;

  const qr_code =
    typeof td.qr_code === "string"
      ? td.qr_code
      : typeof td.qrcode === "string"
        ? td.qrcode
        : undefined;
  const qr_code_base64 =
    typeof td.qr_code_base64 === "string" ? td.qr_code_base64 : undefined;
  const ticket_url =
    typeof td.ticket_url === "string" ? td.ticket_url : undefined;

  if (!qr_code && !qr_code_base64 && !ticket_url) return null;
  return { qr_code, qr_code_base64, ticket_url };
}
