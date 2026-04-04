import { useEffect, useState, useRef } from "react";
import { apiUrl } from "@/lib/api";
import { productPageImageSrc } from "@/lib/productImageSrc";

/** Cache de URL do produto -> primeira imagem do preview (evita refetch na mesma sessão). Limitado para evitar uso excessivo de memória. */
const imageCache = new Map<string, string>();
const IMAGE_CACHE_MAX = 60;

/**
 * Retorna [imageUrl, containerRef].
 * Se o produto já tem imagem, usa ela. Senão, quando o container (ref) entrar no viewport,
 * busca o preview na API e usa a primeira imagem. Cache por URL para não refetch.
 */
export function useLazyProductImage(
  productUrl: string | undefined,
  existingImage: string | null | undefined,
  options?: { enabled?: boolean },
): [string | null, React.RefObject<HTMLDivElement | null>] {
  const [fetchedImage, setFetchedImage] = useState<string | null>(() => {
    if (!productUrl) return null;
    return imageCache.get(productUrl) ?? null;
  });
  const ref = useRef<HTMLDivElement>(null);
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (existingImage || !productUrl || !enabled) return;

    if (imageCache.has(productUrl)) {
      setFetchedImage(imageCache.get(productUrl)!);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;

        fetch(
          apiUrl(`/api/product/preview?url=${encodeURIComponent(productUrl)}`),
        )
          .then((r) => r.json())
          .then((data) => {
            const first = data?.images?.[0];
            if (first && typeof first === "string") {
              if (imageCache.size >= IMAGE_CACHE_MAX) {
                const firstKey = imageCache.keys().next().value;
                if (firstKey != null) imageCache.delete(firstKey);
              }
              imageCache.set(productUrl, first);
              setFetchedImage(first);
            }
          })
          .catch(() => {});

        observer.disconnect();
      },
      { rootMargin: "80px", threshold: 0.01 },
    );

    const el = ref.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [productUrl, existingImage, enabled]);

  const raw = existingImage || fetchedImage;
  const imageUrl = raw ? productPageImageSrc(raw, productUrl) : null;
  return [imageUrl, ref];
}
