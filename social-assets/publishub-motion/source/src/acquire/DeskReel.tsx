import { Heart, MessageCircle, Send } from "lucide-react";
import { SANS } from "../components/Type";

/**
 * O Reel do exemplo do anúncio: a mesa de edição de um criador, sem ninguém em cena.
 * Monitor com a timeline aberta (o cursor de reprodução anda com `played`), luminária,
 * câmera e estante, na luz quente da noite, com a legenda no estilo do Reels.
 * `played` (0 → 1) é a barra de progresso; `ui` liga legenda, ícones e @; `caption` é a opacidade da legenda.
 */
export function DeskReel({ played = 0, scale = 1, ui = true, caption = 1, id }: { played?: number; scale?: number; ui?: boolean; caption?: number; id: string }) {
  const s = scale;
  const head = 45 + played * 180; // o cursor de reprodução na timeline do monitor
  const push = 1.05 + 0.05 * played; // a câmera aproxima devagar, como num vídeo de verdade
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: "inherit", background: "#1B1510" }}>
      <svg viewBox="0 0 270 480" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: `scale(${push})`, transformOrigin: "50% 55%" }} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A2D22" />
            <stop offset="1" stopColor="#1A140F" />
          </linearGradient>
          <radialGradient id={`${id}-lamp`} cx="0.2" cy="0.33" r="0.6">
            <stop offset="0" stopColor="#E9A866" stopOpacity="0.55" />
            <stop offset="1" stopColor="#E9A866" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-screen`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#5B7FD6" stopOpacity="0.35" />
            <stop offset="1" stopColor="#5B7FD6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-desk`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7A5436" />
            <stop offset="1" stopColor="#3A2819" />
          </linearGradient>
          <linearGradient id={`${id}-preview`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F3C98F" />
            <stop offset="0.55" stopColor="#D5834A" />
            <stop offset="1" stopColor="#2B3F78" />
          </linearGradient>
          <linearGradient id={`${id}-cone`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#FFD9A6" stopOpacity="0.45" />
            <stop offset="1" stopColor="#FFD9A6" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${id}-vig`} cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.6" />
          </radialGradient>
        </defs>

        {/* a parede, a luz da luminária e o brilho do monitor */}
        <rect width="270" height="480" fill={`url(#${id}-wall)`} />
        <rect width="270" height="480" fill={`url(#${id}-lamp)`} />
        <circle cx="135" cy="240" r="150" fill={`url(#${id}-screen)`} />

        {/* a estante com livros e uma planta */}
        <rect x="150" y="122" width="114" height="5" rx="1.5" fill="#5A4130" />
        {[
          [158, 26, "#8A4F22"],
          [167, 32, "#C9824A"],
          [176, 22, "#F0E2CA"],
          [184, 29, "#1F47A6"],
          [193, 24, "#5C544B"],
        ].map(([x, h, c]) => (
          <rect key={x as number} x={x as number} y={122 - (h as number)} width="8" height={h as number} rx="1" fill={c as string} opacity="0.9" />
        ))}
        <rect x="203" y="104" width="22" height="18" rx="2" transform="rotate(-12 214 113)" fill="#4A3628" />
        <path d="M240 122 h16 l-2 -13 h-12 z" fill="#B8714A" />
        <path d="M248 109 C 240 96, 236 90, 230 86 M248 109 C 252 94, 258 90, 264 86 M248 109 C 248 96, 249 88, 247 80" stroke="#6F8F5E" strokeWidth="3.5" fill="none" strokeLinecap="round" />

        {/* a mesa */}
        <rect x="0" y="345" width="270" height="135" fill={`url(#${id}-desk)`} />
        <rect x="0" y="345" width="270" height="2.5" fill="#9A7050" />

        {/* a luminária e o cone de luz */}
        <path d="M34 196 L92 345 L-10 345 Z" fill={`url(#${id}-cone)`} />
        <path d="M20 344 L48 262 L30 198" stroke="#2A221B" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="20" cy="346" rx="14" ry="3.5" fill="#2A221B" />
        <path d="M22 188 L44 200 L36 212 L16 200 Z" fill="#2A221B" />
        <circle cx="36" cy="205" r="3" fill="#FFE2B8" />

        {/* o monitor, com a timeline de edição aberta */}
        <rect x="128" y="300" width="14" height="45" fill="#141416" />
        <ellipse cx="135" cy="346" rx="32" ry="4.5" fill="#141416" />
        <rect x="35" y="175" width="200" height="125" rx="6" fill="#0E0E10" />
        <rect x="41" y="181" width="188" height="113" rx="2" fill="#18181D" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x="46" y={188 + i * 8} width={i % 2 ? 28 : 38} height="3" rx="1.5" fill="#2E2E36" />
        ))}
        <rect x="93" y="185" width="84" height="48" rx="2" fill={`url(#${id}-preview)`} />
        <circle cx={128 + played * 10} cy={205} r="7" fill="#FFF1D6" opacity="0.9" />
        <path d="M93 222 C 110 214, 130 226, 150 218 C 160 214, 170 220, 177 216 V233 H93 Z" fill="#1E2C55" opacity="0.8" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="182" y={188 + i * 9} width={i % 2 ? 26 : 40} height="3" rx="1.5" fill="#2E2E36" />
        ))}
        <rect x="41" y="238" width="188" height="1" fill="#2A2A31" />
        {/* três trilhas: vídeo, legendas e áudio */}
        {[
          [45, 34],
          [81, 50],
          [133, 24],
          [159, 40],
          [201, 26],
        ].map(([x, w]) => (
          <rect key={x} x={x} y="244" width={w - 2} height="11" rx="2" fill="#3D66C9" opacity="0.9" />
        ))}
        {[
          [52, 30],
          [96, 44],
          [150, 36],
          [192, 30],
        ].map(([x, w]) => (
          <rect key={x} x={x} y="260" width={w - 2} height="8" rx="2" fill="#C9824A" opacity="0.9" />
        ))}
        <path d={`M45 281 ${Array.from({ length: 46 }, (_, k) => `L${45 + k * 4} ${281 + Math.sin(k * 1.9) * (2 + (k % 5))}`).join(" ")}`} stroke="#8FAAF0" strokeWidth="1.2" fill="none" opacity="0.7" />
        <rect x={head} y="239" width="1.4" height="54" fill="#FFFFFF" />
        <path d={`M${head - 3} 239 h7.4 l-3.7 4 z`} fill="#FFFFFF" />

        {/* o teclado, o mouse e a câmera */}
        <rect x="66" y="362" width="126" height="20" rx="3" fill="#232327" />
        {[0, 1, 2].map((r) =>
          Array.from({ length: 14 }, (_, k) => <rect key={`${r}-${k}`} x={70 + k * 8.6} y={365.5 + r * 5.4} width="6.6" height="3.6" rx="0.8" fill="#3A3A40" />),
        )}
        <ellipse cx="214" cy="374" rx="8" ry="12" fill="#232327" />
        <rect x="220" y="314" width="40" height="31" rx="4" fill="#202024" />
        <rect x="226" y="308" width="12" height="7" rx="1.5" fill="#202024" />
        <circle cx="236" cy="330" r="11" fill="#0B0B0D" stroke="#3A3A40" strokeWidth="2" />
        <circle cx="232" cy="326" r="3" fill="#8FAAF0" opacity="0.5" />
        <circle cx="253" cy="320" r="1.8" fill="#E25D4A" />

        <rect width="270" height="480" fill={`url(#${id}-vig)`} />
      </svg>

      {ui && (
        <>
          {/* a legenda, no estilo do Reels */}
          <div style={{ position: "absolute", left: 0, right: 0, top: "65%", opacity: caption, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 19 * s, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#fff", textShadow: `0 ${2 * s}px ${8 * s}px rgba(0,0,0,0.7)` }}>
            I edit a full Reel
            <br />
            in <span style={{ color: "#F5B97A" }}>10 minutes</span>
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
