/**
 * Normaliza títulos de produtos para serem mais amigáveis ao público brasileiro.
 * Remove ruído de marketplaces chineses (1688, Taobao, Weidian) e reorganiza a estrutura.
 */

const MAX_TITLE_LENGTH = 120;

/** Frases genéricas que não agregam valor para o comprador (remover) */
const FILLER_PHRASES = [
  /desporto\s+e\s+lazer/gi,
  /desporto\s+e\s+entretenimento/gi,
  /esporte\s+e\s+lazer/gi,
  /sports\s+and\s+leisure/gi,
  /e\s+lazer\b/gi,
  /e\s+entretenimento\b/gi,
  /\bdesporto\b/gi,
  /\bnovidade\b/gi,
  /\b2024\s+new\b/gi,
  /\b2025\s+new\b/gi,
  /novo\s+campeonato\s+do\s+mundo\s+/gi, // mantém o resto (países)
  /campeonato\s+do\s+mundo\s+/gi,
  /世界冠军|世界杯|新品|热卖|爆款/gi,
];

/** Palavras que podem ser removidas quando redundantes */
const REDUNDANT_WORDS = [
  "qualidade", "quality", "alto", "alta", "top", "premium", "luxo", "fashion",
  "moda", "tendência", "tendencia", "popular", "melhor", "best",
  "oficial", "original", "genuíno", "genuino", "authentic",
];

/** Mapeamentos de termos para português brasileiro mais natural */
const TERM_MAPPINGS: Array<{ pattern: RegExp; replacement: string }> = [
  // Futebol / esportes
  { pattern: /\bjersey\s+futebol\s+uniforme\b/gi, replacement: "Camisa de Futebol" },
  { pattern: /\buniforme\s+futebol\b/gi, replacement: "Uniforme de Futebol" },
  { pattern: /\bfutebol\s+uniforme\b/gi, replacement: "Uniforme de Futebol" },
  { pattern: /\bjersey\s+futebol\b/gi, replacement: "Camisa de Futebol" },
  { pattern: /\bfootball\s+jersey\b/gi, replacement: "Camisa de Futebol" },
  { pattern: /\bsoccer\s+jersey\b/gi, replacement: "Camisa de Futebol" },
  { pattern: /\bjersey\s+de\s+futebol\b/gi, replacement: "Camisa de Futebol" },
  { pattern: /\bcamisa\s+seleção\b/gi, replacement: "Camisa Seleção" },
  { pattern: /\bcamisa\s+selecao\b/gi, replacement: "Camisa Seleção" },
  { pattern: /\bjersey\b/gi, replacement: "Camisa" },
  // Calçados
  { pattern: /\bsneakers?\b/gi, replacement: "Tênis" },
  { pattern: /\btênis\s+de\s+corrida\b/gi, replacement: "Tênis de Corrida" },
  { pattern: /\brunning\s+shoes\b/gi, replacement: "Tênis de Corrida" },
  { pattern: /\bbasketball\s+shoes\b/gi, replacement: "Tênis de Basquete" },
  // Roupas
  { pattern: /\bhoodie\b/gi, replacement: "Moletom" },
  { pattern: /\bsweatshirt\b/gi, replacement: "Moletom" },
  { pattern: /\bt\-?shirt\b/gi, replacement: "Camiseta" },
  { pattern: /\bpolo\s+shirt\b/gi, replacement: "Polo" },
  { pattern: /\bdown\s+jacket\b/gi, replacement: "Jaqueta de Plumas" },
  { pattern: /\bpuffer\s+jacket\b/gi, replacement: "Jaqueta Impermeável" },
  { pattern: /\bwindbreaker\b/gi, replacement: "Corta-vento" },
];

/** Nomes de países comuns em listagens de camisas de seleção */
const COUNTRY_NAMES = [
  "Portugal", "México", "Mexico", "Bélgica", "Itália", "Alemanha", "Brasil", "Argentina",
  "França", "Franca", "Espanha", "Holanda", "Inglaterra", "Uruguai", "Colômbia", "Colombia",
  "Chile", "Peru", "Equador", "Croácia", "Croacia", "Suíça", "Suica", "Polônia", "Polonia",
  "Japão", "Japao", "Coreia", "Korea", "China", "Estados Unidos", "USA", "Canadá", "Canada",
];

/**
 * Extrai lista de países do título (ex: "Portugal México Bélgica Itália Alemanha")
 */
function extractCountries(title: string): { countries: string[]; rest: string } {
  const words = title.split(/\s+/);
  const countries: string[] = [];
  const rest: string[] = [];
  const countrySet = new Set(COUNTRY_NAMES.map((c) => c.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")));

  for (const w of words) {
    const normalized = w.replace(/[,]/g, "").trim();
    const lower = normalized.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    if (normalized.length >= 3 && countrySet.has(lower)) {
      const match = COUNTRY_NAMES.find((c) => c.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "") === lower);
      if (match && !countries.includes(match)) countries.push(match);
    } else {
      rest.push(w);
    }
  }
  return { countries, rest: rest.join(" ").trim() };
}

/**
 * Remove palavras duplicadas (consecutivas ou próximas)
 */
function deduplicateWords(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const w of words) {
    const key = w.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(w);
    }
  }
  return result.join(" ").trim();
}

/**
 * Remove sufixos comuns de códigos (ex: "-0001", "-0234", "001")
 */
function removeCodeSuffix(text: string): string {
  return text
    .replace(/\s*[-–]\s*\d{3,6}\s*$/i, "")
    .replace(/\s*\(\d+[\w\-]*\)\s*$/i, "")
    .replace(/\s+\d{2,4}\s*$/i, (m) => (m.length <= 3 ? "" : m))
    .trim();
}

/**
 * Tenta reorganizar: [Tipo de produto] + [Descrição principal] + [Variantes/países]
 */
function reorganizeStructure(text: string, countries: string[]): string {
  let result = text;

  // Se temos países e o resto parece ser "Camisa" ou "Uniforme", reorganizar
  if (countries.length >= 2) {
    const hasShirt = /\b(camisa|uniforme|jersey)\b/i.test(result);
    if (hasShirt) {
      const countriesStr = countries.length <= 5
        ? countries.join(", ")
        : `${countries.slice(0, 3).join(", ")} +${countries.length - 3} mais`;
      result = result
        .replace(/\b(camisa|uniforme|jersey)\s+(de\s+)?futebol\b/gi, "Camisa de Futebol")
        .replace(/\b(camisa|uniforme)\b/gi, "Camisa");
      result = `Camisa de Futebol - Seleções (${countriesStr})`;
    }
  }

  return result;
}

/**
 * Normaliza o título do produto para exibição no ComprasChina.
 * Aplica limpeza de ruído, mapeamentos de termos e reorganização.
 */
export function normalizeProductTitle(title: string | null): string | null {
  if (!title || typeof title !== "string") return title;
  let result = title.trim();
  if (result.length === 0) return title;

  // 1. Remover filler phrases
  for (const pattern of FILLER_PHRASES) {
    result = result.replace(pattern, " ").trim();
  }

  // 2. Extrair países (para camisas de seleção)
  const { countries, rest } = extractCountries(result);
  result = rest;

  // 3. Remover código no final
  result = removeCodeSuffix(result);

  // 4. Aplicar mapeamentos de termos
  for (const { pattern, replacement } of TERM_MAPPINGS) {
    result = result.replace(pattern, replacement);
  }

  // 5. Remover palavras redundantes (quando há muitas palavras)
  if (result.split(/\s+/).length > 6) {
    const words = result.split(/\s+/);
    result = words
      .filter((w) => {
        const lower = w.toLowerCase();
        return !REDUNDANT_WORDS.some((r) => lower.includes(r) || r.includes(lower));
      })
      .join(" ")
      .trim();
  }

  // 6. Reorganizar se temos países (ex: camisas de seleção)
  if (countries.length >= 2 && result.length > 0) {
    const reorganized = reorganizeStructure(result, countries);
    if (reorganized.length > 0) result = reorganized;
  }

  // 7. Remover duplicatas
  result = deduplicateWords(result);

  // 8. Normalizar espaços
  result = result.replace(/\s+/g, " ").trim();

  // 9. Limitar tamanho (sem adicionar "...")
  if (result.length > MAX_TITLE_LENGTH) {
    result = result.slice(0, MAX_TITLE_LENGTH).trim();
    const lastSpace = result.lastIndexOf(" ");
    if (lastSpace > MAX_TITLE_LENGTH / 2) result = result.slice(0, lastSpace);
  }

  // 10. Nunca terminar com vírgula, reticências etc.
  result = result.replace(/[\s,.:;]*\.{2,}\s*$/g, "").replace(/[\s,.:;]+$/g, "").trim();

  // 11. Remover fragmentos incompletos no final (ex: ", design", ", com", ", para casal")
  const fragmentWords =
    "design|estilo|modelo|style|model|com|para|em|de|e|ou|que|como|qualidade|material|detalhes|detalhe|exclusivo|moderno|único|unico|conforto|leve";
  const fragmentPattern = new RegExp(
    `\\s*,\\s*(${fragmentWords})(\\s+[a-zà-ú]{2,18}){0,1}\\s*$`,
    "i"
  );
  let prev = "";
  while (prev !== result && fragmentPattern.test(result)) {
    prev = result;
    result = result.replace(fragmentPattern, "").trim();
  }

  // Se ainda terminar com ", palavra" (fragmento de truncamento), remover
  const trailingCommaWord = /,\s*[a-zà-ú]{2,25}\s*$/i;
  if (trailingCommaWord.test(result)) {
    const lastComma = result.lastIndexOf(",");
    if (lastComma > 40) result = result.slice(0, lastComma).trim();
  }

  result = result.replace(/[\s,.:;]+$/g, "").trim();

  return result.length > 0 ? result : title;
}
