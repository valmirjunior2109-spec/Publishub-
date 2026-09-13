import { getSupabase } from "./supabase";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Calls the FastAPI backend with the user's Supabase access token. */
export async function apiFetch(path, { method = "GET", body } = {}) {
  const supabase = getSupabase();
  const { data } = supabase ? await supabase.auth.getSession() : { data: {} };
  const token = data?.session?.access_token;

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code || "ERROR",
      payload?.error?.message || "Algo deu errado. Tente novamente."
    );
  }
  return payload;
}
