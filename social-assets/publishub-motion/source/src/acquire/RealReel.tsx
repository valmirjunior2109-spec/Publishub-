import { Heart, MessageCircle, Send } from "lucide-react";
import { Freeze, OffthreadVideo, staticFile } from "remotion";
import { SANS } from "../components/Type";

/**
 * O Reel do exemplo do anúncio: um vídeo real, sem ninguém em cena (frutas rolando numa
 * esteira, recortado em 9:16 por scripts/get-footage-acquire.sh; Intel IoT DevKit, CC BY 4.0).
 * `frame` é o quadro do vídeo que aparece (quem usa decide se ele toca, para ou repete);
 * `played` (0 → 1) é a barra de progresso; `ui` liga legenda, ícones e @; `caption` é a
 * opacidade da legenda.
 */
export function RealReel({ frame, played = 0, scale = 1, ui = true, caption = 1 }: { frame: number; played?: number; scale?: number; ui?: boolean; caption?: number }) {
  const s = scale;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: "inherit", background: "#1B1510" }}>
      <Freeze frame={Math.max(0, Math.round(frame))}>
        <OffthreadVideo src={staticFile("footage/fruit-reel.mp4")} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </Freeze>
      {/* um escurecido embaixo, como no app, para a legenda e o @ lerem bem */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", background: "linear-gradient(transparent, rgba(0,0,0,0.55))" }} />

      {ui && (
        <>
          {/* a legenda, no estilo do Reels */}
          <div style={{ position: "absolute", left: 0, right: 0, top: "66%", opacity: caption, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 21 * s, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#fff", textShadow: `0 ${2 * s}px ${8 * s}px rgba(0,0,0,0.7)` }}>
            5 fruits.
            <br />
            <span style={{ color: "#F5B97A" }}>1 winner.</span>
          </div>
          <div style={{ position: "absolute", bottom: 48 * s, right: 10 * s, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * s, color: "#fff" }}>
            <Heart size={20 * s} strokeWidth={2} />
            <MessageCircle size={20 * s} strokeWidth={2} />
            <Send size={18 * s} strokeWidth={2} />
          </div>
          <div style={{ position: "absolute", bottom: 28 * s, left: 14 * s, display: "flex", alignItems: "center", gap: 6 * s, fontFamily: SANS, fontSize: 11.5 * s, fontWeight: 700, color: "#fff" }}>
            <span style={{ width: 18 * s, height: 18 * s, borderRadius: 999, border: `${1.6 * s}px solid #fff`, background: "#1F47A6", flexShrink: 0 }} />
            @you
          </div>
        </>
      )}
      <span style={{ position: "absolute", bottom: 12 * s, left: 14 * s, right: 14 * s, height: 3 * s, borderRadius: 999, background: "rgba(255,255,255,0.35)" }}>
        <span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${played * 100}%`, borderRadius: 999, background: "#fff" }} />
      </span>
    </div>
  );
}
