"use client";

import { useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { ImageUp } from "lucide-react";
import { ToolCta } from "@/components/tools/ToolCta";
import { apiFetch, ApiError } from "@/lib/api";
import { clock } from "@/lib/share";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/upload";
import { useErrorText } from "@/lib/useErrorText";

interface CurveReading {
  readable: boolean;
  drop_second: number | null;
  retained_before: number | null;
  retained_after: number | null;
  lost_points: number | null;
  points: [number, number][];
}

function asDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** A curva lida do print, redesenhada, com a queda marcada. */
function Curve({ points, dropAt }: { points: [number, number][]; dropAt: number }) {
  if (points.length < 2) return null;
  const last = Math.max(...points.map(([second]) => second), dropAt, 1);
  const x = (second: number) => (second / last) * 100;
  const y = (percent: number) => 100 - Math.max(0, Math.min(100, percent));
  const line = points.map(([second, percent]) => `${x(second).toFixed(2)},${y(percent).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-6 h-40 w-full overflow-visible" role="img" aria-hidden="true">
      <line x1={x(dropAt)} x2={x(dropAt)} y1="0" y2="100" className="stroke-refuted" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      <polyline points={line} fill="none" className="stroke-accent" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * O leitor da curva de retenção: sobe o print do Insights, recebe onde e quanto
 * a audiência caiu. Sem conta. O print não é guardado: vai para a IA e só.
 */
export function CurveTool() {
  const t = useTranslations("Tools.curve");
  const describe = useErrorText();
  const [reading, setReading] = useState<CurveReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setReading(null);
    if (!IMAGE_TYPES[file.type]) return setError(t("wrongType"));
    if (file.size > MAX_IMAGE_BYTES) return setError(describe(new ApiError(413, "IMAGE_TOO_LARGE", "")));
    setBusy(true);
    try {
      const image = await asDataUrl(file);
      setReading(await apiFetch<CurveReading>("/api/tools/curve", { method: "POST", body: { image_base64: image, mime_type: file.type } }));
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-line bg-paper-raised p-8 text-center transition-colors hover:border-[rgba(var(--accent-rgb),0.45)]">
        <ImageUp size={28} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
        <span className="text-[15.5px] font-semibold">{busy ? t("reading") : t("pick")}</span>
        <span className="max-w-[44ch] text-[13px] text-ink-muted">{t("pickNote")}</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pick} disabled={busy} />
      </label>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-refuted bg-paper-raised p-3 text-[14px] text-refuted">
          {error}
        </p>
      )}

      {reading && !reading.readable && (
        <p role="status" className="mt-6 rounded-lg border border-pending bg-paper-raised p-4 text-[14.5px] leading-relaxed">
          {t("unreadable")}
        </p>
      )}

      {reading?.readable && reading.drop_second !== null && (
        <section aria-live="polite" className="mt-8 rounded-[24px] border border-line bg-paper-raised p-6 sm:p-8">
          <p className="t-label">{t("resultLabel")}</p>
          <p className="mt-3 font-display text-[30px] font-medium leading-tight tracking-[-0.02em] sm:text-[36px]">
            {reading.lost_points !== null
              ? t("lost", { lost: Math.round(reading.lost_points), at: clock(reading.drop_second) })
              : t("dropAt", { at: clock(reading.drop_second) })}
          </p>
          {reading.retained_before !== null && reading.retained_after !== null && (
            <p className="mt-2 font-mono text-[13.5px] text-ink-muted">{t("numbers", { before: Math.round(reading.retained_before), after: Math.round(reading.retained_after) })}</p>
          )}
          <Curve points={reading.points} dropAt={reading.drop_second} />
          <ToolCta where="tool_curve" title={t("ctaTitle", { at: clock(reading.drop_second) })} lead={t("ctaLead")} />
        </section>
      )}
    </div>
  );
}
