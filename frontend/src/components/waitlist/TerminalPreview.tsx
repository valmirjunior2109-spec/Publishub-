import type { CSSProperties, ReactNode } from "react";
import { PixelIcon, type PixelIconName } from "@/components/ui/Pixel";
import { cn } from "@/lib/cn";

/**
 * A prévia do produto em forma de terminal (dados de demonstração, rotulados): o log da verificação
 * aparecendo linha a linha (uma vez) e, ao lado, o "centro de comando" da falha: contagem, passos para
 * reproduzir, evidência do navegador, erros de console e de rede.
 * É só desenho: para o leitor de tela, vale a legenda.
 */

type Status = "pass" | "fail" | "inconclusive";

const JOURNEYS: { name: string; status: Status; time: string }[] = [
  { name: "Sign up", status: "pass", time: "18.2s" },
  { name: "Log in", status: "pass", time: "9.1s" },
  { name: "Browse plans", status: "pass", time: "12.4s" },
  { name: "Checkout", status: "fail", time: "41.0s" },
  { name: "Update billing", status: "inconclusive", time: "27.3s" },
  { name: "Reset password", status: "pass", time: "15.0s" },
  { name: "Invite teammate", status: "pass", time: "22.6s" },
];

const STATUS: Record<Status, { icon: PixelIconName; label: string; color: string }> = {
  pass: { icon: "pass", label: "PASS", color: "text-[var(--t-pass)]" },
  fail: { icon: "fail", label: "FAIL", color: "text-[var(--t-fail)]" },
  inconclusive: { icon: "inconclusive", label: "????", color: "text-[var(--t-warn)]" },
};

const STEPS: { text: string; status: Status | "skipped" }[] = [
  { text: "Open /pricing", status: "pass" },
  { text: "Click “Start trial”", status: "pass" },
  { text: "Fill in the payment form", status: "pass" },
  { text: "Click “Pay now”: nothing happens", status: "fail" },
  { text: "See the welcome screen", status: "skipped" },
];

/** O atraso de cada linha do log: começa depois da janela assentar e segue a 120 ms por linha. */
const at = (index: number) => ({ "--d": `${700 + index * 120}ms` }) as CSSProperties;

function Line({ i, children, className }: { i: number; children: ReactNode; className?: string }) {
  return (
    <p className={cn("term-line", className)} style={at(i)}>
      {children}
    </p>
  );
}

export function TerminalPreview() {
  const passed = JOURNEYS.filter((j) => j.status === "pass").length;
  const failed = JOURNEYS.filter((j) => j.status === "fail").length;
  const inconclusive = JOURNEYS.filter((j) => j.status === "inconclusive").length;
  const afterJourneys = 4 + JOURNEYS.length;

  return (
    <figure className="mx-auto w-full max-w-5xl">
      <figcaption className="sr-only">
        Illustrative preview with demo content: a Publishub verification of an AI-assisted change, “Refactor checkout form”. It ran 7 user journeys in a real browser in 3 minutes 41
        seconds: 5 passed, 1 failed and 1 was inconclusive. Checkout failed at step 4, when clicking “Pay now” did nothing. It is classified as a regression, because it passed on the main
        branch. The evidence includes a screenshot of the failing step, a console error, “TypeError: Cannot read properties of undefined (reading submit)” in CheckoutForm.tsx line 42, and a
        network check showing that the checkout request was never sent.
      </figcaption>

      <div aria-hidden="true" className="terminal overflow-hidden rounded-md text-left">
        {/* barra da janela */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--t-line)] bg-[var(--t-panel)] px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex shrink-0 gap-1.5">
              <span className="h-2.5 w-2.5 bg-[var(--t-line)]" />
              <span className="h-2.5 w-2.5 bg-[var(--t-line)]" />
              <span className="h-2.5 w-2.5 bg-indigo" />
            </span>
            <p className="truncate font-pixel text-[15px]">publishub verify</p>
          </div>
          <span className="shrink-0 border border-[var(--t-line)] px-2 py-0.5 font-pixel text-xs uppercase tracking-[0.08em] text-[var(--t-muted)]">Demo content</span>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* ---------- o log ---------- */}
          <div className="border-b border-[var(--t-line)] p-4 font-mono text-[13px] leading-[1.8] sm:p-5 lg:border-b-0 lg:border-r">
            <Line i={0}>
              <span className="text-[var(--t-accent)]">$</span> publishub verify --change 9f2c1ab
            </Line>
            <Line i={1} className="text-[var(--t-muted)]">
              Refactor checkout form · AI-assisted · 14 files
            </Line>
            <Line i={2} className="mt-2 flex items-center gap-2">
              <PixelIcon name="running" size={11} className="text-[var(--t-accent)]" />
              <span className="min-w-0 flex-1">Starting Chromium · 1280×800</span>
              <span className="text-[var(--t-pass)]">ok</span>
            </Line>
            <Line i={3} className="flex items-center gap-2">
              <PixelIcon name="running" size={11} className="text-[var(--t-accent)]" />
              <span className="min-w-0 flex-1 break-words">Running 7 user journeys on preview-9f2c1ab</span>
            </Line>

            <ul className="mt-2">
              {JOURNEYS.map((journey, index) => {
                const s = STATUS[journey.status];
                return (
                  <li key={journey.name} className="term-line flex items-center gap-2" style={at(4 + index)}>
                    <PixelIcon name={s.icon} size={11} className={s.color} />
                    <span className={cn("w-10 shrink-0 font-pixel text-[13px]", s.color)}>{s.label}</span>
                    <span className={cn("shrink-0", journey.status === "fail" && "text-[var(--t-fail)]")}>{journey.name}</span>
                    <span className="mx-1 h-px min-w-3 flex-1 border-b border-dotted border-[var(--t-line)]" />
                    <span className="shrink-0 text-[var(--t-muted)]">{journey.time}</span>
                  </li>
                );
              })}
            </ul>

            <div className="term-line mt-3 flex items-center gap-3" style={at(afterJourneys)}>
              <div className="h-2.5 flex-1 bg-[var(--t-line)]">
                <div className="term-progress flex h-full" style={at(afterJourneys)}>
                  {JOURNEYS.map((journey) => (
                    <span key={journey.name} className={cn("h-full flex-1 border-r-2 border-[var(--t-bg)] last:border-r-0", journey.status === "pass" ? "bg-[var(--t-pass)]" : journey.status === "fail" ? "bg-[var(--t-fail)]" : "bg-[var(--t-warn)]")} />
                  ))}
                </div>
              </div>
              <span className="shrink-0 text-[var(--t-muted)]">7/7 · 3m 41s</span>
            </div>
            <Line i={afterJourneys + 1} className="mt-2">
              <span className="text-[var(--t-pass)]">{passed} passed</span> · <span className="text-[var(--t-fail)]">{failed} failed</span> ·{" "}
              <span className="text-[var(--t-warn)]">{inconclusive} inconclusive</span>
            </Line>
            <Line i={afterJourneys + 2} className="flex items-start gap-2">
              <PixelIcon name="fail" size={11} className="mt-[0.45em] text-[var(--t-fail)]" />
              <span>Regression: Checkout passed on main (a1c9e2f)</span>
            </Line>
            <Line i={afterJourneys + 3} className="mt-2">
              <span className="text-[var(--t-accent)]">$</span> <span className="term-cursor" style={at(afterJourneys + 3)} />
            </Line>
          </div>

          {/* ---------- o centro de comando da falha ---------- */}
          <div className="bg-[var(--t-panel)] p-4 sm:p-5">
            <dl className="grid grid-cols-3 gap-px border border-[var(--t-line)] bg-[var(--t-line)] sm:grid-cols-5">
              {[
                ["Tests", String(JOURNEYS.length), ""],
                ["Passed", String(passed), "text-[var(--t-pass)]"],
                ["Failed", String(failed), "text-[var(--t-fail)]"],
                ["Unclear", String(inconclusive), "text-[var(--t-warn)]"],
                ["Time", "3m41s", ""],
              ].map(([label, value, color]) => (
                <div key={label} className="bg-[var(--t-bg)] px-2.5 py-2">
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--t-muted)]">{label}</dt>
                  <dd className={cn("font-pixel text-xl leading-tight", color)}>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="mr-1 font-semibold">Checkout failed at step 4</p>
              <span className="border border-[var(--t-fail)] px-1.5 font-pixel text-xs uppercase text-[var(--t-fail)]">Regression</span>
              <span className="border border-[var(--t-line)] px-1.5 font-pixel text-xs uppercase text-[var(--t-muted)]">High severity</span>
            </div>

            <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-[var(--t-muted)]">Steps to reproduce</p>
            <ol className="mt-1.5 space-y-1 text-[13.5px]">
              {STEPS.map((step, index) => (
                <li key={step.text} className={cn("flex items-center gap-2", step.status === "skipped" && "text-[var(--t-muted)]", step.status === "fail" && "text-[var(--t-fail)]")}>
                  <span className="w-4 shrink-0 font-mono text-[12px] text-[var(--t-muted)]">{index + 1}.</span>
                  {step.status === "skipped" ? <span className="h-[11px] w-[11px] shrink-0 border border-[var(--t-line)]" /> : <PixelIcon name={step.status} size={11} className={STATUS[step.status].color} />}
                  {step.text}
                </li>
              ))}
            </ol>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* evidência: a captura de tela do passo 4, desenhada */}
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--t-muted)]">Browser evidence · step 4</p>
                <div className="mt-1.5 border border-[var(--t-line)] bg-white p-2.5 text-night">
                  <p className="text-[12px] font-semibold">Payment details</p>
                  <div className="mt-1.5 space-y-1">
                    <div className="h-4 border border-[#d6d7ea] bg-white" />
                    <div className="grid grid-cols-2 gap-1">
                      <div className="h-4 border border-[#d6d7ea] bg-white" />
                      <div className="h-4 border border-[#d6d7ea] bg-white" />
                    </div>
                  </div>
                  <div className="relative mt-2.5">
                    <div className="flex h-6 items-center justify-center bg-indigo text-[11px] font-semibold text-night">Pay now</div>
                    <span className="absolute -inset-1 border-2 border-dashed border-[#e5484d]" />
                  </div>
                </div>
              </div>
              {/* console e rede */}
              <div className="font-mono text-[12px] leading-relaxed">
                <p className="font-sans text-[11px] uppercase tracking-[0.08em] text-[var(--t-muted)]">Console</p>
                <p className="mt-1.5 break-words text-[var(--t-fail)]">TypeError: Cannot read properties of undefined (reading &apos;submit&apos;)</p>
                <p className="text-[var(--t-muted)]">at CheckoutForm.tsx:42</p>
                <p className="mt-2.5 font-sans text-[11px] uppercase tracking-[0.08em] text-[var(--t-muted)]">Network</p>
                <p className="mt-1.5 flex justify-between gap-2">
                  <span>POST /api/checkout</span>
                  <span className="text-[var(--t-fail)]">not sent</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span>GET /api/plans</span>
                  <span className="text-[var(--t-pass)]">200</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-muted">Illustrative preview with demo content. Publishub is in development, and the product may change.</p>
    </figure>
  );
}
