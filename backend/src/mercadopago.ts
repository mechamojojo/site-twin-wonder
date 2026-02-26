/**
 * Mercado Pago Payments API - Checkout Transparente
 * Documentação: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
 */

const MP_API = "https://api.mercadopago.com/v1/payments";

export async function createPayment(params: {
  accessToken: string;
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
    body.token = token;
    body.installments = installments;
    if (issuerId) body.issuer_id = issuerId;
  }

  const res = await fetch(MP_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
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
