import { Heart, MessageCircle, Send } from "lucide-react";

/**
 * A tela do Reel de exemplo: uma cena desenhada (a criadora na cozinha, de
 * manhã, com a caneca do "30 dias sem café") e, por cima, a interface do Reels
 * com a legenda. É ilustração, não foto de ninguém: o conteúdo é o mesmo
 * exemplo (fixture) do resto da página. `compact` tira a interface, para as
 * miniaturas. Os cantos vêm de quem a coloca na página.
 */
export function ReelFrame({ phrase, exampleLabel, compact = false }: { phrase?: string; exampleLabel?: string; compact?: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[inherit] bg-[#c99a70]">
      <svg aria-hidden="true" viewBox="0 0 260 540" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
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
        {/* a cozinha: parede, janela com a luz da manhã, prateleira com a planta, bancada */}
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
        {/* a criadora */}
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
        {/* a caneca na mão */}
        <rect x="160" y="414" width="44" height="52" rx="9" fill="#fbf3e6" />
        <path d="M204 426 C 222 426, 222 452, 204 452" fill="none" stroke="#fbf3e6" strokeWidth="7" />
        <ellipse cx="182" cy="416" rx="20" ry="5" fill="#e4d6c1" />
        <rect x="150" y="432" width="20" height="30" rx="9" fill="#d9a27a" />
        <path d="M176 404 C 172 394, 182 390, 178 380 M188 404 C 184 394, 194 390, 190 380" fill="none" stroke="#fffdf8" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        {/* sombra embaixo, para a legenda e o perfil ficarem legíveis */}
        <rect x="0" y="290" width="260" height="250" fill="url(#reel-shade)" />
      </svg>

      {/* a interface do Reels por cima */}
      {!compact && (
        <>
      {exampleLabel && <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] font-medium text-white">{exampleLabel}</span>}
      <div aria-hidden="true" className="absolute bottom-24 right-3 flex flex-col items-center gap-4 text-white">
        <Heart size={24} strokeWidth={2} />
        <MessageCircle size={24} strokeWidth={2} />
        <Send size={22} strokeWidth={2} />
      </div>
      <div className="absolute bottom-12 left-5 right-14">
        <p aria-hidden="true" className="flex items-center gap-2 text-[13px] font-bold text-white">
          <span className="h-6 w-6 rounded-full border-2 border-white bg-[#d61f69]" />
          @cafe.e.rotina
        </p>
        {phrase && <p className="mt-2 line-clamp-3 text-[13.5px] font-medium leading-snug text-white">{phrase}</p>}
      </div>
      <span aria-hidden="true" className="absolute bottom-7 left-5 right-5 h-1 rounded-full bg-white/35">
        <span className="absolute inset-y-0 left-0 w-[12%] rounded-full bg-white" />
      </span>
        </>
      )}
    </div>
  );
}
