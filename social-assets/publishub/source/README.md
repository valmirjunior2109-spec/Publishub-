# Publishub · campanha "Better videos. ~~More hours.~~"

O código-fonte das duas peças sociais. Os PNGs finais ficam um nível acima,
em `social-assets/publishub/`.

| Arquivo | O que é |
| --- | --- |
| `instagram.html` | Feed do Instagram, 1080 × 1350 (4:5) |
| `x.html` | Post do X, 1600 × 900 (16:9) |
| `campaign.js` | **A copy**, o logo e o desenho da timeline, compartilhados pelas duas peças |
| `brand.css` | Tokens da marca (cores e fontes) e os estilos comuns |
| `render.mjs` | Exporta os PNGs com o Edge ou o Chrome em modo headless |
| `fonts/` | Geist e Geist Mono (as fontes do site), embutidas para renderizar offline |

## Exportar

```sh
cd social-assets/publishub/source
node render.mjs            # as duas peças
node render.mjs instagram  # só uma (instagram | x)
```

O script não precisa de `npm install`. Ele procura o Edge ou o Chrome nos caminhos
padrão; para usar outro: `BROWSER="C:\caminho\chrome.exe" node render.mjs`.
Ao terminar, confere se cada PNG saiu no tamanho exato.

Para ajustar o layout com o navegador, abra o `.html` direto (duplo clique). O
que você vê é o que o render exporta.

## Mudar

- **Copy:** o objeto `COPY` no topo de `campaign.js`. A frase é `keep` (o que
  fica) + `cut` (o que a caneta risca). O risco se ajusta sozinho ao tamanho do
  texto. No Instagram, `keep` precisa caber numa linha de 904 px; no X, as duas
  partes juntas precisam caber em 1408 px. Se não couberem, reduza o
  `font-size` de `.headline` no HTML da peça.
- **Timeline:** o array `CLIPS` em `campaign.js` (duração em segundos e
  `cut: true` para o trecho que sai). O primeiro trecho que fica vira o gancho, em
  destaque (creme no tema caramelo, azul no papel). As alturas ficam nos `data-*` do `<svg data-timeline>` de cada peça.
- **Cores:** `THEMES` e `THEME` em `campaign.js`. Hoje vale `"caramelo"`: o fundo
  na cor do caderno (`#C9824A`) e tudo em tinta. Para voltar ao papel creme com a
  caneta azul do site, troque para `THEME = "papel"`. Cada tema escolhe também a
  versão do logo.
- **Logo:** `LOGO` em `campaign.js` usa os mesmos números de
  `frontend/src/components/Logo.tsx`. `color` é o símbolo do site; `mono` é o
  mesmo desenho em uma cor só, recortado no fundo (o elástico, a borda das
  páginas e o contorno da caneta são o próprio caramelo). Se o desenho mudar no
  site, mude aqui também.

## Decisões

- **O caderno inteiro.** O fundo é o caramelo da capa do caderno do símbolo, e
  tudo é desenhado em tinta, como o logo em uma cor. O creme do papel aparece só
  no gancho da versão final. O azul da caneta sai deste tema porque perde
  contraste no caramelo. Ele continua no tema `papel`.
- **A frase é a própria edição.** No produto, a caneta risca o que sai do vídeo. A
  headline faz o mesmo: "More hours." é o trecho cortado. A anotação em mono usa
  a linguagem do plano de edição ("not worth the time it takes").
- **Timeline sem números inventados.** A régua tem timecodes, mas a peça não
  promete quanto tempo se economiza. O contorno tracejado mostra o espaço que o
  vídeo deixou de ocupar, sem métrica.
- **Cada formato com a sua leitura.** No Instagram (vertical), a frase vem
  empilhada, com o risco num bloco próprio. No X (horizontal), a frase corre numa
  linha e o risco chega no fim. A anotação fica sob as palavras riscadas, e a
  timeline usa a largura toda.
