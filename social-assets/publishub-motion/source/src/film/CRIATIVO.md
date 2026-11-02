# Filme de lançamento

`publishub-launch-film-1920x1080.mp4` (um nível acima de `source/`): 1920 × 1080, 60 fps, 74 s, H.264 + AAC, ~16 MB,
em inglês. É a peça de marca da Publishub, para a landing, o YouTube, o X e quem quer entender a startup em um minuto.

## O estilo

Inspirado nas técnicas comuns dos vídeos de produto de SaaS, sem usar nenhuma imagem de outra empresa:

- **Janela sobre fundo colorido:** a tela real, com cantos redondos e sombra, em tema claro.
- **Câmera atrás do cursor:** aproxima no que vai ser clicado e volta. Parada, nada se move.
- **Dois cursores com nome:** "Publishub AI" encontra e "You" decide. É a ideia do produto na tela.
- **O clique abre a próxima cena:** um círculo cresce a partir do ponto clicado.
- **Clique bem audível:** apertar e soltar, com a música mais baixa. O pico fica de 2 a 3 vezes acima da música.
- **Legendas curtas em pílula** na parte de baixo, para quem assiste sem som.

## Os cinco atos

1. **0:00 O problema.** O cursor arrasta clipes, dá play sem parar e clica em "Post". A linha de retenção desaba: "Nobody
   tells you where."
2. **0:14 A marca.** O cursor "Publishub AI" clica no ponto da queda e abre o logo.
3. **0:19 O produto.** Enviar, analisar, achar o segundo, a frase e o motivo (os cartões saltam da tela), aceitar os cortes
   e aplicar (0:41 → 0:32), e o plano por ordem de impacto. Tudo com a análise de exemplo e o selo EXAMPLE.
4. **0:52 Em volta da edição.** Seis recursos que já existem, um por clique.
5. **0:59 A ideia e o convite.** "AI finds. You decide. You stay the editor." e o botão com getpublishub.com.

## Regras seguidas

- **Nada treme:** quando a câmera para, os valores não mudam. Conferido no MP4 nos trechos parados.
- **Só o que o produto faz:** os textos saem do site e do FAQ. Os números da análise são do exemplo.
- **Sem o vídeo do fundador:** a coluna do vídeo não mostra o vídeo, e o aviso de prévia dá lugar a um "play".
- **Sem letra cortada:** o zoom enquadra a coluna inteira.

## O som

Sintetizado em `scripts/make-sound-film.mjs`. O clique está em `mouseClick`: para usar um arquivo do ElevenLabs, é aqui que
ele entra. O plano grátis deles não permite uso comercial.

## Refazer

Com o site em `localhost:3123` e um Edge com `--remote-debugging-port=9555` (detalhes em `scripts/film/capture.mjs`):

```
node scripts/film/capture.mjs
npm run render:film
```
