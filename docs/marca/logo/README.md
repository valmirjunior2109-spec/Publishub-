# Logo da Publishub

O "P" em pixel art com uma tela `</>`, a sombra índigo, a estrela e o cursor. No nome, o "P" é a própria logo: **[P]ublishub**, em Pixelify Sans.

É a mesma arte do site. A fonte da verdade é `frontend/scripts/brand-logo.mjs`, que gera `frontend/src/lib/brand/logo-art.ts` (usado pelo componente `Logo` e pelas imagens de prévia) e o favicon `frontend/src/app/icon.svg`. Os arquivos desta pasta foram exportados dessa arte (os SVGs) e do próprio site (os PNGs). Se a arte mudar, gere de novo a partir dela; não edite os arquivos à mão.

Veja tudo de uma vez em `folha-de-logos.png`.

## Arquivos

| Arquivo | Para quê |
| --- | --- |
| `png/publishub-com-frase-*` | **A versão principal** onde a pessoa ainda não conhece a marca: capa de perfil, slide de abertura, post de lançamento. O nome sempre com a frase. |
| `png/publishub-horizontal-*` | Onde a frase já aparece perto ou não cabe: cabeçalho, assinatura de e-mail, rodapé de slide |
| `svg/` e `png/publishub-simbolo-*` | Onde o nome não cabe: favicon, marca d'água, ícone pequeno |
| `svg/` e `png/publishub-icone-app-*` | Foto de perfil e ícone de app (fundo cheio; o sistema arredonda os cantos) |

`fundo-escuro` ou `escuro`: "P" branco com a tela preta, para fundo escuro (o tema padrão do site).
`fundo-claro` ou `claro`: "P" preto com a tela branca, para fundo claro.

## Cores

| Uso | Escuro (padrão) | Claro |
| --- | --- | --- |
| Fundo | `#020002` | `#FFFFFF` |
| Texto | `#FFFFFF` | `#020002` |
| Texto secundário | `#A9AAC2` | `#4B4C63` |
| Índigo (marca, botões, links) | `#6E74F7` | `#4A50D9` |
| Sombra do "P" | `#4A50D9` | `#4A50D9` |
| Falha | `#FF6B75` | `#B42318` |
| Ok | `#57D98C` | `#0F6B3B` |
| Aviso | `#FFBF69` | `#8A5300` |

As cores completas (fundos de cartão, bordas) estão em `frontend/src/app/globals.css`.

## Fontes

- **Pixelify Sans:** o nome, rótulos curtos e números de destaque. Nunca em texto corrido.
- **Geist:** todo o texto.
- **Geist Mono:** código, URLs e evidências de erro.

## Regras rápidas

- **O nome não aparece sozinho** onde a pessoa ainda não conhece a marca: use a versão com a frase, ou escreva a frase logo abaixo. Veja `docs/marca/posicionamento.md`.
- Não estique, não gire, não troque as cores fora desta tabela e não ponha sombra além da que a arte já tem.
- Pixel art só fica nítida em múltiplos inteiros: prefira o SVG; em PNG, não redimensione para tamanhos quebrados.
- Tamanho mínimo: símbolo com 16 px; versão horizontal com 120 px de largura (abaixo disso a tela `</>` some).
