/**
 * Ordem "variada" no Explorar: em vez da lista fixa do admin (sortOrder),
 * embaralhamos de forma determinística por dia — mesma ordem no mesmo dia
 * para todos, novo arranjo no dia seguinte (sem aleatório a cada refresh).
 */

function fnv1a32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Data local (YYYY-M-D) — muda à meia-noite no fuso do navegador. */
export function getExplorarOrderDaySeed(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function explorarDefaultOrderKey(productId: string, daySeed: string): number {
  return fnv1a32(`${daySeed}\0${productId}`);
}

export function compareExplorarDefaultOrder(
  a: { id: string },
  b: { id: string },
  daySeed: string,
): number {
  return (
    explorarDefaultOrderKey(a.id, daySeed) -
    explorarDefaultOrderKey(b.id, daySeed)
  );
}
