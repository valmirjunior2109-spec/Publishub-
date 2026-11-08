/**
 * Eventos do servidor no PostHog (os que só o servidor sabe com certeza: o scan terminou,
 * a reserva foi paga). Sem NEXT_PUBLIC_POSTHOG_KEY, não faz nada. Nunca derruba quem chamou.
 */
export async function captureServer(event: string, distinctId: string, properties: Record<string, unknown> = {}): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");
  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: key, event, distinct_id: distinctId, properties: { ...properties, $lib: "publishub-server" } }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // métrica perdida não é erro do produto
  }
}
