import { readGuestToken } from "./guest";
import { getSupabase } from "./supabase";

import { API_URL } from "./apiUrl";

export class ApiError extends Error {
  status: number;
  code: string;
  /** O id da requisição no backend. É o que a pessoa cita ao falar com o suporte. */
  requestId: string | null;

  constructor(status: number, code: string, message: string, requestId: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

/**
 * Leituras iguais em andamento (mesmo caminho, mesma credencial) viram uma só.
 * Na tela do resultado o painel lateral, os cortes e o próximo passo pediam o
 * /api/me ao mesmo tempo: eram três idas ao backend para a mesma resposta.
 * Só enquanto a resposta não chega: nada fica guardado depois.
 */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Chama o backend com o token do Supabase ou, sem conta, com o token de convidado
 * (a previsão cega antes do cadastro). As mensagens de erro do backend já são
 * escritas para o criador; a única que nasce aqui é a de rede.
 */
export async function apiFetch<T>(path: string, { method = "GET", body }: ApiOptions = {}): Promise<T> {
  const supabase = await getSupabase();
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  // sem conta, o convidado se identifica pela sessão que o backend abriu
  else {
    const guest = readGuestToken();
    if (guest) headers["X-Guest-Token"] = guest;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // uma escrita muda o que as leituras devolvem: quem ler depois dela não pega carona numa leitura de antes
  if (method !== "GET") {
    inFlight.clear();
    return send<T>(path, method, headers, body).finally(() => inFlight.clear());
  }
  const key = `${headers.Authorization ?? headers["X-Guest-Token"] ?? ""} ${path}`;
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;
  const request: Promise<T> = send<T>(path, method, headers, body).finally(() => {
    if (inFlight.get(key) === request) inFlight.delete(key);
  });
  inFlight.set(key, request);
  return request;
}

async function send<T>(path: string, method: string, headers: Record<string, string>, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload?.error?.code || "ERROR", payload?.error?.message || "", payload?.error?.request_id ?? response.headers.get("x-request-id"));
  }
  return payload as T;
}
