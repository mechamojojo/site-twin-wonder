/**
 * Cloudflare Turnstile widget.
 * Carrega o script da API e exibe o widget. Se VITE_TURNSTILE_SITE_KEY não estiver definida, não renderiza nada.
 * onVerify(token) é chamado quando o usuário completa a verificação.
 */
import { useEffect, useRef, useState } from "react";

const SITE_KEY = (import.meta as { env?: { VITE_TURNSTILE_SITE_KEY?: string } }).env?.VITE_TURNSTILE_SITE_KEY?.trim();
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export const TURNSTILE_ENABLED = Boolean(SITE_KEY);

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
};

export default function TurnstileWidget({ onVerify, onExpire, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) {
      setReady(true);
      return;
    }

    if (window.turnstile) {
      setReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (!SITE_KEY || !ready || !containerRef.current) return;

    const id = window.turnstile?.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: onVerify,
    });
    if (id) widgetIdRef.current = id;

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [ready, onVerify]);

  if (!SITE_KEY) return <div className={className} aria-hidden />;

  return <div ref={containerRef} className={className} data-testid="turnstile-widget" />;
}
