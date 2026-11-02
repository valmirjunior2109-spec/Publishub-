# Reel "Stop blaming the algorithm" / "Para de culpar o algoritmo"

`publishub-reel-swipe-en-1080x1920.mp4` e `publishub-reel-swipe-pt-1080x1920.mp4` (um nível acima de
`source/`): 1080 × 1920, 30 fps, 25 s, H.264 + AAC, ~2,5 MB. Feito para alcance: quem cria ou edita vídeo
discorda, comenta e manda para alguém.

## O que faz circular

- **O primeiro quadro já é a frase**, sem entrada: serve de capa e para o dedo em 1 segundo.
- **A curva cai no segundo 0:04 do próprio Reel**, o mesmo segundo da análise de exemplo, e a batida entra nessa hora.
- **O convite tem dois pedidos:** testar de graça e mandar para o amigo que ainda culpa o algoritmo.

## Roteiro

1. 0:00 "Stop blaming the algorithm." (riscado) "It's probably one line."
2. 0:02 "People don't leave your video." 0:03,5 "They leave one second of it." A linha cai no 0:04.
3. 0:05,5 a tela da análise, com o selo EXAMPLE: o cursor marca o segundo, depois a frase.
4. 0:09,5 o logo, o envio do arquivo, "About 3 minutes later:" e as etapas reais da análise.
5. 0:14 o plano de correção: o cursor aceita a sugestão, "Final edit: 0:34 → 0:24", e o contador desce.
6. 0:17,5 "Nothing is cut until you approve it. Your original stays untouched."
7. 0:19,5 o convite: botão, "No account · No card · ~3 min", getpublishub.com, link na bio.

## Regras seguidas

- **Nada treme:** o fundo é fixo, o texto entra por recorte e para, e as posições são inteiras. Conferido no MP4: nos
  trechos parados, nenhum pixel muda de um quadro para o outro.
- **Só o que o produto faz:** as telas são a análise de exemplo da landing, em cada idioma (`scripts/swipe/capture.mjs`),
  sem a coluna do vídeo do fundador. Os números são os do exemplo (−32%, 0:34 → 0:24), com o selo EXAMPLE, e "likely"
  porque a queda é uma estimativa.
- **Áreas livres do Instagram:** o conteúdo fica entre y≈230 e y≈1520.

## Refazer

Com o site em `localhost:3123` e um Edge com `--remote-debugging-port=9555`:

```
node scripts/swipe/capture.mjs
npm run render:swipe
```
