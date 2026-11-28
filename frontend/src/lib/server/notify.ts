/**
 * Um e-mail para o fundador, via Resend (API HTTP, sem dependência nova), com o mesmo remetente e destino do
 * feedback da home. Sem RESEND_API_KEY, não envia: quem chama guarda a cópia no banco de qualquer jeito.
 */

const TO = () => process.env.FEEDBACK_TO_EMAIL?.trim() || "copilot@getpublishub.com";
const FROM = () => process.env.FEEDBACK_FROM_EMAIL?.trim() || "Publishub Feedback <feedback@getpublishub.com>";

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function emailOwner({ subject, fields, body, replyTo }: { subject: string; fields: [string, string][]; body?: string | null; replyTo?: string | null }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  const text = `${fields.map(([k, v]) => `${k}: ${v}`).join("\n")}${body ? `\n\n${body}` : ""}`;
  const html =
    `<table cellpadding="4">${fields.map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`).join("")}</table>` +
    (body ? `<p style="white-space:pre-wrap">${escapeHtml(body)}</p>` : "");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM(), to: [TO()], ...(replyTo ? { reply_to: replyTo } : {}), subject, text, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.error("owner email failed", response.status, await response.text().catch(() => ""));
    return response.ok;
  } catch (error) {
    console.error("owner email failed", error);
    return false;
  }
}
