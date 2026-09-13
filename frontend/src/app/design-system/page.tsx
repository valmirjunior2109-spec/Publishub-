import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";
import { RetentionCurve } from "@/components/RetentionCurve";
import { RewriteCard } from "@/components/RewriteCard";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { analyses } from "@/lib/fixtures";

/* Página interna de referência (a "ComponentsShowcase" do Figma). Os nomes e
   valores dos tokens são dados do sistema, não copy — por isso ficam aqui. */
const TOKENS = [
  ["Paper", "#F7F4ED", false],
  ["Paper/Raised", "#FFFDF8", false],
  ["Ink", "#1E1B16", true],
  ["Ink/Muted", "#6B6459", true],
  ["Line", "#E3DCCF", false],
  ["Accent", "#B4472C", true],
  ["Accent/Soft", "#F2DED6", false],
  ["Confirmed", "#5C6B4A", true],
  ["Pending", "#C08A2E", true],
  ["Refuted", "#8A5A4E", true],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-16">
      <div className="mb-6 border-b border-line pb-3 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-muted">{title}</div>
      {children}
    </div>
  );
}

export default async function DesignSystemPage() {
  const t = await getTranslations("DesignSystem");
  const tStatus = await getTranslations("Status");
  const tCommon = await getTranslations("Common");
  const sample = analyses[0];

  const TYPE = [
    { label: "Display/XL", spec: "Fraunces 600 · 96px · −0.02em", className: "t-display-xl", text: "0:04" },
    { label: "Display/L", spec: "Fraunces 500 · 56px", className: "t-display-l", text: "O que você disse" },
    { label: "Display/M", spec: "Fraunces 500 · 36px", className: "t-display-m", text: "Loop de previsão" },
    { label: "Quote", spec: "Fraunces 400 itálico · 28px", className: "t-quote", text: `"${t("sampleQuote")}"` },
    { label: "Body/L", spec: "Inter 400 · 18px", className: "t-body-l", text: t("sampleBodyL") },
    { label: "Body/M", spec: "Inter 400 · 15px", className: "text-[15px] leading-[1.6]", text: t("sampleBodyM") },
    { label: "Label", spec: "Inter 500 · 12px · 0.06em · caixa alta", className: "t-label", text: "Queda detectada em" },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[960px] px-5 pb-32 pt-16 lg:px-16">
        <div className="mb-[72px]">
          <h1 className="t-display-l">{t("title")}</h1>
          <p className="mt-4 t-body-l text-ink-muted">{t("lead")}</p>
        </div>

        <Section title={t("tokens")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TOKENS.map(([name, hex, dark]) => (
              <div key={name}>
                <div className="mb-2 flex h-16 items-end rounded-sm border border-[rgba(30,27,22,0.1)] p-2" style={{ backgroundColor: hex }}>
                  <span className={`text-[11px] ${dark ? "text-[rgba(247,244,237,0.7)]" : "text-[rgba(30,27,22,0.5)]"}`}>{hex}</span>
                </div>
                <div className="text-[12px] text-ink-muted">{name}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t("type")}>
          <div className="flex flex-col gap-8">
            {TYPE.map((item) => (
              <div key={item.label} className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-8">
                <div className="w-40 shrink-0">
                  <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-muted">{item.label}</div>
                  <div className="mt-0.5 text-[11px] text-ink-muted opacity-70">{item.spec}</div>
                </div>
                <div className={item.className}>{item.text}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t("logo")}>
          <div className="flex flex-wrap items-start gap-12">
            <div className="flex flex-col items-start gap-3">
              <Logo size="lg" label={tCommon("brand")} />
              <Logo size="md" label={tCommon("brand")} />
              <Logo size="sm" label={tCommon("brand")} />
            </div>
            <div className="flex flex-col items-start gap-3">
              <Logo variant="icon" size="lg" label={tCommon("brand")} />
              <Logo variant="icon" size="md" label={tCommon("brand")} />
              <Logo variant="icon" size="sm" label={tCommon("brand")} />
            </div>
          </div>
        </Section>

        <Section title={t("buttons")}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4">
              <Button>{tCommon("newAnalysis")}</Button>
              <Button variant="secondary">{tCommon("dashboard")}</Button>
              <Button variant="ghost">{tCommon("backToDashboard")}</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="sm">{tCommon("newAnalysis")}</Button>
              <Button size="sm" variant="secondary">
                {tCommon("copy")}
              </Button>
              <Button size="sm" variant="ghost">
                {tCommon("signOut")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button disabled>{t("disabled")}</Button>
              <Button variant="secondary" disabled>
                {t("disabled")}
              </Button>
              <Button variant="ghost" disabled>
                {t("disabled")}
              </Button>
            </div>
          </div>
        </Section>

        <Section title={t("badges")}>
          <div className="flex flex-wrap gap-4">
            <Badge tone="pending">{tStatus("pending")}</Badge>
            <Badge tone="confirmed">{tStatus("confirmed")}</Badge>
            <Badge tone="refuted">{tStatus("refuted")}</Badge>
            <Badge tone="accent">queda em 0:04</Badge>
            <Badge tone="ink">{tCommon("analysis")}</Badge>
            <Badge>{tCommon("language")}</Badge>
          </div>
        </Section>

        <Section title={t("languageSwitch")}>
          <LocaleSwitcher />
        </Section>

        <Section title={t("inputs")}>
          <div className="flex max-w-xs flex-col gap-3">
            <Input placeholder={t("inputPlaceholder")} />
            <Input placeholder={t("inputPlaceholder")} disabled />
          </div>
        </Section>

        <Section title={t("curve")}>
          <div className="flex flex-col gap-8">
            <div>
              <div className="t-label mb-3">{t("curveFull")}</div>
              <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="full" labels={{ watching: "", drop: "" }} />
            </div>
            <div>
              <div className="t-label mb-3">{t("curveMedium")}</div>
              <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="medium" />
            </div>
            <div>
              <div className="t-label mb-3">{t("curveMini")}</div>
              <div className="flex items-center gap-6">
                {analyses.map((a) => (
                  <RetentionCurve key={a.id} points={a.retention} durationSec={a.durationSec} dropAtSec={a.dropAtSec} variant="mini" />
                ))}
              </div>
            </div>
            <div>
              <div className="t-label mb-3">{t("curveDivider")}</div>
              <RetentionCurve points={sample.retention} durationSec={sample.durationSec} dropAtSec={sample.dropAtSec} variant="divider" />
            </div>
          </div>
        </Section>

        <Section title={t("rewriteCard")}>
          <div className="grid gap-4 md:grid-cols-2">
            <RewriteCard index={1} rewrite={sample.rewrites[0]} accent />
            <RewriteCard index={2} rewrite={sample.rewrites[1]} />
          </div>
        </Section>
      </main>
    </>
  );
}
