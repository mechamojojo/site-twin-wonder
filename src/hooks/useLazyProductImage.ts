import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { apiUrl } from "@/lib/api";
import { ensureHttpsImage } from "@/lib/utils";

const imageCache = new Map<string, string>();
const IMAGE_CACHE_MAX = 120;

function extractPreviewImageUrls(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const images = (data as { images?: unknown }).images;
  if (!Array.isArray(images)) return [];
  const out: string[] = [];
  for (const x of images) {
    if (typeof x === "string" && x.trim().startsWith("http")) {
      const u = ensureHttpsImage(x.trim());
      if (!out.includes(u)) out.push(u);
    }
  }
  return out;
}

async function fetchPreviewImageUrls(productUrl: string): Promise<string[]> {
  try {
    const res = await fetch(
      apiUrl(`/api/product/preview?url=${encodeURIComponent(productUrl)}`),
    );
    if (!res.ok) return [];
    const data = await res.json();
    return extractPreviewImageUrls(data);
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
 * [url | null, ref, onError]. Catálogo primeiro; se falhar, tenta outras URLs do preview.
 * Margem ampla no IntersectionObserver para mobile; preview também em onError.
 */
export function useLazyProductImage(
  productUrl: string | undefined,
  existingImage: string | null | undefined,
  options?: { enabled?: boolean },
): [string | null, React.RefObject<HTMLDivElement | null>, () => void] {
  const enabled = options?.enabled !== false;
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

  const appendPreviewUrls = useCallback(async (): Promise<boolean> => {
    if (!productUrl || fetchingRef.current) return false;
    const gen = urlGenRef.current;
    fetchingRef.current = true;
    const urls = await fetchPreviewImageUrls(productUrl);
    fetchingRef.current = false;
    if (gen !== urlGenRef.current) return false;
    if (urls.length === 0) return false;
    cachePut(productUrl, urls[0]);

    const prev = candidatesRef.current;
    const merged = [...prev];
    for (const u of urls) if (!merged.includes(u)) merged.push(u);
    if (merged.length === prev.length) return false;
    const firstNew = prev.length;
    setCandidates(merged);
    setIdx(firstNew);
    return true;
  }, [productUrl]);

  useEffect(() => {
    if (!productUrl || !enabled) return;
    if (normalizedPrimary) return;
    if (candidates.length > 0) return;

    const rootMargin =
      typeof window !== "undefined" && window.innerWidth < 768
        ? "320px 0px 480px 0px"
        : "200px 0px 280px 0px";

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;

        void (async () => {
          if (!productUrl) return;
          const gen = urlGenRef.current;
          if (imageCache.has(productUrl)) {
            if (gen !== urlGenRef.current) return;
            setCandidates([ensureHttpsImage(imageCache.get(productUrl)!)]);
            setIdx(0);
            return;
          }
          await appendPreviewUrls();
        })();
        observer.disconnect();
      },
      { rootMargin, threshold: 0.01 },
    );

    const el = ref.current;
    if (el) observer.observe(el);
    else {
      const id = requestAnimationFrame(() => {
        if (ref.current) observer.observe(ref.current);
      });
      return () => {
        cancelAnimationFrame(id);
        observer.disconnect();
      };
    }
    return () => observer.disconnect();
  }, [productUrl, enabled, normalizedPrimary, candidates.length, appendPreviewUrls]);

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
      if (!ok) setGiveUp(true);
    })();
  }, [productUrl, enabled, giveUp, idx, appendPreviewUrls]);

  const displayUrl =
    !giveUp && candidates.length > 0 && idx >= 0 && idx < candidates.length
      ? candidates[idx]
      : null;

  return [displayUrl, ref, onImageError];
}
