"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { ImageUp } from "lucide-react";
import { ToolCta } from "@/components/tools/ToolCta";
import { apiFetch, ApiError } from "@/lib/api";
import { clock } from "@/lib/share";
import { captureTool, toolCompleted, toolFailed, toolStarted } from "@/lib/toolAnalytics";
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

/** Uma leitura desta aba, para comparar versões do vídeo: só os números, nada do print. */
interface Reading {
  drop: number;
  lost: number | null;
}

/** O limite diário das ferramentas: a saída é o vídeo inteiro, de graça. */
const LIMIT_CODES = new Set(["TOOLS_LIMIT", "TOOLS_BUSY"]);

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
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-5 h-40 w-full overflow-visible" role="img" aria-hidden="true">
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
  const [readings, setReadings] = useState<Reading[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);

  // uma vez por visita: a entrada do funil
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    captureTool("free_tool_viewed", "retention_curve");
  }, []);

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setLimited(false);
    setReading(null);
    if (!IMAGE_TYPES[file.type]) {
      toolFailed("retention_curve", "WRONG_TYPE");
      return setError(t("wrongType"));
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toolFailed("retention_curve", "IMAGE_TOO_LARGE");
      return setError(describe(new ApiError(413, "IMAGE_TOO_LARGE", "")));
    }
    setBusy(true);
    toolStarted("retention_curve", { compared: readings.length });
    try {
      const image = await asDataUrl(file);
      const read = await apiFetch<CurveReading>("/api/tools/curve", { method: "POST", body: { image_base64: image, mime_type: file.type } });
      setReading(read);
      if (read.readable && read.drop_second !== null) {
        const lost = read.lost_points === null ? null : Math.round(read.lost_points);
        setReadings((current) => [...current, { drop: read.drop_second as number, lost }]);
        toolCompleted("retention_curve", { readable: true, drop_second: Math.round(read.drop_second), lost_points: lost });
      } else {
        // a IA respondeu, mas não achou uma curva no print: é falha para quem enviou
        toolFailed("retention_curve", "UNREADABLE");
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "UNKNOWN";
      setLimited(LIMIT_CODES.has(code));
      setError(describe(err));
      toolFailed("retention_curve", code);
    } finally {
      setBusy(false);
    }
  }

  // a maior perda em pontos é a versão que mais precisa de edição
  const worst = readings.reduce<number | null>((max, item) => (item.lost !== null && (max === null || item.lost > max) ? item.lost : max), null);

  return (
    <div>
      <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-paper-raised p-6 text-center transition-colors hover:border-[rgba(var(--accent-rgb),0.45)] focus-within:border-[rgba(var(--accent-rgb),0.6)]">
        <ImageUp size={28} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
        <span className="text-[15.5px] font-semibold" aria-live="polite">
          {busy ? t("reading") : readings.length ? t("pickAnother") : t("pick")}
        </span>
        <span className="max-w-[44ch] text-[13px] text-ink-muted">{t("pickNote")}</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pick} disabled={busy} />
      </label>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-refuted bg-paper-raised p-3 text-[14px] text-refuted">
          {error}
        </p>
      )}
      {/* o limite do dia: a leitura acabou, o vídeo inteiro continua de graça */}
      {limited && <ToolCta where="tool_curve_limit" tool="retention_curve" title={t("ctaLimitTitle")} lead={t("ctaLead")} />}

      {reading && !reading.readable && (
        <p role="status" className="mt-5 rounded-lg border border-pending bg-paper-raised p-4 text-[14.5px] leading-relaxed">
          {t("unreadable")}
        </p>
      )}

      {reading?.readable && reading.drop_second !== null && (
        <section aria-live="polite" className="mt-6 rounded-2xl border border-line bg-paper-raised p-5 sm:p-6">
          <p className="t-label">{t("resultLabel")}</p>
          <p className="mt-3 font-display text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[31px]">
            {reading.lost_points !== null
              ? t("lost", { lost: Math.round(reading.lost_points), at: clock(reading.drop_second) })
              : t("dropAt", { at: clock(reading.drop_second) })}
          </p>
          {reading.retained_before !== null && reading.retained_after !== null && (
            <p className="mt-2 font-mono text-[13.5px] text-ink-muted">{t("numbers", { before: Math.round(reading.retained_before), after: Math.round(reading.retained_after) })}</p>
          )}
          <Curve points={reading.points} dropAt={reading.drop_second} />
          <ToolCta where="tool_curve" tool="retention_curve" title={t("ctaTitle", { at: clock(reading.drop_second) })} lead={t("ctaLead")} />
        </section>
      )}

      {/* a comparação: as leituras desta aba, na ordem em que foram feitas */}
      {readings.length >= 2 && (
        <section aria-labelledby="curve-compare" className="mt-6 rounded-2xl border border-line bg-paper-raised p-5 sm:p-6">
          <h2 id="curve-compare" className="t-label">
            {t("compareTitle")}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{t("compareNote")}</p>
          <ol className="mt-4 flex flex-col">
            {readings.map((item, index) => (
              <li key={index} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line py-3 text-[14.5px] last:border-b-0">
                <span className="font-medium">{t("compareItem", { n: index + 1 })}</span>
                <span className="font-mono tabular-nums text-ink-muted">
                  {item.lost !== null ? t("compareLost", { lost: item.lost, at: clock(item.drop) }) : t("compareAt", { at: clock(item.drop) })}
                  {worst !== null && item.lost === worst && <span className="ml-2 rounded-full border border-line px-2 py-px font-sans text-[11.5px] font-medium text-refuted">{t("compareWorst")}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
