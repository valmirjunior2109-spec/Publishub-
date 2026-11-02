# Filmes curtos, um para cada público

No mesmo estilo do filme de lançamento (`src/film/CRIATIVO.md`): as telas reais em 3D, cartões de uma frase digitada e cortes no
tempo de uma música de verdade. Cada filme é uma lista de cenas em `specs.json`, em tempos da música.

| Filme | Formato | Público | Música | Ideia |
|---|---|---|---|---|
| `publishub-reel-algorithm-1080x1920.mp4` | 9:16, 26 s | Criadores | House 02 (123 BPM) | "Stop blaming the algorithm. It's probably one line." |
| `publishub-reel-client-1080x1920.mp4` | 9:16, 28 s | Editores | Pop Track 03 (109 BPM) | "Love it, but it feels slow somewhere." "Where, exactly?" |
| `publishub-agencies-1920x1080.mp4` | 16:9, 42 s | Agências | Motivating Mornings (121 BPM) | "Every client video looks fine until the numbers come in." |

Em 9:16, o conteúdo fica entre y≈300 e y≈1450, fora do que o Instagram e o TikTok cobrem. A frase do cliente é uma cena ilustrativa,
não um depoimento, e as telas da análise têm o selo EXAMPLE ANALYSIS.

## Refazer

Com as capturas prontas (`src/film/CRIATIVO.md`):

```
node scripts/film/plates.cjs
node scripts/film/get-audio.mjs
npm run sound:shorts
npm run render:short-creators
npm run render:short-editors
npm run render:film-agencies
```
