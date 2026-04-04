import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  type RefObject,
} from "react";
import { apiUrl } from "@/lib/api";
import { ensureHttpsImage } from "@/lib/utils";
import { productImageDisplayUrl } from "@/lib/productImageDisplayUrl";

const imageCache = new Map<string, string>();
const IMAGE_CACHE_MAX = 120;

/** Máx. pedidos simultâneos ao /api/product/preview (evita saturar mobile / backend). */
const PREVIEW_QUEUE_MAX = 5;
let previewQueueActive = 0;
const previewQueueWaiting: Array<() => void> = [];

function pumpPreviewQueue() {
  while (
    previewQueueActive < PREVIEW_QUEUE_MAX &&
    previewQueueWaiting.length > 0
  ) {
    const job = previewQueueWaiting.shift()!;
    previewQueueActive++;
    void (async () => {
      try {
        await job();
      } finally {
        previewQueueActive--;
        pumpPreviewQueue();
      }
    })();
  }
}

function enqueuePreviewJob(job: () => Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    previewQueueWaiting.push(async () => {
      try {
        await job();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    pumpPreviewQueue();
  });
}

/** Galeria principal + miniaturas em optionGroups + colorImages. */
function extractAllImageUrlsFromPreview(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  const out: string[] = [];
  const push = (raw: string) => {
    const t = raw.trim();
    if (!t.startsWith("http")) return;
    const u = ensureHttpsImage(t);
    if (!out.includes(u)) out.push(u);
  };

  const images = o.images;
  if (Array.isArray(images)) {
    for (const x of images) if (typeof x === "string") push(x);
  }

  const groups = o.optionGroups;
  if (Array.isArray(groups)) {
    for (const g of groups) {
      if (!g || typeof g !== "object") continue;
      const gi = (g as { images?: unknown }).images;
      if (Array.isArray(gi)) {
        for (const x of gi) if (typeof x === "string") push(x);
      }
    }
  }

  const variants = o.variants;
  if (variants && typeof variants === "object") {
    const ci = (variants as { colorImages?: unknown }).colorImages;
    if (Array.isArray(ci)) {
      for (const x of ci) if (typeof x === "string") push(x);
    }
  }

  return out;
}

async function fetchPreviewImageUrls(
  productUrl: string,
  opts?: { nocache?: boolean },
): Promise<string[]> {
  try {
    const nocache = opts?.nocache ? "&nocache=1" : "";
    const res = await fetch(
      apiUrl(
        `/api/product/preview?url=${encodeURIComponent(productUrl)}${nocache}`,
      ),
    );
    if (!res.ok) return [];
    const data = await res.json();
    return extractAllImageUrlsFromPreview(data);
  } catch {
    return [];
  }
}

function cachePut(productUrl: string, imageUrl: string) {
  if (imageCache.size >= IMAGE_CACHE_MAX) {
    const firstKey = imageCache.keys().next().value;
    if (firstKey != null) imageCache.delete(firstKey);
  }
  imageCache.set(productUrl, imageUrl);
}

/**
 * [url | null, ref, onError]. Sem imagem no catálogo: pede preview na montagem
 * (fila global, não só IntersectionObserver — iOS falhava muito).
 */
export function useLazyProductImage(
  productUrl: string | undefined,
  existingImage: string | null | undefined,
  options?: { enabled?: boolean; eager?: boolean },
): [string | null, RefObject<HTMLDivElement | null>, () => void] {
  const enabled = options?.enabled !== false;
  const eager = options?.eager === true;
  const normalizedPrimary = useMemo(() => {
    const s = existingImage?.trim();
    return s ? ensureHttpsImage(s) : null;
  }, [existingImage]);

  const [candidates, setCandidates] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [giveUp, setGiveUp] = useState(false);
  const fetchingRef = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const candidatesRef = useRef<string[]>([]);
  candidatesRef.current = candidates;
  const urlGenRef = useRef(0);

  useEffect(() => {
    urlGenRef.current += 1;
    setIdx(0);
    setGiveUp(false);
    if (!productUrl) {
      setCandidates([]);
      return;
    }
    if (normalizedPrimary) {
      setCandidates([normalizedPrimary]);
      return;
    }
    const cached = imageCache.get(productUrl);
    setCandidates(cached ? [ensureHttpsImage(cached)] : []);
  }, [productUrl, normalizedPrimary]);

  const mergePreviewUrls = useCallback(
    (urls: string[], gen: number): boolean => {
      if (gen !== urlGenRef.current || urls.length === 0) return false;
      cachePut(productUrl!, urls[0]);
      const prev = candidatesRef.current;
      const merged = [...prev];
      for (const u of urls) if (!merged.includes(u)) merged.push(u);
      if (merged.length === prev.length) return false;
      const firstNew = prev.length;
      setCandidates(merged);
      setIdx(firstNew === 0 ? 0 : firstNew);
      return true;
    },
    [productUrl],
  );

  const appendPreviewUrls = useCallback(
    async (opts?: { nocache?: boolean }): Promise<boolean> => {
      if (!productUrl || fetchingRef.current) return false;
      const gen = urlGenRef.current;
      fetchingRef.current = true;
      const urls = await fetchPreviewImageUrls(productUrl, opts);
      fetchingRef.current = false;
      if (gen !== urlGenRef.current) return false;
      return mergePreviewUrls(urls, gen);
    },
    [productUrl, mergePreviewUrls],
  );

  /** Sem imagem no catálogo: carrega preview ao montar (fila), com retry nocache. */
  useEffect(() => {
    if (!productUrl || !enabled) return;
    if (normalizedPrimary) return;

    const gen = urlGenRef.current;

    if (imageCache.has(productUrl)) {
      setCandidates([ensureHttpsImage(imageCache.get(productUrl)!)]);
      setIdx(0);
      return;
    }

    let cancelled = false;
    const delay = eager ? 0 : Math.floor(Math.random() * 350);

    const t = window.setTimeout(() => {
      void enqueuePreviewJob(async () => {
        if (cancelled || gen !== urlGenRef.current) return;
        let ok = await appendPreviewUrls();
        if (!ok && !cancelled && gen === urlGenRef.current) {
          await new Promise((r) => setTimeout(r, 2200));
          if (cancelled || gen !== urlGenRef.current) return;
          ok = await appendPreviewUrls({ nocache: true });
        }
      });
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [productUrl, enabled, normalizedPrimary, eager, appendPreviewUrls]);

  const onImageError = useCallback(() => {
    if (!productUrl || !enabled || giveUp) return;

    const c = candidatesRef.current;
    const i = idx;
    if (i + 1 < c.length) {
      setIdx(i + 1);
      return;
    }

    void (async () => {
      const ok = await appendPreviewUrls();
      if (!ok) {
        const ok2 = await appendPreviewUrls({ nocache: true });
        if (!ok2) setGiveUp(true);
      }
    })();
  }, [productUrl, enabled, giveUp, idx, appendPreviewUrls]);

  const raw =
    !giveUp && candidates.length > 0 && idx >= 0 && idx < candidates.length
      ? candidates[idx]
      : null;
  const displayUrl = raw ? productImageDisplayUrl(raw) : null;

  return [displayUrl, ref, onImageError];
}
