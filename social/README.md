# Publishub · posts das redes

O texto de cada post fica num JSON em `content/`. O layout está nos templates HTML/CSS. Um script com Playwright transforma cada slide em PNG na pasta `out/`.

## Criar um post novo

1. Copie o JSON mais parecido com o que você quer, em `content/`, e dê outro nome ao arquivo.
2. Troque o `id` (ele vira o nome do PNG) e edite o texto.
3. Rode na raiz do repositório:

   ```sh
   npm --prefix social install   # só na primeira vez
   npm run social                # todos os posts
   npm run social -- antes       # só os posts com "antes" no id
   ```

4. Abra os PNGs em `out/`. `out/_folha-de-contato.png` mostra todos de uma vez.

O script confere cada slide e termina com erro quando um texto:
- não cabe na caixa;
- sai da área segura do story;
- se sobrepõe a outro texto;
- fica abaixo do tamanho mínimo (64 px em título, 32 px em corpo).

Antes de dar erro, ele encolhe o texto até esses pisos. Se mesmo assim não couber, encurte o texto no JSON. A saída também lista os placeholders que ainda faltam trocar.

Ele usa o Chrome instalado na máquina. Sem Chrome, rode `npx playwright install chromium` dentro de `social/`.

## Marcação no texto

| Escreva | Sai como |
| --- | --- |
| `*palavra*` | ênfase: itálico caramelo no título, negrito no corpo |
| `==trecho==` | marca-texto caramelo |
| `[NÚMERO REAL]` | placeholder destacado em caramelo tracejado, para não ser postado sem trocar |

Nunca invente métrica, depoimento ou número de cliente. Onde precisar de um dado que você ainda não tem, escreva um placeholder entre colchetes.

## Formatos (`"format"`)

| Formato | Tamanho | Slides |
| --- | --- | --- |
| `carousel` | 1080 × 1350 | 5 a 8, começando com `cover` e terminando com `cta` |
| `post` | 1080 × 1350 | 1 |
| `story` | 1080 × 1920 | 1. O topo (280 px) e a base (360 px) ficam livres para a interface do Instagram |
| `x` | 1600 × 900 | 1 |

`"footer"` é o texto do rodapé, por exemplo `@valmir.pdf` ou `getpublishub.com`. A marca "Publishub" aparece sempre no canto superior esquerdo.

## Layouts (`"layout"` de cada slide)

| Layout | Campos | Para quê |
| --- | --- | --- |
| `cover` | `kicker`, `title`, `lead` | capa do carrossel |
| `text` | `kicker`, `title`, `paragraphs[]` | uma ideia por slide |
| `steps` | `kicker`, `title`, `items[{title, text}]` | passos numerados |
| `chart` | `kicker`, `title`, `chart`, `rows[{label, value, accent}]`, `note` | **previsão cega**: o gráfico de retenção |
| `beforeAfter` | `kicker`, `title`, `before{label, text}`, `after{label, text}`, `why` | **antes → depois** do roteiro |
| `mistake` | `kicker`, `title`, `example{label, text}`, `sections[{label, text}]`, `note` | **erro comum** |
| `stat` | `kicker`, `value`, `valueLabel`, `title`, `paragraphs[]` | **build in public** (feito para o X) |
| `cta` | `kicker`, `title`, `price{value, note}`, `items[]`, `lead`, `url`, `fine` | **CTA Fundador** e o fim de todo carrossel |

### O gráfico de retenção

```json
"chart": {
  "tag": "Retenção · curva ilustrativa",
  "duration": 34,
  "points": [[0, 100], [3, 93], [4, 74], [10, 59], [34, 37]],
  "markers": [
    { "at": 4, "kind": "predicted", "label": "PREVISÃO · 0:04" },
    { "at": 4, "kind": "actual", "label": "INSIGHTS · 0:04" }
  ]
}
```

- `points`: pares `[segundo, % de retenção]` lidos no Insights.
- `predicted`: a aposta, em tracejado.
- `actual`: o que o Insights mostrou, em caramelo, com um ponto na curva.
- A curva passa pelos pontos sem inventar picos entre eles.
- Enquanto a curva não vier de dados reais, deixe "ilustrativa" no `tag`. Quando trocar pelos pontos do Insights, troque o `tag` também.

O componente é `lib/retention-chart.js` e pode ser usado sozinho: `retentionChart({ points, duration, markers, width, height })` devolve um `<svg>`.

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `tokens.css` | cores, fontes, escala de tipo e espaçamento (as cores são as do site) |
| `base.css` | a página de caderno (fio de margem, grão) e os componentes |
| `templates/*.html` | um por formato |
| `lib/render-post.js` | monta cada layout a partir do JSON, encaixa o texto e confere |
| `lib/retention-chart.js` | o gráfico de retenção em SVG |
| `render.mjs` | o render com Playwright (`npm run social`) |
| `fonts/` | Fraunces (títulos, licença OFL em `OFL-Fraunces.txt`), Geist e Geist Mono (as do site) |
| `assets/logo.svg` | o logo do site (`frontend/src/app/icon.svg`) |

## Direção visual

Cada post é uma página do caderno do logo: papel creme com um grão leve e um fio de margem caramelo onde o editor anota. Os títulos usam a serifa Fraunces, o corpo usa a Geist e os timecodes usam a mono, como no produto.

Há um único acento: o caramelo da capa do caderno. O azul da caneta fica só no logo. Não tem gradiente, foto de banco nem emoji.
