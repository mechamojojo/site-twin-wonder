/**
 * Configurações do site — atualize aqui para alterar contato e links.
 */

/** URL base do site (para links de acompanhamento) */
export const SITE_URL =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "https://compraschina.com.br");

/** E-mail de contato */
export const CONTACT_EMAIL = "contato@compraschina.com.br";

/** Canal oficial no Telegram */
export const TELEGRAM_URL = "https://t.me/compraschinacombr";
export const TELEGRAM_DISPLAY = "@compraschinacombr";

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
