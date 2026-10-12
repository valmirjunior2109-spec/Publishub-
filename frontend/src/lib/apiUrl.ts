/**
 * Onde o backend (FastAPI no Railway) responde. Um lugar só, para o site, o
 * despertador do backend e o cron lerem o mesmo endereço.
 *
 * NEXT_PUBLIC_API_URL manda quando existe. Sem ela, o build de produção usa o
 * Railway em vez de localhost: uma variável apagada na Vercel não pode derrubar
 * o login e as análises de todo mundo.
 */
const PRODUCTION_API_URL = "https://publishub-production.up.railway.app";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : "http://localhost:8000")
).replace(/\/$/, "");
