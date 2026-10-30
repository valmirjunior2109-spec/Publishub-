# Reel "Cortes" (versão 3 do Reel para editores)

`publishub-reel-cortes-1080x1920.mp4` (um nível acima de `source/`): 1080 × 1920, 30 fps, 26 s,
H.264 + AAC, ~2 MB. A mesma história do "Rewatch #47" e do "O caderno", em outro design.

## A regra do design: nada treme

O "O caderno" usava câmera sobre o papel, e o texto tremulava no celular. Aqui não há câmera:
cada cena é um cartaz parado e o vídeo avança por **corte seco no tempo da música** (1 tempo =
15 quadros, 120 BPM), o que combina com o tema (cortar). Texto e telas entram por recorte
(a letra fica no lugar e é revelada), nunca deslizando nem com zoom. Conferido no MP4: de um
quadro para o outro, só mudam os dígitos do timecode no topo.

## O visual

Campos de cor chapados (creme, caramelo, tinta e o azul da caneta do logo), tipografia gigante
em Geist 800, Fraunces nas falas, Geist Mono nos rótulos, e uma faixa no topo com
"PUBLISHUB · FOR EDITORS" e o timecode, como o monitor de um editor.

1. **REWATCH #01 → #47**, o número trocando em corte seco; o #47 bate no caramelo.
2. O cliente, uma palavra por tempo: "love it!!" / "just feels" / "slow" / "somewhere??".
3. No azul: "“Somewhere” isn't a timestamp."
4. O logo no fundo de tinta e "~3 minutes later:".
5. O produto em cinco cartazes numerados: Drop the cut (tela real do envio) · 0:04 e "26% of
   viewers left right here" (cartão real da queda) · a frase riscada em caramelo e "Cut it.
   Open with the result." · "You decide what goes." com os três cortes ticados e a tela real
   dos cortes · "0:41 → 0:32" e "Your original stays untouched." com a tela real do vídeo pronto.
6. "You're" / "still" / "the editor." e "publishub just finds the dead moments."
7. CTA: logo, "See where your edit loses viewers.", "Analyze your video free",
   getpublishub.com, "No account · No card · Results in ~3 min".

Trilha chillhop em meio-tempo: Rhodes com acordes de jazz (Dm9 → G13 → Cmaj9 → Am9), baixo 808,
caixa seca, chimbal e shaker, contados a 120 BPM para os cortes caírem no tempo. A batida entra no
#47, para no "Somewhere", volta no "isn't a timestamp", ganha uma frase de Rhodes no produto e
resolve em Cmaj9 no CTA. Em `scripts/make-sound-cortes.mjs`.

```sh
npm run render:cortes
```
