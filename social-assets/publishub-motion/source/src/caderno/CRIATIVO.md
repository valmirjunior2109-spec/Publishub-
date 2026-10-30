# Reel "O caderno" (versão 2 do Reel para editores)

`publishub-reel-caderno-1080x1920.mp4` (um nível acima de `source/`): 1080 × 1920, 30 fps, 26,7 s,
H.264 + AAC. Mesma história do "Rewatch #47" (`src/editors/CRIATIVO.md`), contada de outro jeito,
para não parecer com nenhum outro vídeo da Publishub.

## O que muda

- **Tudo acontece no papel.** O caderno pautado da marca e a caneta do logo escrevendo, num
  plano-sequência só, com câmera na mão (zoom, desfoque nos movimentos rápidos, grão de papel).
  Não há tela escura nem título de anúncio.
- **O gancho são 47 risquinhos** de "rewatches:", cada vez mais rápidos, e o "#47" circulado.
- **O cliente cola um post-it**: "love it!! just feels slow somewhere??". A caneta circula
  "somewhere", escreve "WHERE?" e depois "“somewhere” isn't a timestamp."
- **A Publishub entra como etiqueta de fita crepe.** No gráfico de retenção, a caneta acha o
  0:04 e escreve "0:04: 26% left right here." (a frase do caderno da landing). Na transcrição,
  risca as frases mortas e anota "cut", "repeat", "pause" e "keep" na margem.
- **Telas reais coladas com fita:** o cartão "Retention dropped here 0:04" e "publishub found
  3 stretches to cut", capturas da interface (`public/editors`, de `scripts/editors/capture.mjs`).
- **Você decide:** três ticks no checklist dos cortes. Depois, uma **tesoura de verdade corta a
  fita do vídeo** nos cinco limites, os pedaços caem e o resto se junta: "0:41 → 0:32".
- **O fim:** "you're still the editor." A página vira, o caderno fechado é a capa caramelo, a
  câmera se afasta e ela vira o logo; a caneta desliza para o lugar. CTA: "Analyze your video
  free · getpublishub.com · No account · No card · Results in ~3 min".
- **Trilha de lançamento de startup**, sem som de caneta: pop eletrônico a 120 BPM (C → G → Am → F),
  bumbo reto, palmas, baixo de house, pad que respira com o bumbo e um pluck no riff. A batida chega
  abafada no gancho, a música "freia" no post-it, o drop entra com a etiqueta do logo, há um breakdown
  no "you're still the editor" e o logo cai no último acorde. Ficaram só o tapa do post-it, a tesoura e
  as passagens. Tudo sintetizado em `scripts/make-sound-caderno.mjs`.

Fontes: Caveat (as notas à mão do site) e Fraunces, ambas SIL Open Font License, em `public/fonts`.

## Legenda sugerida

"47 rewatches. One sticky note: "feels slow somewhere??" publishub finds the exact second viewers
leave, the line you were saying, and the dead moments to cut. You tick what goes. Free test, no
account: getpublishub.com"

## Refazer

```sh
npm run render:caderno      # trilha + render → ../publishub-reel-caderno-1080x1920.mp4
node scripts/stills.mjs ReelCaderno out/caderno 8 100 300 470 672 760
```

| O quê | Onde |
|---|---|
| Cenas, câmera, caneta, tesoura | `src/caderno/Caderno.tsx` |
| Traços à mão (geometria) e medida de texto | `src/caderno/ink.ts` |
| Tempo de tudo | `src/caderno/timeline.json` |
| Trilha | `scripts/make-sound-caderno.mjs` |
