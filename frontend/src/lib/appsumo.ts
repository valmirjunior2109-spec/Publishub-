/**
 * O código do AppSumo que a pessoa colou antes de ter conta. Fica no navegador
 * enquanto ela cria a conta (ou confirma o e-mail) e é apagado quando o resgate dá certo.
 * O painel olha aqui: se sobrou um código, leva a pessoa de volta para /appsumo.
 */
const KEY = "publishub.appsumo.code";

export const APPSUMO_PATH = "/appsumo";

export function savePendingCode(code: string): void {
  try {
    if (code.trim()) window.localStorage.setItem(KEY, code.trim());
  } catch {
    /* navegador sem storage: a pessoa cola de novo, sem problema */
  }
}

export function readPendingCode(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingCode(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nada a limpar */
  }
}
