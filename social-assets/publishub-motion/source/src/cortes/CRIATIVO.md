# Reel "Cortes" (versão 3 do Reel para editores)

`publishub-reel-cortes-1080x1920.mp4` (um nível acima de `source/`): 1080 × 1920, 30 fps, 26 s,
H.264 + AAC, ~2 MB. A mesma história do "Rewatch #47" e do "O caderno", em outro design.

## A regra do design: nada treme

O "O caderno" usava câmera sobre o papel, e o texto tremulava no celular. Aqui não há câmera:
cada cena é um cartaz parado e o vídeo avança por **corte seco no tempo da música** (1 tempo =
15 quadros, 120 BPM), o que combina com o tema (cortar). Texto e telas entram por recorte
(a letra fica no lugar e é revelada), nunca deslizando nem com zoom. Conferido no MP4: de um
quadro para o outro, só mudam os dígitos do timecode no topo.

## O visual: cara de ferramenta

Fundo escuro com grade fina, cantos de visor, "PUBLISHUB // EDITOR COPILOT", timecode e REC, como o
monitor de um editor. O texto aparece letra a letra no lugar (máquina de escrever com cursor, sempre
alinhado à esquerda, para nada reflui), em Geist 800 nos títulos e Geist Mono nas linhas de comando.
Cada corte de cena tem 2 quadros de glitch (fatias deslocadas). As telas reais ficam em janelas com
barra de título e uma linha de varredura na entrada.

1. `> rewatch_count client_cut_v7_FINAL.mp4` e o contador #01 → #47 com barra; o #47 fica caramelo.
2. `[ INCOMING · CLIENT · 23:48 ]` "love it!! just feels slow somewhere??", e "somewhere" marcado
   em vermelho com `ERR_NO_TIMESTAMP`; depois "“somewhere” isn't a timestamp."
3. O logo (caneta clara, como no tema escuro do site), `> publishub analyze …` e a barra até 100% · ~3 min.
4. [01/05] Drop the cut · [02/05] 0:04, `drop_detected · −26% viewers` e a curva desenhada com a queda
   marcada · [03/05] a transcrição com as frases mortas riscadas (DEAD_START, REPEAT, PAUSE) ·
   [04/05] You decide what goes, com os três cortes `[✓]` · [05/05] 0:41 → 0:32, `✓ original: untouched`.
5. "you're still the editor." e `// publishub just finds the dead moments.`
6. CTA: logo, `> see where your edit loses viewers`, "Analyze your video free →", getpublishub.com.

Trilha chillhop em meio-tempo: Rhodes com acordes de jazz (Dm9 → G13 → Cmaj9 → Am9), baixo 808,
caixa seca, chimbal e shaker, contados a 120 BPM para os cortes caírem no tempo. A batida entra no
#47, para no "Somewhere", volta no "isn't a timestamp", ganha uma frase de Rhodes no produto e
resolve em Cmaj9 no CTA. Por cima, detalhes digitais baixinhos: um "zap" no glitch de cada corte e bipes no erro, na barra completa, na queda e em cada corte ticado. Em `scripts/make-sound-cortes.mjs`.

```sh
npm run render:cortes
```
