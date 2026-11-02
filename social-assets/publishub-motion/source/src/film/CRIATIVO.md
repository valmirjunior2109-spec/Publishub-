# Filme de lançamento

`publishub-launch-film-1920x1080.mp4` (um nível acima de `source/`): 1920 × 1080, 60 fps, 62 s, H.264 + AAC, em inglês. É a peça
de marca da Publishub, para a landing, o YouTube, o X e quem quer entender a startup em um minuto.

## De onde veio a forma

Da observação de quadros reais de filmes de lançamento (Linear Agent, Linear Diffs, Framer Skills, Cursor 2.0, Figma Code Layers),
vistos nas miniaturas públicas do YouTube, só como estudo. Nada deles entra no filme.

- **O produto é o herói:** a tela de verdade, enorme, inclinada em 3D, com foco raso e fundo escuro (Linear, Framer).
- **Cartões de uma frase, digitada,** em fundo liso, entre um trecho e outro (Cursor).
- **Curto e no compasso:** 62 s, com todos os cortes no tempo da música, em vez de slides e cartões desenhados.
- **A promessa logo de cara:** a frase inteira está na tela nos primeiros 2 s.

## O roteiro, em tempos da música (122 BPM)

1. **0:00** "See where your edit loses viewers. Before you post or deliver it.", na introdução da música, e o logo.
2. **0:08** A batida entra e a tela de envio chega em 3D: o arquivo cai, o cursor clica em Analyze.
3. **0:13** "It listens to every line." e as etapas reais da análise.
4. **0:19** "Then it finds the second.": o 0:04 enorme, depois a frase que a pessoa dizia.
5. **0:24** "And tells you why.": o motivo e o que testar no lugar.
6. **0:29** "You decide what goes.": os cortes, Accept all e Apply, e o resultado (0:41 → 0:32).
7. **0:37** "Your original stays untouched." e "Then, a fix plan by impact.": o plano, e as falas reescritas.
8. **0:47** "It's not another video editor. Keep CapCut. Keep Premiere. Keep DaVinci."
9. **0:51** "AI finds. You decide. You stay the editor."
10. **0:55** O convite, com um clique no botão, e o final só com o logo e o endereço, no fim natural da música.

## Regras seguidas

- **Nada treme:** os movimentos arrancam rápido e param de vez; as telas são imagens, não texto reposicionado.
- **Só o que o produto faz:** todas as telas são capturas reais, com a análise de exemplo e o selo EXAMPLE ANALYSIS.
- **Sem o vídeo do fundador:** os recortes deixam de fora a coluna do vídeo.
- **A paleta:** preto, branco e marrom claro, com o azul do próprio produto.

## O som

Só gravações de verdade, do [Mixkit](https://mixkit.co/license/), livres para uso comercial em YouTube, redes sociais e anúncios
online, sem crédito obrigatório (não valem para TV, rádio, CD/DVD nem jogos). `scripts/film/get-audio.mjs` baixa os arquivos, que
não podem ser redistribuídos e por isso ficam fora do git.

- **Música:** "Tech House Vibes" (122 BPM). A alternativa é "Motivating Mornings", ajustada de 121 para 122 BPM para acompanhar os
  cortes (`soundtrack-alt.wav`).
- **Efeitos:** "Mouse click close" (clique), "Fast whoosh transition" (entrada das telas), "Typing on a laptop keyboard" (cartões).
- **Mixagem:** `scripts/film/mix.mjs` junta os compassos que encaixam nas cenas, abaixa a música no instante de cada clique e deixa o
  volume em cerca de -14 dB de RMS.

## Refazer

Com o site em `localhost:3123` e um Edge com `--remote-debugging-port=9555` (detalhes em `scripts/film/capture.mjs`):

```
node scripts/film/capture.mjs
node scripts/film/plates.cjs
node scripts/film/get-audio.mjs
npm run render:film
```
