"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import type { FounderSpots } from "./types";

/*
 * As vagas do Vitalício Fundador, contadas pelo backend nas compras pagas.
 *
 * Buscadas no navegador, não na renderização da página: o backend pode estar
 * acordando (Render grátis, ~50 s) e a landing não pode esperar por isso.
 * Uma requisição só por minuto, compartilhada por todos os botões da tela.
 *
 * Se o backend não responder, o resultado é null e o botão continua aparecendo:
 * quem trava a venda de verdade é o limite de pagamentos no próprio Stripe.
 */
const REFRESH_MS = 60_000;
let pending: Promise<FounderSpots | null> | null = null;
let fetchedAt = 0;

function load(): Promise<FounderSpots | null> {
  if (!pending || Date.now() - fetchedAt > REFRESH_MS) {
    fetchedAt = Date.now();
    pending = apiFetch<FounderSpots>("/api/billing/founder").catch(() => null);
  }
  return pending;
}

export function useFounderSpots(): FounderSpots | null {
  const [spots, setSpots] = useState<FounderSpots | null>(null);
  useEffect(() => {
    let alive = true;
    load().then((value) => {
      if (alive) setSpots(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  return spots;
}
