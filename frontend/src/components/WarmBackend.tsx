"use client";

import { useEffect } from "react";
import { checkHealth } from "@/lib/health";

/**
 * Acorda o backend assim que o site abre. No plano grátis do Render ele dorme
 * sem tráfego e a primeira chamada leva ~30 s; disparado aqui, esse tempo passa
 * enquanto a pessoa lê a landing e escolhe o vídeo, e não depois de ela clicar
 * em "Analisar".
 *
 * Uma vez por carregamento de página (o layout não remonta ao navegar). A resposta
 * fica guardada para a nova análise, que precisa saber se a IA está configurada
 * (lib/health.ts): a mesma chamada serve às duas. Não desenha nada.
 */
export function WarmBackend() {
  useEffect(() => {
    checkHealth();
  }, []);

  return null;
}
