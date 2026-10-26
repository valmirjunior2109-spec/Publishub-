# Publishub · motion ad (16 s)

Os anúncios em vídeo da Publishub, em quatro composições do mesmo projeto
Remotion (React + TypeScript). Os MP4 finais ficam um nível acima, em
`social-assets/publishub-motion/`.

| Arquivo | Versão | Formato |
| --- | --- | --- |
| `publishub-instagram-reels-v2.mp4` | **v2**: Reel real analisado e re-editado | 1080 × 1920 (9:16), 30 fps, 16 s, H.264 + AAC |
| `publishub-x-v2.mp4` | **v2** | 1920 × 1080 (16:9), 30 fps, 16 s, H.264 + AAC |
| `publishub-instagram-reels.mp4` | v1: a tela do produto no caramelo | 1080 × 1920 (9:16), 30 fps, 16 s, H.264 + AAC |
| `publishub-x.mp4` | v1 | 1920 × 1080 (16:9), 30 fps, 16 s, H.264 + AAC |

## v2 em uma frase

Um Reel de receita de verdade (clipes do Mixkit, sem rostos) abre em tela cheia
com a introdução lenta; o polegar passa e ele some. Ele volta num celular, a
Publishub percorre o vídeo, a queda acende na alface, as sugestões chegam, e o
vídeo é re-editado na tela: a alface sai, o Reel abre na chama e ganha a legenda.
Tema escuro do site, caneta azul-clara, logo colorido. Código em `src/v2/`,
trilha em `scripts/make-sound-v2.mjs`, mapa de tempo em `src/v2/timeline.json`.
Origem e licença de cada clipe: `public/footage/CREDITS.md`.

## Demo do produto (48 s, 16:9)

`publishub-demo-en.mp4` e `publishub-demo-pt.mp4`, 1920 × 1080, 30 fps. Uma janela do
site só, passando pelo fluxo de verdade: envio do vídeo e do print → análise → o
segundo da queda, a frase e o porquê → o plano de correção → os cortes e o vídeo
editado → o logo. Uma legenda curta por passo, câmera que aproxima só na queda,
cursor só nos cliques. Textos da interface tirados de `frontend/messages/*.json`.

```sh
npm run render:demo       # gera a trilha e renderiza inglês e português
npm run render:demo-en · render:demo-pt
```

| O quê | Onde |
| --- | --- |
| Textos (inglês e português) | `src/demo/copy.ts` |
| Tempo de tudo | `src/demo/timeline.json` (lido pela animação e pela trilha) |
| Telas, câmera e cursor | `src/demo/Demo.tsx` |
| O logo atual (desenho de LogoArt.tsx) | `src/demo/Brand.tsx` |
| Trilha | `scripts/make-sound-demo.mjs` (`npm run sound:demo`) |

## Founder · Valmir construindo em público (21,6 s, 9:16)

`founder-build-in-public.mp4`, 1080 × 1920, 30 fps, H.264 + AAC. Marca pessoal do
fundador, sem rosto. Tudo o que aparece é verdade e vem do repositório ou do site:
os commits por hora são os do Valmir no main (fuso de Salvador), as mensagens do log
são as reais, e a apresentação é a da faixa do fundador da landing (`Landing.founder`,
`frontend/src/content/founder.ts`). Tema escuro do site de noite, o creme de dia;
Fraunces, Geist e Caveat.

| Tempo | Cena | Texto na tela |
| --- | --- | --- |
| 0–3 s | o log real rolando, a linha das 02:34 acende | Most of my startup was written *after 8 PM.* |
| 3–7 s | os commits por hora do dia, de verdade | Evenings *and lunch breaks.* · 112 of my 164 commits |
| 7–11 s | o primeiro commit (10 set. 2026), 252 commits e 73 pull requests | I’m *Valmir.* Self-taught developer *and UGC creator.* |
| 11–15 s | o dia nasce: o logo e a curva de retenção do exemplo | See where your edit *loses viewers.* |
| 15–18 s | um commit real em português e os 11 idiomas do site | My commits are *in Portuguese.* My product speaks *11 languages.* |
| 18–21,6 s | assinatura com o arco caramelo | Building *in public.* · Valmir · @valmir.pdf · Salvador, Bahia → the world |

Os números são de 26 out. 2026: para atualizar, refaça as contas com `git log` e troque
`HOURS`, os contadores e o log em `src/founder/Founder.tsx`.

## Publishub · aquisição (21 s, 9:16)

`publishub-acquisition-reels.mp4`, 1080 × 1920, 30 fps, H.264 + AAC. Para Reels, TikTok e
Shorts: dor → o segundo exato → o porquê → o plano → o vídeo novo → o convite. A interface,
os textos e o plano (com o selo "example", como no site) são os da landing; o Reel do exemplo
é uma mesa de edição desenhada (`src/acquire/DeskReel.tsx`), sem ninguém em cena.

| Tempo | Texto na tela |
| --- | --- |
| 0–2,8 s | You spent hours on this edit. *They left at 0:04.* |
| 3–6,4 s | Publishub shows you *the exact second.* |
| 6,6–9,5 s | And *why.* · try this instead |
| 9,7–13,9 s | Then *what to cut.* (dois Accept clicados) |
| 14–17 s | Accept the cuts. *Get the new edit.* · 0:34 → 0:24 · Export video |
| 17–21 s | See where your edit *loses viewers.* · Analyze your video for free · getpublishub.com |

```sh
npm run render:founder    # trilha + ../founder-build-in-public.mp4
npm run render:acquire    # trilha + ../publishub-acquisition-reels.mp4
```

| O quê | Onde |
| --- | --- |
| Cenas e textos | `src/founder/Founder.tsx`, `src/acquire/Acquire.tsx` |
| Tempo de tudo | `src/founder/timeline.json`, `src/acquire/timeline.json` (lidos pela animação e pela trilha) |
| Trilhas | `scripts/make-sound-founder.mjs`, `scripts/make-sound-acquire.mjs` |
| Fraunces, Caveat e as palavras que entram | `src/components/Type.tsx` (fontes em `public/fonts`, as do site) |

## Rodar

```sh
cd social-assets/publishub-motion/source
npm install
npm run studio        # abre o Remotion Studio para ver e ajustar ao vivo
npm run render:v2     # v2: gera a trilha e renderiza Reels e X
npm run render        # v1: gera a trilha e renderiza Reels e X
npm run render:reels-v2 · render:x-v2 · render:reels · render:x   # um de cada vez
```

Na primeira vez, o Remotion baixa o navegador headless dele (cerca de 120 MB).
No npm 11 aparece um aviso sobre o script de instalação do esbuild; pode ignorar,
porque o binário do Windows vem como dependência opcional.

## Onde mudar o quê

| O quê | Onde |
| --- | --- |
| Copy do anúncio (hook, headlines, CTA, oferta) | `src/theme.ts` → `COPY` |
| Textos da interface (plano, curva, frase) | `src/theme.ts` → `UI` (vêm de `frontend/messages/en.json`) |
| Cores | `src/theme.ts` → `C` (as de `frontend/src/app/globals.css`) |
| **Tempo de tudo** (quando cada coisa entra) | `src/timeline.json`, lido pela animação **e** pela trilha |
| Trilha sonora | `scripts/make-sound.mjs` (sintetizada; rode `npm run sound` depois de mexer no tempo) |
| Layout de cada formato | constante `L` no topo de cada cena (`vertical` e `horizontal`) |
| Câmera da cena do produto | `keys` em `src/scenes/Product.tsx` |

## Estrutura

```
src/
  Ad.tsx                  o anúncio: as cenas nos quadros de timeline.json + a trilha
  Root.tsx                as duas composições (Reels e X) e as fontes
  timeline.json           o mapa de tempo, compartilhado com o som
  theme.ts                cores, copy, textos da interface e a curva do exemplo
  anim.ts                 curvas de easing e helpers de interpolação
  components/
    Logo.tsx              o símbolo (mono e colorido) e o logo completo, com animação de montagem
    Words.tsx             tipografia cinética (palavra por palavra, com máscara)
    ProductWindow.tsx     a tela de análise do produto, com estados por quadro
    RetentionCurve.tsx    a curva de retenção do site, animada
    ReelFrame.tsx         o Reel de exemplo da landing
    EditorTimeline.tsx    a timeline de editor da abertura
    ui.tsx                Badge e botão, nas medidas do site
  scenes/
    Hook.tsx              0–3 s    o problema
    Product.tsx           3–12 s   a marca, a janela e a demonstração
    EndCard.tsx           12–16 s  o fechamento e o CTA
scripts/
  make-sound.mjs          a trilha (48 kHz, estéreo), gerada do zero
  stills.mjs              exporta quadros soltos para revisão
  contact-sheet.cjs       junta quadros numa folha de contato
public/
  fonts/                  Geist e Geist Mono (as do site)
  soundtrack.wav          a trilha gerada
```

## Fidelidade ao produto

- A interface é a do site, portada de `HeroProduct.tsx`, `RetentionCurve.tsx`,
  `ReelFrame.tsx`, `Badge.tsx` e `Section.tsx`, com os mesmos textos, tamanhos e cores.
- Os dados são o **exemplo da landing** (a análise `no-coffee-30-days`, a queda em
  0:04, −32% em 2 segundos, o plano com 3 sugestões). A curva é gerada pela mesma
  função de `frontend/src/lib/fixtures.ts`. A janela e o Reel mostram o selo
  "Example", como no site.
- O CTA usa a oferta que está no site hoje: "Free analysis · No account required".
- Nenhuma métrica, depoimento ou resultado foi inventado.

## Trilha

Sintetizada por código (`scripts/synth.mjs` é o motor; `make-sound.mjs` e
`make-sound-v2.mjs` são as partituras): nenhuma amostra gravada e
nenhuma música de terceiros. Cada som cai no quadro do gesto que o acompanha. O
anúncio também funciona sem som: toda a mensagem está na tela.

## Imagens da v2

Os clipes são do Mixkit, sob a Mixkit Stock Video Free License, que permite uso
comercial, inclusive em anúncios online, sem atribuição obrigatória. Foram
escolhidos clipes sem rosto identificável (mãos, comida, fogo), para a peça não
sugerir que uma pessoa real recomenda a Publishub. A análise mostrada sobre eles
é ilustrativa e leva o selo "Example".

## Licença do Remotion

O Remotion é gratuito para pessoas físicas e empresas de até 3 pessoas. Acima
disso, é preciso uma licença de empresa (remotion.pro).

## Talking head (o vídeo do fundador editado)

`output/publishub-talking-head-final.mp4` (na raiz do repositório): 1080 × 1920, 30 fps, 47,2 s, H.264 + AAC 320k.
O vídeo original (`publishub-videos/`) cortado nas três pausas longas, com câmera virtual
(punch-ins nas frases-chave, reenquadramento nos cortes), legendas sincronizadas com a
fala, os cartões do produto, efeitos sonoros e a voz isolada (DeepFilterNet). Começa
direto na fala e termina no "valeu?". Código em `src/talking/`.

| O quê | Onde |
| --- | --- |
| Preparar vídeo e voz (upscale, voz isolada, cortes, -14 LUFS) | `scripts/talking-prepare.sh` |
| Efeitos sonoros (clique, pops, marca-texto, whooshes) | `scripts/make-sound-talking.mjs` → `public/talking/sfx.wav` |
| Transcrição palavra a palavra (faster-whisper large-v3) | `scripts/talking-transcribe.py` → `src/talking/transcript.raw.json` |
| Tempos no vídeo editado + correções de texto | `scripts/talking-remap.py` → `src/talking/words.json` |
| Páginas de legenda, ênfases e câmera | `src/talking/timeline.ts` |
| Renderizar | `npm run render:talking` |

## Reels de 38 s para conversão (Ad38)

`publishub-instagram-reels-38s-sem-voz.mp4` (um nível acima; cópia em `output/publishub-reel-38s-sem-voz.mp4`):
1080 × 1920, 30 fps, 38,5 s, H.264 + AAC 48 kHz, −14 LUFS. Código em `src/ad38/`.
**Versão final: sem narração e sem legendas** — só música e efeitos; a mensagem está nos
títulos da tela. (A versão antiga com voz sintética ficou em `publishub-instagram-reels-38s.mp4`.)

**Tudo que aparece dentro da tela é captura real do getpublishub.com.** Um Reel de
demonstração em inglês (clipes do Mixkit + voz sintética, com abertura lenta e uma pausa
de 2 s de propósito) foi enviado ao teste grátis, sem conta, num Edge headless em tamanho
de celular. A gravação do envio, a análise em andamento, o resultado (queda em 0:00 em
"Hi, everyone.", o porquê, o plano com impacto 10/10 e 9/10) e o "Mark as done" são da
página real: análise `7696733e-f59c-4521-9155-5e06b1f03fee`. Só o editor (de quem criou o
Reel) é desenhado, com as miniaturas e a forma de onda reais do Reel de demonstração; o
corte que ele aplica é exatamente o das sugestões 01 e 02.

| Etapa | Onde |
| --- | --- |
| Voz (Kokoro-82M, Apache-2.0, local) | `scripts/ad38/say.py` → `public/ad38/vo/` · modelo em github.com/thewh1teagle/kokoro-onnx (releases) |
| Reel de demonstração | `scripts/ad38/build-demo.sh` → `public/ad38/demo-reel.mp4` |
| Gravar o teste grátis real | `scripts/ad38/record.mjs` (envio + análise) e `capture2.mjs` (página inteira, "Mark as done") |
| Palavras com tempo (faster-whisper large-v3) | `scripts/ad38/words.py` → `ad38-src/*.json` |
| Materiais (Reel editado, miniaturas, onda, legendas) | `scripts/ad38/prepare.py` |
| Música e efeitos (sintetizados) | `npm run sound:ad38` → `public/ad38/music.wav`, `sfx.wav` |
| Mixagem (música + efeitos, −14 LUFS) | `python scripts/ad38/mix.py <ffmpeg> sem-voz` → `public/ad38/mix.wav` |
| Tempo de tudo | `src/ad38/timeline.json` (animação, som e mix leem o mesmo arquivo) |
| Renderizar | `npm run render:ad38-sem-voz` |

