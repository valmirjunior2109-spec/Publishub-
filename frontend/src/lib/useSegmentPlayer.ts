"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** O que o player está tocando na revisão dos cortes. */
export type PlayMode = "idle" | "original" | "cut" | "result";

interface Plan {
  /** Trechos que o player pula, como se já estivessem cortados. */
  skips: Array<[number, number]>;
  /** Onde parar; null toca até o fim. */
  stopAt: number | null;
}

/** Quanto de vídeo mostrar antes e depois do corte, para dar para sentir a emenda. */
const CONTEXT_SECONDS = 2.5;

/**
 * O player da revisão: o original e o resultado de um corte, lado a lado (a mesma
 * janela, com e sem o trecho), e a prévia do vídeo inteiro pulando os cortes aceitos.
 *
 * Nada é gerado: é o original, com o player pulando os trechos. O pulo é conferido
 * a cada quadro (requestAnimationFrame), não no `timeupdate`, que chega só a cada
 * ~250 ms e deixaria escapar um pedaço do trecho cortado.
 *
 * O elemento chega por callback (`attach`): o player da revisão pode aparecer
 * depois do painel (ao reabrir a revisão), e os ouvintes precisam ir junto.
 */
export function useSegmentPlayer() {
  // o elemento mora num ref (é nele que o tempo muda); o estado só religa os ouvintes quando ele troca
  const element = useRef<HTMLVideoElement | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const attach = useCallback((node: HTMLVideoElement | null) => {
    element.current = node;
    setVideo(node);
  }, []);
  const plan = useRef<Plan | null>(null);
  const frame = useRef<number | null>(null);
  const [mode, setMode] = useState<PlayMode>("idle");
  const [time, setTime] = useState(0);

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    plan.current = null;
    setMode("idle");
  }, []);

  const run = useCallback(
    (from: number, next: Plan, nextMode: PlayMode) => {
      const player = element.current;
      if (!player) return;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      plan.current = next;
      setMode(nextMode);

      // um quadro do laço: pula o trecho aceito, para no fim do plano
      function tick() {
        const video = element.current;
        const current = plan.current;
        if (!video || !current) return;
        const skip = current.skips.find(([start, end]) => video.currentTime >= start - 0.03 && video.currentTime < end - 0.03);
        if (skip) video.currentTime = skip[1];
        if (current.stopAt !== null && video.currentTime >= current.stopAt) {
          video.pause();
          stop();
          return;
        }
        frame.current = requestAnimationFrame(tick);
      }

      player.currentTime = Math.max(0, from);
      player.play().catch(() => stop());
      frame.current = requestAnimationFrame(tick);
    },
    [stop],
  );

  /** O original: a mesma janela da prévia do corte, sem pular nada. É o "antes" da comparação. */
  const playOriginal = useCallback((start: number, end: number) => run(start - CONTEXT_SECONDS, { skips: [], stopAt: end + CONTEXT_SECONDS }, "original"), [run]);

  /** O resultado de um corte: um pouco antes, o pulo, um pouco depois. É o "depois". */
  const previewCut = useCallback((start: number, end: number) => run(start - CONTEXT_SECONDS, { skips: [[start, end]], stopAt: end + CONTEXT_SECONDS }, "cut"), [run]);

  /** O vídeo inteiro como ficaria com os cortes aceitos. */
  const previewResult = useCallback((cuts: Array<[number, number]>) => run(0, { skips: [...cuts].sort((a, b) => a[0] - b[0]), stopAt: null }, "result"), [run]);

  const seek = useCallback(
    (seconds: number) => {
      const player = element.current;
      if (!player) return;
      stop();
      player.currentTime = Math.max(0, seconds);
      setTime(player.currentTime);
    },
    [stop],
  );

  /** Traz o player para a tela (no celular ele fica acima da lista). */
  const reveal = useCallback(() => element.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), []);

  // o player avisa: pausa ou fim encerram a prévia; o tempo alimenta a linha do tempo
  useEffect(() => {
    if (!video) return;
    const onTime = () => setTime(video.currentTime);
    const onEnd = () => stop();
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("seeked", onTime);
    video.addEventListener("pause", onEnd);
    video.addEventListener("ended", onEnd);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("seeked", onTime);
      video.removeEventListener("pause", onEnd);
      video.removeEventListener("ended", onEnd);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [video, stop]);

  return { attach, mode, time, playOriginal, previewCut, previewResult, seek, stop, reveal };
}
