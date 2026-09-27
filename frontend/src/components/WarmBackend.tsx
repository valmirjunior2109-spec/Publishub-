"use client";

import { useEffect } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

/**
 * Acorda o backend assim que o site abre. No plano grátis do Render ele dorme
 * sem tráfego e a primeira chamada leva ~30 s; disparado aqui, esse tempo passa
 * enquanto a pessoa lê a landing e escolhe o vídeo, e não depois de ela clicar
 * em "Analisar".
 *
 * Uma vez por carregamento de página (o layout não remonta ao navegar). `no-cors`
 * porque a resposta não interessa: basta a requisição chegar. Não desenha nada.
 */
export function WarmBackend() {
  useEffect(() => {
    fetch(`${API_URL}/api/health`, { mode: "no-cors", cache: "no-store" }).catch(() => {});
  }, []);

  return null;
}
