import { Ban, Check, CircleAlert, GitCommitHorizontal, Image as ImageIcon, MinusCircle, Repeat, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A prévia ilustrativa de uma verificação (dados de demonstração, rotulados como tal).
 * É só desenho: para o leitor de tela, vale a legenda, que conta o que a imagem mostra.
 */

const JOURNEYS: { name: string; ok: boolean; time: string; hideOnMobile?: boolean }[] = [
  { name: "Sign up", ok: true, time: "18s" },
  { name: "Log in", ok: true, time: "9s" },
  { name: "Browse plans", ok: true, time: "12s", hideOnMobile: true },
  { name: "Checkout", ok: false, time: "41s" },
  { name: "Update billing", ok: false, time: "27s" },
  { name: "Reset password", ok: true, time: "15s", hideOnMobile: true },
  { name: "Invite teammate", ok: true, time: "22s", hideOnMobile: true },
];

const STEPS: { label: string; state: "pass" | "fail" | "skip"; note?: string }[] = [
  { label: "Open /pricing", state: "pass" },
  { label: "Click “Start trial”", state: "pass" },
  { label: "Fill in the payment form", state: "pass" },
  { label: "Click “Pay now”", state: "fail", note: "Nothing happened. No request was sent to /api/checkout." },
  { label: "See the welcome screen", state: "skip" },
];

function StepIcon({ state }: { state: "pass" | "fail" | "skip" }) {
  if (state === "pass")
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success-soft text-success">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  if (state === "fail")
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-critical-soft text-critical">
        <X className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-strong text-muted">
      <MinusCircle className="h-3 w-3" />
    </span>
  );
}

export function VerifyPreview() {
  const passed = JOURNEYS.filter((j) => j.ok).length;
  return (
    <figure className="mx-auto w-full max-w-5xl">
      <figcaption className="sr-only">
        Illustrative preview with demo content. A verification run of an AI-assisted change called “Refactor checkout form” failed 2 of 7 user journeys. The Checkout journey failed at step 4: clicking
        “Pay now” did nothing and no request was sent. Publishub classifies it as a regression with high severity, shows a screenshot of the failing step, and writes a bug report that points to
        the missing submit handler.
      </figcaption>

      <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-line bg-card text-left shadow-raised">
        {/* barra da janela */}
        <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
          <p className="truncate font-mono text-[13px] text-muted">
            acme-app <span className="text-line-strong">/</span> verifications <span className="text-line-strong">/</span> <span className="text-ink">run 128</span>
          </p>
          <span className="shrink-0 rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Demo content</span>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          {/* a execução */}
          <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Change under test</p>
            <p className="mt-1.5 flex items-center gap-2 font-semibold">
              <GitCommitHorizontal className="h-4 w-4 shrink-0 text-muted" />
              Refactor checkout form
            </p>
            <p className="mt-0.5 font-mono text-[13px] text-muted">AI-assisted · 14 files · 9f2c1ab</p>

            <div className="mt-5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-critical-soft px-2.5 py-1 text-sm font-semibold text-critical">
                <CircleAlert className="h-4 w-4" />
                Failed
              </span>
              <span className="font-mono text-[13px] text-muted">3m 41s</span>
            </div>
            <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
              {JOURNEYS.map((journey) => (
                <span key={journey.name} className={cn("flex-1", journey.ok ? "bg-success" : "bg-critical")} />
              ))}
            </div>
            <p className="mt-2 text-sm text-muted">
              {passed} passed · {JOURNEYS.length - passed} failed · {JOURNEYS.length} journeys
            </p>

            <ul className="mt-4 divide-y divide-line border-y border-line">
              {JOURNEYS.map((journey) => (
                <li
                  key={journey.name}
                  className={cn("items-center justify-between gap-3 py-2 text-[15px]", journey.hideOnMobile ? "hidden sm:flex" : "flex", !journey.ok && "font-semibold")}
                >
                  <span className="flex items-center gap-2.5">
                    <StepIcon state={journey.ok ? "pass" : "fail"} />
                    {journey.name}
                  </span>
                  <span className="font-mono text-[13px] font-normal text-muted">{journey.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* a jornada que falhou */}
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-2 text-lg font-semibold">Checkout journey failed</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-[13px] font-semibold">
                <Repeat className="h-3.5 w-3.5" />
                Regression
              </span>
              <span className="rounded-full bg-critical-soft px-2 py-0.5 text-[13px] font-semibold text-critical">High severity</span>
            </div>

            <ol className="mt-4 space-y-2.5">
              {STEPS.map((step, index) => (
                <li key={step.label} className={cn("flex gap-3 text-[15px]", step.state === "skip" && "text-muted")}>
                  <StepIcon state={step.state} />
                  <span>
                    <span className="font-mono text-[13px] text-muted">{index + 1}.</span> <span className={step.state === "fail" ? "font-semibold" : undefined}>{step.label}</span>
                    {step.note ? <span className="block text-sm text-critical">{step.note}</span> : null}
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {/* a captura de tela do passo 4, desenhada */}
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Screenshot · step 4
                </p>
                <div className="mt-2 rounded-lg border border-line bg-card p-3">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
                    <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
                    <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
                  </div>
                  <p className="mt-2 text-sm font-semibold">Payment details</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="h-6 rounded border border-line bg-surface" />
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="h-6 rounded border border-line bg-surface" />
                      <div className="h-6 rounded border border-line bg-surface" />
                    </div>
                  </div>
                  <div className="relative mt-3">
                    <div className="flex h-8 items-center justify-center rounded-md bg-accent text-sm font-semibold text-on-accent">Pay now</div>
                    <span className="absolute -inset-1.5 rounded-lg border-2 border-dashed border-critical" />
                  </div>
                </div>
              </div>

              {/* o relatório do bug */}
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Bug report</p>
                <p className="mt-2 text-sm font-semibold">“Pay now” does nothing</p>
                <dl className="mt-1.5 space-y-1.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted">Expected</dt>
                    <dd>Redirect to /welcome</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted">Actual</dt>
                    <dd>Stays on /checkout, no network request</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted">Last pass</dt>
                    <dd className="font-mono text-[13px]">main · a1c9e2f</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted">Likely cause</dt>
                    <dd>
                      <span className="font-mono text-[13px]">onSubmit</span> removed in <span className="font-mono text-[13px]">CheckoutForm.tsx</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted sm:basis-full">Failure classification</p>
              <span className="inline-flex items-center gap-1.5">
                <Repeat className="h-4 w-4 text-muted" />
                Regression: passed on the previous version
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Ban className="h-4 w-4 text-muted" />
                Not flaky: failed 3 of 3 reruns
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-muted">Illustrative preview with demo content. Publishub is in development, and the product may change.</p>
    </figure>
  );
}
