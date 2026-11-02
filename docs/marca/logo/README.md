# Logos da publishub

Tudo nesta pasta sai de `gerar.py`, com o desenho de `frontend/src/components/LogoArt.tsx`
e o nome em Geist semibold convertido em contorno (não depende da fonte instalada).
Para mudar alguma coisa, mude o script e rode `python docs/marca/logo/gerar.py`.

Veja tudo de uma vez em `folha-de-logos.png`.

## Formatos

| Arquivo | Para quê |
| --- | --- |
| `publishub-horizontal-*` | Cabeçalho de site, assinatura de e-mail, apresentações, faixas |
| `publishub-vertical-*` | Espaços quadrados ou altos: capa, cartaz, slide de abertura, AppSumo |
| `publishub-simbolo-*` | Onde o nome já aparece ao lado ou não cabe: foto de perfil, favicon, marca d'água |
| `publishub-icone-app-*` | Ícone de app e foto de perfil quadrada (fundo cheio; o sistema arredonda os cantos) |

`svg/` para web e impressão (escala sem perder qualidade); `png/` com fundo transparente
para onde não aceita SVG (redes sociais, Canva, documentos).

## Cores

| Sufixo | Fundo certo |
| --- | --- |
| `cor` | Claro: creme, branco, papel. **A versão principal.** |
| `cor-fundo-escuro` | Escuro: tinta, preto, foto escura (caneta azul-clara, nome em creme) |
| `cor-fundo-azul` | O azul da marca (caneta e nome em creme) |
| `tinta` | Uma cor, para impressão em preto ou carimbo, sobre fundo claro |
| `branco` | Uma cor, sobre foto ou fundo escuro |
| `azul` | Uma cor, sobre fundo claro, quando o colorido briga com o resto |
| `caramelo` | Uma cor, sobre creme, em peças mais quentes |
| `creme-sobre-caramelo` | Uma cor, sobre o caramelo da marca |

## Regras rápidas

- Deixe em volta um espaço livre de pelo menos meia largura do caderno.
- Não estique, não gire, não troque as cores fora desta tabela, não ponha sombra.
- Tamanho mínimo: horizontal com 100 px (ou 25 mm) de largura; símbolo com 16 px.
- Em fundo com pouco contraste (foto clara e escura ao mesmo tempo), use `branco` ou `tinta`.
