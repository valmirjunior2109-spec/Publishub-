/**
 * O canal de suporte: um e-mail que uma pessoa lê. Configurável para não ficar
 * preso no código quando o endereço mudar.
 */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "suporte@getpublishub.com";

/** O link de suporte já com assunto: quem recebe sabe do que se trata. */
export function supportMailto(subject: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
