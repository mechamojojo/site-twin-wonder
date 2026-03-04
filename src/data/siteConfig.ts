/**
 * Configurações do site — atualize aqui para alterar contato e links.
 */

/** URL base do site (para links de acompanhamento) */
export const SITE_URL =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "https://compraschina.com.br");

/** WhatsApp com DDI (ex: 5511999999999) — sem + ou espaços */
export const WHATSAPP_NUMBER = "5511999999999";

/** Mensagem padrão quando o usuário clica em "Fale conosco" no site (opcional). */
export const WHATSAPP_DEFAULT_MESSAGE = "Olá! Acessei o site ComprasChina e gostaria de mais informações.";

/** URL para abrir chat no WhatsApp (com mensagem pré-preenchida, opcional). */
export function whatsAppUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (message?.trim()) {
    return `${base}?text=${encodeURIComponent(message.trim())}`;
  }
  return base;
}

/** E-mail de contato */
export const CONTACT_EMAIL = "contato@compraschina.com.br";

/** Mercado Pago - Chave pública (para tokenização de cartão no frontend).
 * Obtenha em: https://www.mercadopago.com.br/developers/panel/app > Credenciais
 * Use import.meta.env.VITE_MP_PUBLIC_KEY ou defina aqui
 */
export const MP_PUBLIC_KEY =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_MP_PUBLIC_KEY?: string } }).env?.VITE_MP_PUBLIC_KEY) ||
  "APP_USR_PLACEHOLDER";
