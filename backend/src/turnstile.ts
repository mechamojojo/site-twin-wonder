/**
 * Verificação do token Cloudflare Turnstile no backend.
 * Se TURNSTILE_SECRET_KEY não estiver definida, a verificação é ignorada (retorna true).
 */
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY?.trim();

export async function verifyTurnstile(token: string | undefined, remoteip?: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true; // não configurado = aceita
  if (!token?.trim()) return false;

  try {
    const body = new URLSearchParams({
      secret: TURNSTILE_SECRET,
      response: token,
      ...(remoteip && { remoteip }),
    });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data?.success);
  } catch {
    return false;
  }
}
