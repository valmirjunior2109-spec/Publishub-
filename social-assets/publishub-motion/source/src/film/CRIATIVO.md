# Filme de lançamento

`publishub-launch-film-1920x1080.mp4` (um nível acima de `source/`): 1920 × 1080, 60 fps, 74 s, H.264 + AAC, ~13 MB,
em inglês. É a peça de marca da Publishub, para a landing, o YouTube, o X e quem quer entender a startup em um minuto.

## Os cinco atos

1. **0:00 O problema.** A timeline de um editor: "You cut it. You recut it. You watched it 47 times. You posted it."
   A linha de retenção desaba: "Somewhere in there, people left. Nobody tells you where." A música quase para.
2. **0:16 A marca.** O logo com a batida seca e "Your AI editing copilot."
3. **0:21 O produto.** Cinco passos, sempre com a tela real em tema escuro, a análise de exemplo e o selo EXAMPLE:
   Upload, Analyze (os estados reais da análise), Find (o segundo, a frase, o motivo), Cut (o cursor aceita os cortes e
   aplica; 0:41 → 0:32) e Fix (o plano por ordem de impacto).
4. **0:52 Em volta da edição.** Seis recursos que já existem: memória, os editores que a pessoa já usa, 11 idiomas,
   compartilhamento, Notion e privacidade.
5. **0:59 A ideia e o convite.** "AI finds. You decide. You stay the editor." e o botão com getpublishub.com.

## Regras seguidas

- **Nada treme:** tudo entra e para em posição inteira, e as luzes do fundo só mudam nas passagens de ato. Conferido no
  MP4: nos trechos parados, nenhum pixel relevante muda de um quadro para o outro.
- **Só o que o produto faz:** os textos saem do site e do FAQ. Os números da análise são do exemplo, com o selo EXAMPLE.
- **Sem o vídeo do fundador:** as telas são recortadas na coluna da análise.

## Refazer

Com o site em `localhost:3123` e um Edge com `--remote-debugging-port=9555` (detalhes em `scripts/film/capture.mjs`):

```
node scripts/film/capture.mjs
npm run render:film
```
