"use client";

import { useEffect, useState } from "react";
import { formatFoundingPrice, type FoundingPrice as Price } from "@/lib/founding";

/**
 * O preço da assinatura Founding Customers, lido do Stripe por /api/founding/price (uma vez por página).
 * Enquanto carrega, um bloco vazio do mesmo tamanho; sem preço, "Price shown at checkout".
 * O valor nunca é escrito à mão no site.
 */

type State = { status: "loading" } | { status: "ready"; price: Price | null };
let request: Promise<Price | null> | null = null;

function loadPrice(): Promise<Price | null> {
  request ??= fetch("/api/founding/price")
    .then((r) => (r.ok ? r.json() : { price: null }))
    .then((data: { price?: Price | null }) => data.price ?? null)
    .catch(() => null);
  return request;
}

function useFoundingPrice(): State {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    void loadPrice().then((price) => alive && setState({ status: "ready", price }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** O valor em destaque: "$29 /month". */
export function FoundingPriceAmount({ locale = "en" }: { locale?: "en" | "pt" }) {
  const state = useFoundingPrice();
  if (state.status === "loading")
    return (
      <span aria-busy="true" className="inline-block h-12 w-36 animate-pulse rounded bg-surface-strong motion-reduce:animate-none">
        <span className="sr-only">{locale === "pt" ? "Carregando preço…" : "Loading price…"}</span>
      </span>
    );
  if (!state.price) return <span className="text-2xl font-bold">{locale === "pt" ? "Preço mostrado no pagamento" : "Price shown at checkout"}</span>;
  const { amount, per } = formatFoundingPrice(state.price, locale);
  return (
    <>
      <span className="text-5xl font-extrabold tracking-[-0.04em]">{amount}</span>
      <span className="text-lg text-muted">{per}</span>
    </>
  );
}

/** O preço em linha, para frases: "$19/month" (ou "the founding price", sem preço). */
export function FoundingPriceText({ locale = "en" }: { locale?: "en" | "pt" }) {
  const state = useFoundingPrice();
  if (state.status === "ready" && state.price) {
    const { amount, per } = formatFoundingPrice(state.price, locale);
    return (
      <>
        {amount}
        {per}
      </>
    );
  }
  return <>{locale === "pt" ? "o preço de fundador" : "the founding price"}</>;
}
