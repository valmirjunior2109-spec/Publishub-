import { readGuestToken } from "./guest";
import { getSupabase } from "./supabase";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
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
  const supabase = getSupabase();
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
    throw new ApiError(response.status, payload?.error?.code || "ERROR", payload?.error?.message || "");
  }
  return payload as T;
}
