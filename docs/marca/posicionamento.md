# Publishub · posicionamento, nome e voz

O documento de referência da marca: o que a Publishub é, para quem, como os nomes se organizam e como ela fala. Vale para o site, o produto, os e-mails, o README do stillworks e as redes.

*Atualizado em novembro de 2026. Substitui a versão anterior, que era de outro produto (um editor de vídeos curtos).*

---

## 1. Em uma frase

**A Publishub verifica se o app que você criou com IA continua funcionando, e avisa antes que os seus usuários descubram.**

> *Check that your AI-built app still works, before your users do.*

## 2. O nome e a frase da marca

"Publishub", sozinho, não diz o que o produto faz: lembra "publicar conteúdo". Por isso **o nome nunca aparece sozinho onde a pessoa ainda não conhece a marca** (rodapé, prévias de link, perfis, posts de lançamento, README). Ele vem sempre com a frase:

| Idioma | Frase da marca |
| --- | --- |
| Inglês | **Publishub: check that your AI-built app still works, before your users do.** |
| Português | **Publishub: verifique se o seu app feito com IA continua funcionando, antes dos seus usuários.** |

**O sentido do nome:** *publish* é o momento de publicar, de dar deploy. A Publishub é o ponto de checagem antes, e depois, de cada publicação.

No código, a frase está em `SITE_TAGLINE` (`frontend/src/lib/site.ts`).

## 3. A família de nomes

Um nome por coisa que a pessoa usa. Todos levam "Publishub", menos o motor open source, que já tem nome próprio no npm e no GitHub.

| Nome | O que é | Estado |
| --- | --- | --- |
| **Publishub Check** | O teste grátis (`/check`): abre as páginas públicas num navegador real e lista crashes, requisições que falham e páginas quebradas. Só leitura. | Disponível |
| **Publishub Monitor** | Repete o Check todo dia e manda e-mail só quando aparece um problema novo. Ligado pelo relatório, com confirmação por e-mail. | Beta, grátis |
| **Founding Customers** | A reserva da versão completa: os fluxos críticos configurados 1:1 pelo fundador. US$ 0 hoje, nada cobrado antes do lançamento. | Reserva aberta |
| **stillworks** | O motor open source (MIT) por trás da Publishub: CLI e servidor MCP que o próprio dev roda, no terminal ou pelo agente. | Disponível |

Em código (`PRODUCT_NAMES` em `site.ts`). Regras de escrita:
- **Publishub** com P maiúsculo e o resto em minúsculas, nunca "PublisHub" ou "PUBLISHUB".
- **stillworks** sempre em minúsculas, como o pacote no npm. Para apresentar: *"stillworks, o motor open source da Publishub"*.
- Em português, "a Publishub" (a marca, a plataforma). "O Publishub Check" e "o Publishub Monitor" (as ferramentas).

## 4. O problema

Ferramentas como Claude Code, Cursor, Codex, Lovable, Bolt e v0 escrevem código rápido. Mas uma mudança pode compilar, passar no lint e nos testes, e ainda quebrar o cadastro, o login, um formulário ou o checkout, muitas vezes num arquivo que a IA nem devia ter mexido.

Quem decide se a mudança funcionou costuma ser o mesmo agente que a escreveu, e ele sempre diz "pronto". No fim, quem descobre o problema é o usuário.

**O argumento central:** a verificação precisa ser **independente de quem escreveu o código**.

## 5. Para quem

- **Principal:** fundadores solo e times pequenos cujo app **já tem usuários pagantes**. Eles perdem dinheiro quando algo quebra.
- **Também:** indie hackers, quem faz vibe coding e quem usa Lovable, Bolt ou v0 sem terminal nem CI.
- **Para o stillworks:** devs que usam Claude Code ou Cursor e preferem rodar no próprio ambiente.

## 6. O que a Publishub não é

- Não é um scanner de segurança: não procura vazamentos de dados nem vulnerabilidades.
- Não escreve nem corrige código: mostra o que quebrou, e quem corrige é você ou o seu agente.
- Não substitui testes automatizados: é uma camada externa e independente.
- Não promete "zero bugs", "QA completo" nem "monitoramento 24/7".

## 7. O que existe e o que não existe

| Disponível hoje | Em desenvolvimento |
| --- | --- |
| Publishub Check (páginas públicas, só leitura) | Jornadas com login (cadastro, login, checkout) |
| Publishub Monitor (diário, páginas públicas, beta) | Verificação depois de cada deploy |
| Relatório para o agente de IA e "testar de novo" com comparação | Painel do cliente |
| Pedido de verificação manual ao fundador | Alertas de fluxos com login |
| stillworks (open source) | |

**Regra:** nunca escreva como se o que está na coluna da direita já existisse. Use "em desenvolvimento" ou "planejado".

## 8. Voz

- **Uma pessoa, não uma empresa.** Fale como Valmir ("eu respondo pessoalmente"), não como "nossa equipe".
- **Honesta sobre o estágio.** "Beta", "pré-lançamento", "em desenvolvimento".
- **Concreta.** "Seu cadastro quebrou" em vez de "regressões funcionais".
- **Sem atacar ferramentas.** O problema é de qualquer ferramenta de IA, não de uma.
- **Sem expor ninguém.** Nunca mostre o app, a URL ou o print de outra pessoa sem permissão.

**Mensagem principal do site:** *Não deixe o próximo bug ser descoberto pelo seu usuário.*

## 9. Identidade visual

O "P" em pixel art com a tela `</>` em índigo, Pixelify Sans no nome, Geist no texto e fundo quase preto. Arquivos, cores e regras em [`logo/README.md`](logo/README.md).
