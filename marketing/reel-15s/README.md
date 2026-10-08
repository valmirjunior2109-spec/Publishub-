# Reel de 15 s · Publishub

`publishub-reel-15s.mp4`: 1080×1920 (9:16), 30 fps, H.264 High + AAC 48 kHz, −13 LUFS. Pronto para subir no Instagram Reels.

| Tempo | Cena |
|---|---|
| 0.0–2.6 | **Gancho** (noite): "Your Reel loses viewers at 0:04". O timecode corre, a curva despenca no 0:04 e a caneta azul circula o número. |
| 2.6–3.8 | **"Do you know why?"**: a câmera mergulha no "?" e o papel do caderno abre a partir dele. |
| 3.7–9.4 | **Produto**: 01 · o celular é escaneado segundo a segundo · 02 · vira a miniatura da janela de análise (queda, curva, a frase riscada) · 03 · o plano de edição, com os três "Accept". |
| 9.2–12.2 | **Azul**: chicote de câmera, as sete frentes (gancho, cortes, ritmo, b-roll, legendas, estrutura, CTA) e "You decide what stays": a linha do tempo perde os cortes (0:34 → 0:24) e vira o papel da última cena. |
| 12.2–15.0 | **Marca**: o caderno se monta, a caneta assenta nos 20°, "Publishub", "Your AI editing copilot. You stay the editor.", o botão e getpublishub.com. |

Nada importante fica nos 220 px de cima nem nos ~360 px de baixo, que a interface do Reels cobre.

## Como é feito

- `scene.html`: a animação inteira é uma função do tempo, `window.__render(t)`. Cores, tipos (Geist e Geist Mono, em `fonts/`), a cena da cozinha e a curva de retenção são os do site (`frontend/src/app/globals.css`, `ReelFrame.tsx`, `fixtures.ts`). Abra `scene.html?play` para assistir no navegador ou `scene.html?t=5.4` para um quadro.
- `render.mjs`: o Playwright fotografa 4 sub-quadros por quadro (16 nos movimentos mais rápidos), num obturador de 180°, e o `blend.py` tira a média: motion blur de verdade, sem degraus. Depois o ffmpeg codifica o MP4.
- `soundtrack.py`: a trilha é sintetizada com numpy (tique-taque, impacto, batida de 120 BPM, cliques, chicote, acorde final), sincronizada com os mesmos tempos da cena. Sem samples de terceiros.

```bash
cd marketing/reel-15s
node render.mjs --stills 1.6,6.2,8.4,13.9   # quadros soltos em stills/, para revisar
node render.mjs                             # o MP4 inteiro (~12 min com 4 núcleos)
```

Precisa de Node 18+, Playwright com Chromium, Python 3 com numpy e ffmpeg com libx264. Se o Playwright não estiver instalado no projeto, aponte `PLAYWRIGHT_MODULE` para ele; `CHROMIUM_PATH` escolhe o Chromium.

Para trocar o texto (ou fazer a versão em português), mude as frases em `scene.html`: títulos, legendas 01/02/03, `PLAN`, `FRONTS` e o fim.
