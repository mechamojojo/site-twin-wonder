import type { Request, Response } from "express";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

const SCRAPE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function hostAllowedForProxy(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return false;
  return (
    h.includes("alicdn") ||
    h.includes("alibaba") ||
    h.includes("tbcdn") ||
    h.endsWith(".1688.com") ||
    h.includes("cbu01") ||
    h.includes("imgzone") ||
    h.includes("gw.alicdn") ||
    h.includes("img.alicdn") ||
    h.includes("alibabausercontent") ||
    h.includes("img-qc") ||
    h.includes("sc01.alicdn") ||
    h.includes("kwcdn.com")
  );
}

/** Referer que a CDN da Alibaba costuma aceitar (não é a origem do nosso site). */
function refererFromProductUrl(refParam: string | undefined): string {
  const fallback = "https://detail.1688.com/";
  if (!refParam?.trim()) return fallback;
  try {
    const r = new URL(refParam.trim());
    const h = r.hostname.toLowerCase();
    if (h.includes("1688") && !h.includes("cssbuy"))
      return "https://detail.1688.com/";
    if (h.includes("taobao.com") && !h.includes("tmall"))
      return "https://item.taobao.com/";
    if (h.includes("tmall")) return "https://detail.tmall.com/";
    if (h.includes("weidian")) return "https://weidian.com/";
    if (h.includes("cssbuy")) {
      const path = r.pathname.toLowerCase();
      if (path.includes("item-1688-")) return "https://detail.1688.com/";
      if (path.includes("item-taobao-")) return "https://item.taobao.com/";
      if (path.includes("item-tmall-")) return "https://detail.tmall.com/";
      if (path.includes("item-micro-")) return "https://weidian.com/";
      return "https://www.cssbuy.com/";
    }
    return `${r.origin}/`;
  } catch {
    return fallback;
  }
}

export async function handleImageProxy(
  req: Request,
  res: Response,
): Promise<void> {
  const src = typeof req.query.src === "string" ? req.query.src.trim() : "";
  const ref = typeof req.query.ref === "string" ? req.query.ref.trim() : "";

  if (!src.startsWith("https://") && !src.startsWith("http://")) {
    res.status(400).json({ error: "URL inválida" });
    return;
  }

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    res.status(400).json({ error: "URL inválida" });
    return;
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    res.status(400).end();
    return;
  }

  const host = target.hostname.toLowerCase();
  if (!hostAllowedForProxy(host)) {
    res.status(403).json({ error: "Host não permitido" });
    return;
  }

  const referer = refererFromProductUrl(ref || undefined);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), {
      redirect: "follow",
      signal: ac.signal,
      headers: {
        "User-Agent": SCRAPE_UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: referer,
      },
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      res.status(502).end();
      return;
    }

    const len = upstream.headers.get("content-length");
    if (len && Number(len) > MAX_IMAGE_BYTES) {
      res.status(413).end();
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) {
      res.status(413).end();
      return;
    }

    let ct =
      upstream.headers.get("content-type")?.split(";")[0]?.trim() || "";
    if (!ct.startsWith("image/")) {
      ct = "image/jpeg";
    }

    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch {
    clearTimeout(timer);
    if (!res.headersSent) res.status(502).end();
  }
}
