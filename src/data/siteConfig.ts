/**
 * Configurações do site — atualize aqui para alterar contato e links.
 */

/** URL base do site (para links de acompanhamento) */
export const SITE_URL =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "https://compraschina.com.br");

/** WhatsApp com DDI (ex: 5567999966914) — sem + ou espaços */
export const WHATSAPP_NUMBER = "5567999966914";

/** Número formatado para exibição no site */
export const WHATSAPP_DISPLAY = "(67) 99996-6914";

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

/**
 * CNPJ da empresa — exibido no rodapé.
 * Preencha com o CNPJ real no formato "XX.XXX.XXX/0001-XX".
 * Deixe null para ocultar até obter o registro.
 */
export const CNPJ: string | null = "43.243.390/0001-33";

/** URLs de busca nos marketplaces chineses (abre em nova aba para o usuário escolher onde buscar). */
export const MARKETPLACE_SEARCH_URLS: Record<string, (q: string) => string> = {
  "1688": (q) => `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(q)}`,
  "Taobao": (q) => `https://s.taobao.com/search?q=${encodeURIComponent(q)}`,
  "Weidian": (q) => `https://shopsearch.weidian.com/search?keyword=${encodeURIComponent(q)}`,
};

/** Mercado Pago - Chave pública (para tokenização de cartão no frontend).
 * Obtenha em: https://www.mercadopago.com.br/developers/panel/app > Credenciais
 * Use import.meta.env.VITE_MP_PUBLIC_KEY ou defina aqui
 */
export const MP_PUBLIC_KEY =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_MP_PUBLIC_KEY?: string } }).env?.VITE_MP_PUBLIC_KEY) ||
  "APP_USR_PLACEHOLDER";
