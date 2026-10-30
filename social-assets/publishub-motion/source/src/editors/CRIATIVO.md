# Reel para editores · "Rewatch #47"

`publishub-reel-editors-1080x1920.mp4` (um nível acima de `source/`): 1080 × 1920, 30 fps, 27 s,
H.264 + AAC 48 kHz. Sem narração: a mensagem inteira está na tela e funciona no mudo. A trilha
e os efeitos são sintetizados em `scripts/make-sound-editors.mjs`.

## O que o produto faz (e o que o vídeo mostra)

Tirado do site (`frontend/messages/en.json`), sem acrescentar nada:

- mostra o segundo em que as pessoas saem, a frase que estava sendo dita e o porquê;
- devolve um plano em ordem de impacto (gancho, cortes, ritmo, legendas…);
- sugere cortes que o editor aceita, recusa ou ajusta. Com eles aplicados, gera o vídeo
  editado, e o original fica intacto;
- leva cerca de 3 minutos. O teste grátis não pede conta nem cartão.

**Todas as telas do meio do vídeo são captura da interface real** (frontend em 390 px, DSF 3,
tema escuro). A API foi simulada com a análise de exemplo da landing ("30 days without
coffee"), por isso o vídeo leva o selo "Real product · Example analysis". A timeline de
editor da abertura é desenhada: é o problema, não a Publishub.

## Os 3 conceitos

| | Conceito | Gancho (0–2 s) | Retenção | Conversão |
|---|---|---|---|---|
| A | **Rewatch #47** | Contador "REWATCH #01 → #47" sobre uma timeline que volta ao zero sem parar | Escalada de dor (J/K/L, mensagem do cliente, "Somewhere.") com virada aos 5,7 s | Alta: a dor ("onde arrasta?") é exatamente o que o produto responde (o segundo) |
| B | **"Feels slow somewhere"** | Tela de chat: o cliente manda o feedback vago e o editor digita "where??" | Bom suspense, mas é parado: só texto até o produto | Média: o público se identifica, mas o gancho não mostra edição |
| C | **Manual vs. Publishub (split screen)** | Tela dividida, o editor caçando pausas × a análise pronta | Previsível: o formato "antes/depois" o público já viu muito | Média: pede números de tempo economizado que não temos medidos (não inventamos) |

**Escolhido: A.** Tem o gancho mais forte (um número subindo é movimento puro e um padrão que
o polegar reconhece). Abre na dor exata do editor freelancer, absorve o melhor do B (a mensagem
do cliente) e leva direto à promessa real do produto: trocar "em algum lugar" por um segundo
exato. Além disso, não depende de nenhuma métrica inventada.

## Roteiro

Texto na tela em inglês, como vai ao ar. Narração **opcional**: o render atual não tem voz.
Se o fundador quiser gravar, as falas cabem nos tempos abaixo.

| Tempo | Na tela | Narração opcional | Imagem |
|---|---|---|---|
| 0,0–2,0 | REWATCH **#01 → #47** · *of the same 40-second cut.* | "Rewatch number forty-seven." | Timeline de editor; o playhead volta ao zero sem parar; o contador acelera e bate no #47 |
| 2,0–3,1 | **Where does it drag?** | "Where does it drag?" | Teclas J · K · L pressionadas no ritmo; o playhead vai e volta |
| 3,1–4,3 | Chat do cliente: *"Love it!! It just feels slow somewhere."* / *"Can you tighten it before tonight?"* | — | Duas mensagens às 11:48 PM |
| 4,3–5,7 | **"Somewhere."** / *isn't a timestamp.* | "'Somewhere' isn't a timestamp." | Corte seco, tela preta, carimbo em caramelo |
| 5,7–6,7 | BEFORE REWATCH #48 · logo Publishub | "So before rewatch forty-eight…" | O logo se monta; zoom atravessando |
| 6,7–8,5 | 01 · UPLOAD — **Drop the cut.** | "Drop the cut." | Tela real "Send your video"; toque; aparece `client_cut_v7_FINAL.mp4` |
| 8,5–10,7 | 02 · ANALYSIS — **It watches every second.** | "It watches every second…" | Tela real "Analysis in progress"; as etapas acendem uma a uma |
| 10,7–14,7 | 03 · THE DROP — **The exact second they leave.** → **And the line you were saying.** | "…finds the exact second people leave, and the line you were saying." | Curva real com o ponto pulsando em **0:04 · they leave**; o cartão "Retention dropped here 0:04" sobe; marca-texto na frase |
| 14,7–18,2 | 04 · THE CUTS — **Dead moments, found.** → **You decide what goes.** | "It finds the dead moments. You decide what goes." | "publishub found 3 stretches to cut"; toque em **Accept all**; os três trechos se preenchem |
| 18,2–21,5 | 05 · EXPORT — **Apply. Edited video ready.** · **0:41 → 0:32** · *Your original stays untouched.* | "Apply, and the edited video's ready." | Toque em "Apply 3 cuts"; "9.3s out: 0:41 became 0:32." |
| 21,5–23,9 | **You're still the editor.** / *It just finds the dead moments.* | "You're still the editor. It just finds the dead moments." | Tela preta, tipografia |
| 23,9–27,0 | Logo · *See where your edit loses viewers.* · **Analyze your video free** · getpublishub.com · *No account · No card · Results in ~3 min* | "Analyze your video free, at getpublishub.com." | CTA pulsando; segura 3 s para o print |

## Storyboard: transições e som

| Cena | Transição de entrada | Som |
|---|---|---|
| Gancho | Abre já em movimento (sem fade) | Drone grave; um tique por número (afinação subindo); "zip" de fita a cada volta do playhead; **impacto + estalo** no #47, com clarão vermelho e tremor |
| J/K/L | Corte seco | Teclas secas no ritmo; bumbo abafado em semínimas (ansiedade) |
| Chat | As teclas e a timeline escurecem; as bolhas saltam | Duas notas de notificação por mensagem |
| "Somewhere." | Corte seco para o preto, clarão caramelo, tremor | **Boom** e silêncio; segundo golpe no "isn't a timestamp." |
| Virada | Fundo azul-noite; zoom atravessando na saída | Whoosh + riser até a entrada do produto |
| Produto | Clarão azul na batida; cada passo sobe e assenta, sai encolhendo | A batida entra (124 BPM, Am → F → C → G, bumbo, palma, hi-hats, baixo em colcheias); clique em cada toque; uma nota por etapa; sino na queda; marca-texto; três pops nos cortes aceitos; arpejo a partir dos cortes; três sinos no vídeo pronto |
| Fecho | A batida sai de uma vez | Boom suave, pad, um sino na segunda frase |
| CTA | Whoosh; o logo se monta | Fmaj9 → C, sinos em arpejo |

**Música:** eletrônica limpa, média-alta energia (124 BPM), menor no começo para a tensão, com
um respiro no fecho. Para trocar por uma música licenciada em alta no Instagram, poste o MP4
com o som original baixo e escolha a faixa no app. A sincronia visual segue a 124 BPM.

**Referências visuais (estilo, não cópia):** tipografia cinética palavra por palavra dos
vídeos de lançamento de SaaS; o "POV do editor" dos Reels de bastidor de edição; punch-ins
de câmera em interface; grão leve e vinheta para tirar o ar de propaganda.

## Para postar

- **Capa:** o quadro do #47 (1,4 s), ou o "Somewhere." (4,6 s).
- **Legenda:** "Rewatch #47 and the client still says it 'feels slow somewhere'. publishub
  shows the exact second viewers leave, the line you were saying, and the dead moments to cut.
  You decide what goes. Free test, no account: getpublishub.com"
- **Primeiro comentário:** "What's the most vague client feedback you've ever gotten? 👇"
  (puxa comentário do público de editores).
- **Hashtags (3–5):** #videoediting #videoeditor #contentcreator #ugccreator #reelstips
- **Variações para teste A/B** (só mudar `Words` no gancho): "Rewatch #47" × "Client: 'feels slow
  somewhere'" × "Where does it drag?" como primeira frase.

## Refazer

```sh
npm run render:editors      # trilha + render → ../publishub-reel-editors-1080x1920.mp4
npm run sound:editors       # só a trilha (depois de mexer em src/editors/timeline.json)
node scripts/stills.mjs EditorsReel out/editors 46 345 500 600 800   # quadros para revisão
```

| O quê | Onde |
|---|---|
| Cenas, layout e animação | `src/editors/Editors.tsx` |
| Tempo de tudo (animação e trilha leem o mesmo) | `src/editors/timeline.json` |
| Trilha e efeitos | `scripts/make-sound-editors.mjs` → `public/editors/soundtrack.wav` |
| Telas reais do produto | `public/editors/*.png`, geradas por `scripts/editors/capture.mjs` (instruções no topo do arquivo) |
