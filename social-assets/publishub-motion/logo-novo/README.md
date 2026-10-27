# Logo novo da Publishub (o dos vídeos)

O caderno com a caneta, como em `frontend/src/components/LogoArt.tsx`, com uma diferença: a borda
das páginas (a faixa creme) vai até o fim da capa e passa inteira por baixo da caneta e do
elástico. É o mesmo desenho do fim da animação (`source/src/logo/NotebookLogo.tsx`).

| Arquivo | O quê |
| --- | --- |
| `publishub-simbolo.svg` · `.png` | o símbolo, fundo transparente, para fundos claros |
| `publishub-simbolo-escuro.svg` · `.png` | o símbolo com a caneta clara (#8FAAF0, a do tema escuro do site), para fundos escuros |
| `publishub-horizontal.png` | símbolo + nome em tinta (#1E1B18), fundo transparente, para fundos claros |
| `publishub-horizontal-escuro.png` | símbolo + nome em creme (#F4ECDF), fundo transparente, para fundos escuros |

As animações do logo ficam um nível acima (`publishub-logo-*.mp4` e `publishub-logo-transparente.mov`,
fora do git): `npm run render:logo` em `source/`.
