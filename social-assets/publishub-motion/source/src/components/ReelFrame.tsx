import { Heart, MessageCircle, Send } from "lucide-react";
import { FONT } from "../theme";

/**
 * O Reel de exemplo da landing (frontend/src/components/landing/ReelFrame.tsx):
 * a criadora na cozinha com a caneca do "30 dias sem café". É ilustração, não
 * foto de ninguém. `played` (0 → 1) é a barra de progresso do Reels.
 */
export function ReelFrame({ exampleLabel, phrase, played = 0.12, scale = 1 }: { exampleLabel?: string; phrase?: string; played?: number; scale?: number }) {
  const s = scale;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: "inherit", background: "#c99a70" }}>
      <svg viewBox="0 0 260 540" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
        <defs>
          <linearGradient id="reel-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#efd3b0" />
            <stop offset="1" stopColor="#c99a70" />
          </linearGradient>
          <linearGradient id="reel-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.62" />
          </linearGradient>
        </defs>
        <rect width="260" height="540" fill="url(#reel-wall)" />
        <rect x="22" y="56" width="104" height="138" rx="8" fill="#fbecd3" />
        <path d="M74 56 V194 M22 125 H126" stroke="#dcb68d" strokeWidth="5" />
        <rect x="22" y="56" width="104" height="138" rx="8" fill="none" stroke="#dcb68d" strokeWidth="5" />
        <rect x="150" y="128" width="96" height="7" rx="2" fill="#8a6446" />
        <rect x="198" y="98" width="26" height="30" rx="4" fill="#c9824a" />
        <ellipse cx="203" cy="90" rx="9" ry="15" fill="#6f8f5e" transform="rotate(-20 203 90)" />
        <ellipse cx="219" cy="88" rx="9" ry="16" fill="#7fa06c" transform="rotate(18 219 88)" />
        <rect x="160" y="110" width="22" height="18" rx="3" fill="#f6f0e4" />
        <rect x="0" y="450" width="260" height="90" fill="#7a5537" />
        <path d="M28 540 C 34 438, 78 396, 130 396 C 182 396, 226 438, 232 540 Z" fill="#2f4a6d" />
        <path d="M102 404 C 112 420, 148 420, 158 404" fill="none" stroke="#24395a" strokeWidth="5" strokeLinecap="round" />
        <rect x="116" y="340" width="28" height="66" rx="12" fill="#c98f66" />
        <ellipse cx="80" cy="304" rx="9" ry="13" fill="#cf9670" />
        <ellipse cx="180" cy="304" rx="9" ry="13" fill="#cf9670" />
        <ellipse cx="130" cy="300" rx="50" ry="58" fill="#d9a27a" />
        <path d="M76 312 C 64 236, 112 222, 136 226 C 184 230, 198 268, 184 312 C 180 276, 156 258, 124 262 C 100 266, 84 284, 76 312 Z" fill="#3b2618" />
        <path d="M84 286 C 70 330, 74 380, 92 400 C 84 360, 86 320, 96 296 Z" fill="#3b2618" />
        <path d="M176 286 C 190 330, 186 380, 168 400 C 176 360, 174 320, 164 296 Z" fill="#3b2618" />
        <path d="M104 290 Q 113 284 122 289 M138 289 Q 147 284 156 290" fill="none" stroke="#3b2618" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="113" cy="303" rx="4" ry="5" fill="#2a1a10" />
        <ellipse cx="147" cy="303" rx="4" ry="5" fill="#2a1a10" />
        <circle cx="104" cy="324" r="9" fill="#e8a58a" opacity="0.45" />
        <circle cx="156" cy="324" r="9" fill="#e8a58a" opacity="0.45" />
        <path d="M112 332 Q 130 348 148 332" fill="none" stroke="#8a3d2c" strokeWidth="4" strokeLinecap="round" />
        <rect x="160" y="414" width="44" height="52" rx="9" fill="#fbf3e6" />
        <path d="M204 426 C 222 426, 222 452, 204 452" fill="none" stroke="#fbf3e6" strokeWidth="7" />
        <ellipse cx="182" cy="416" rx="20" ry="5" fill="#e4d6c1" />
        <rect x="150" y="432" width="20" height="30" rx="9" fill="#d9a27a" />
        <path d="M176 404 C 172 394, 182 390, 178 380 M188 404 C 184 394, 194 390, 190 380" fill="none" stroke="#fffdf8" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <rect x="0" y="290" width="260" height="250" fill="url(#reel-shade)" />
      </svg>

      {exampleLabel && (
        <span style={{ position: "absolute", left: 10 * s, top: 10 * s, borderRadius: 999, background: "rgba(0,0,0,0.55)", padding: `${3 * s}px ${9 * s}px`, fontFamily: FONT.mono, fontSize: 10.5 * s, fontWeight: 500, color: "#fff" }}>
          {exampleLabel}
        </span>
      )}
      <div style={{ position: "absolute", bottom: (phrase ? 96 : 50) * s, right: 10 * s, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * s, color: "#fff" }}>
        <Heart size={20 * s} strokeWidth={2} />
        <MessageCircle size={20 * s} strokeWidth={2} />
        <Send size={18 * s} strokeWidth={2} />
      </div>
      <div style={{ position: "absolute", bottom: 26 * s, left: 14 * s, right: 44 * s }}>
        <p style={{ display: "flex", alignItems: "center", gap: 6 * s, fontFamily: FONT.sans, fontSize: 11.5 * s, fontWeight: 700, color: "#fff", margin: 0 }}>
          <span style={{ width: 18 * s, height: 18 * s, borderRadius: 999, border: `${1.6 * s}px solid #fff`, background: "#c9824a", flexShrink: 0 }} />
          @cafe.e.rotina
        </p>
        {phrase && (
          <p style={{ margin: `${6 * s}px 0 0`, fontFamily: FONT.sans, fontSize: 12 * s, fontWeight: 500, lineHeight: 1.35, color: "#fff", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {phrase}
          </p>
        )}
      </div>
      <span style={{ position: "absolute", bottom: 12 * s, left: 14 * s, right: 14 * s, height: 3 * s, borderRadius: 999, background: "rgba(255,255,255,0.35)" }}>
        <span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${played * 100}%`, borderRadius: 999, background: "#fff" }} />
      </span>
    </div>
  );
}
