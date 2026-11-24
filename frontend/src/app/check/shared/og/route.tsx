import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/lib/brand/og";
import { parseShareCounts, shareHeadline } from "@/lib/check/share";

/**
 * A prévia do link compartilhado (/check/shared?f=&w=&p=): o placar do teste, sem URL nem nome do app.
 * As contagens vêm da própria URL; nada é lido do banco.
 */
export function GET(request: Request) {
  const counts = parseShareCounts(new URL(request.url).searchParams);
  const color = counts.fail ? "#FF6B6B" : counts.warn ? "#F5C542" : "#4ADE80";
  const tiles: [string, number, string][] = [
    ["Failures", counts.fail, "#FF6B6B"],
    ["Warnings", counts.warn, "#F5C542"],
    ["Passed", counts.pass, "#4ADE80"],
  ];

  return new ImageResponse(
    (
      <OgFrame badge="Free app check" footer="Is your AI-built app actually working? Check it free at getpublishub.com/check">
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontSize: 30, color: "#A9AAC2" }}>An AI-built app, checked in a real browser:</div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, color }}>{shareHeadline(counts)}</div>
          <div style={{ display: "flex", gap: 20 }}>
            {tiles.map(([label, value, tone]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", border: "2px solid #34364A", padding: "14px 26px", minWidth: 200 }}>
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
