import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/lib/brand/og";
import { shareHeadlineFor } from "@/lib/check/issues";
import { parseFixed, parsePublicSummary, parseShareCounts, shareHeadline } from "@/lib/check/share";

/**
 * A prévia do link compartilhado (/check/shared): o placar do teste, sem URL nem nome do app.
 * Aceita o formato novo (?c=&r=&pg=&o=, por tipo de problema) e o antigo (?f=&w=&p=).
 * As contagens vêm da própria URL; nada é lido do banco.
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const summary = parsePublicSummary(params);
  const counts = parseShareCounts(params);
  const fixed = summary ? parseFixed(params) : 0;
  const bad = summary ? summary.crash + summary.request + summary.page > 0 : counts.fail > 0;
  const color = fixed ? "#4ADE80" : bad ? "#FF6B6B" : (summary ? summary.other : counts.warn) ? "#F5C542" : "#4ADE80";
  const headline = fixed ? `${fixed} ${fixed === 1 ? "problem" : "problems"} fixed` : summary ? shareHeadlineFor(summary, "en") : shareHeadline(counts);
  const tiles: [string, number, string][] = summary
    ? [
        ["Crashes", summary.crash, summary.crash ? "#FF6B6B" : "#4ADE80"],
        ["Failed requests", summary.request, summary.request ? "#FF6B6B" : "#4ADE80"],
        ["Broken pages", summary.page, summary.page ? "#FF6B6B" : "#4ADE80"],
      ]
    : [
        ["Failures", counts.fail, "#FF6B6B"],
        ["Warnings", counts.warn, "#F5C542"],
        ["Passed", counts.pass, "#4ADE80"],
      ];

  return new ImageResponse(
    (
      <OgFrame badge="Free app check" footer="What do your visitors see? Check your app's public pages free at getpublishub.com/check">
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontSize: 30, color: "#A9AAC2" }}>{fixed ? "Found in a real-browser check, fixed before users saw them:" : "An app's public pages, checked in a real browser:"}</div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.05, color }}>{headline}</div>
          <div style={{ display: "flex", gap: 20 }}>
            {tiles.map(([label, value, tone]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", border: "2px solid #34364A", padding: "14px 26px", minWidth: 220 }}>
                <div style={{ display: "flex", fontSize: 24, color: "#A9AAC2" }}>{label}</div>
                <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: tone }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </OgFrame>
    ),
    {
      ...OG_SIZE,
      // as mesmas contagens geram sempre a mesma imagem
      headers: { "cache-control": "public, max-age=86400, immutable" },
    },
  );
}
