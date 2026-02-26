/**
 * Traduz texto para português (chinês ou inglês -> pt).
 * Usa MyMemory API (gratuita, sem chave; limite por IP).
 */

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

export async function translateToPortuguese(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  const trimmed = text.trim().slice(0, 500);
  try {
    const params = new URLSearchParams({
      q: trimmed,
      langpair: "zh-CN|pt", // tenta chinês -> português primeiro
    });
    const res = await fetch(`${MYMEMORY_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return text;
    const data = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number };
    const translated = data.responseData?.translatedText?.trim();
    if (translated && translated !== trimmed) return translated;

    // Se não detectou chinês, tenta en -> pt
    const paramsEn = new URLSearchParams({ q: trimmed, langpair: "en|pt" });
    const resEn = await fetch(`${MYMEMORY_URL}?${paramsEn.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!resEn.ok) return text;
    const dataEn = (await resEn.json()) as { responseData?: { translatedText?: string } };
    const translatedEn = dataEn.responseData?.translatedText?.trim();
    return translatedEn && translatedEn !== trimmed ? translatedEn : text;
  } catch {
    return text;
  }
}
