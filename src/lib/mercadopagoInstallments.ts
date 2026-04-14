/**
 * Limite de parcelas no cartão — alinhado a `MP_MAX_INSTALLMENTS_CARD` no backend.
 * O SDK do Mercado Pago preenche o select dinamicamente; removemos opções acima de max.
 */
export const MP_MAX_INSTALLMENTS = 10;

function prune(select: HTMLSelectElement, max: number) {
  for (let i = select.options.length - 1; i >= 0; i--) {
    const opt = select.options[i];
    const n = parseInt(String(opt.value), 10);
    if (Number.isFinite(n) && n > max) {
      opt.remove();
    }
  }
}

/**
 * Mantém no máximo `max` parcelas no select de parcelas do CardForm MP.
 * Observa mudanças no DOM porque o MP insere opções após dados do cartão.
 */
export function attachInstallmentsMaxClamp(
  selectId: string,
  max: number = MP_MAX_INSTALLMENTS,
): () => void {
  let mo: MutationObserver | null = null;
  let pollId: ReturnType<typeof setInterval> | null = null;

  const attachTo = (select: HTMLSelectElement) => {
    prune(select, max);
    if (mo) mo.disconnect();
    mo = new MutationObserver(() => prune(select, max));
    mo.observe(select, { childList: true, subtree: true });
  };

  const tryOnce = (): boolean => {
    const el = document.getElementById(selectId);
    if (el instanceof HTMLSelectElement) {
      attachTo(el);
      return true;
    }
    return false;
  };

  if (!tryOnce()) {
    pollId = setInterval(() => {
      if (tryOnce() && pollId != null) {
        clearInterval(pollId);
        pollId = null;
      }
    }, 120);
  }

  return () => {
    if (pollId != null) clearInterval(pollId);
    mo?.disconnect();
  };
}
