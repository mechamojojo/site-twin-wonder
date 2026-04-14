/** Dados do PIX retornados por `POST /api/orders/:id/create-payment`. */
export type PixTransactionData = {
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
};

/**
 * Normaliza a resposta do create-payment (campo `pix` ou `point_of_interaction`).
 */
export function pixDataFromCreatePaymentResponse(data: {
  pix?: PixTransactionData | null;
  point_of_interaction?: unknown;
  status?: string;
}): PixTransactionData | null {
  if (data.pix && typeof data.pix === "object") {
    const p = data.pix;
    if (p.qr_code || p.qr_code_base64 || p.ticket_url) return p;
  }
  const poi = data.point_of_interaction as Record<string, unknown> | undefined;
  if (!poi) return null;
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

export function hasRenderablePixPayload(p: PixTransactionData | null): boolean {
  if (!p) return false;
  return Boolean(p.qr_code || p.qr_code_base64 || p.ticket_url);
}
