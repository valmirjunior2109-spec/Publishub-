import { readGuestToken } from "./guest";
import { getSupabase } from "./supabase";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

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
  method?: "GET" | "POST";
  body?: unknown;
}

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
