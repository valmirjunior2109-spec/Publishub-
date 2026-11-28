# O novo rumo: vender o serviço feito à mão antes da plataforma

*Novembro de 2026. Documento de trabalho do Valmir.*

## Nome e frase

A marca continua **Publishub** (com o domínio getpublishub.com), mas o nome sempre vem com a frase: *"verifique se o seu app feito com IA continua funcionando, antes dos seus usuários"*. Os produtos têm nomes próprios: **Publishub Check** (o teste grátis), **Publishub Monitor** (a verificação diária) e **stillworks** (o motor open source). Detalhes em [`docs/marca/posicionamento.md`](../docs/marca/posicionamento.md).

## Por que mudar

| O que vimos | O que significa |
| --- | --- |
| 63 pessoas na waitlist, nenhuma resposta ao e-mail, alguns endereços falsos | A lista é pequena e de baixa intenção. Não prova que alguém pagaria. |
| O fórum do Cursor: 5 pessoas experientes descrevendo gambiarras para a mesma dor | O problema é real. Ninguém tem uma ferramenta pronta. |
| O `/check` só abre páginas públicas | Ele não testa a dor que vendemos (cadastro, login, checkout quebrados). |
| O produto pago ainda não existe | "Ainda não está disponível" é a maior barreira de conversão do site. |

**A decisão:** em vez de construir a plataforma e depois procurar clientes, entregar o serviço na mão para 3 a 5 clientes agora, aprender com eles e só então automatizar o que se repetir.

## A oferta

> Eu configuro os seus fluxos críticos (cadastro, login, checkout) e verifico o seu app a partir de agora. Se algo quebrar, eu te aviso com a prova do que falhou.

- **Para quem:** fundadores cujo app já tem **usuários pagantes**. Eles perdem dinheiro quando algo quebra e são os que pagam.
- **Quantos:** até 5 clientes no primeiro mês. É o que dá para atender bem sozinho.
- **Preço:** *a decidir* (veja "Decisões pendentes").

## Como entregar com o que já existe

1. **Os fluxos:** um repositório privado por cliente com o `journeys.config.ts` do stillworks. Os passos de login e checkout são Playwright.
2. **O agendamento:** uma GitHub Action com `schedule` (cron) rodando os fluxos todo dia, ou de hora em hora. O `action.yml` do stillworks já existe.
3. **O alerta:** quando a Action falha, o GitHub manda e-mail para você. Você confere se é um problema real e avisa o cliente com o `REPORT.md`.
4. **Os cuidados:** só leitura por padrão. Conta de teste fornecida pelo cliente. Pagamentos em modo de teste (cartões de teste do Stripe). Nada de escrever em produção sem combinar.

## De onde vêm os clientes

- **O pedido de verificação no relatório do `/check`:** "Este teste não abriu seu cadastro, login nem checkout. Pedir verificação do meu fluxo." Cada pedido chega no seu e-mail e aparece no `/admin` (painel *Verification requests*), com **quem tem usuários pagantes no topo**.
- **Os posts "quebrou depois de uma mudança da IA"** no Reddit, Indie Hackers e X: ajude primeiro e ofereça a verificação quando fizer sentido.
- **O tópico do fórum do Cursor:** volte com novidades do stillworks.

## Como responder um pedido

> Oi, aqui é o Valmir. Vi que você pediu para eu verificar o [fluxo] do [app].
>
> Para eu montar isso, preciso de: (1) uma conta de teste, se o fluxo tiver login, e (2) os passos que um usuário faz, do jeito que você descreveria para alguém.
>
> Eu configuro, rodo todo dia e te aviso se quebrar, com a prova do que falhou. [Condição: preço ou "grátis no primeiro mês em troca de feedback".]
>
> Pode ser?

## O que anotar em cada cliente

Isso vira o roadmap do stillworks e da Publishub:

- Tipo de login (e-mail e senha, Google, link mágico, 2FA) e quanto deu trabalho
- Quantas vezes um seletor quebrou depois de uma mudança da IA
- Alarmes falsos: quantos, e por quê
- O que o cliente perguntou que você não sabia responder
- O que o cliente disse quando o alerta chegou

## Métricas das próximas 4 semanas

| Métrica | Meta |
| --- | --- |
| Pedidos de verificação | 15 |
| Pedidos de quem tem usuários pagantes | 5 |
| Conversas reais (resposta por e-mail ou chamada) | 8 |
| Monitores diários confirmados | 20 |
| Clientes ativos no serviço feito à mão | 3 |
| Clientes que pagam (ou aceitam pagar depois do primeiro mês) | 1 a 2 |

Se, em 4 semanas, ninguém com usuários pagantes pedir a verificação, o problema não é o funil: é a oferta ou o público. Aí vale conversar com quem pediu para entender o que faltou.

## Próximos passos no produto

1. ✅ Pedido de verificação no relatório do `/check`, com a pergunta sobre usuários pagantes e o painel no `/admin`.
2. ✅ **Monitor diário das páginas públicas (beta, grátis):** a pessoa liga no relatório, confirma pelo e-mail e recebe alerta só quando aparece um problema novo. É o primeiro recurso contínuo de verdade, e cada monitor ativo é um usuário recorrente para conversar sobre os fluxos com login.
3. ⏳ Mudar o Founding Customers de "no lançamento" para "começa agora, configurado por mim", **depois** da decisão de preço e de você confirmar que vai entregar à mão.
4. ⏳ No stillworks: o baseline (só as falhas novas) e a proteção dos testes, sugeridos no fórum do Cursor. Reduzem os alarmes falsos do serviço.
5. ⏳ O que se repetir nos primeiros clientes (login com Google, link mágico…) vira recurso do stillworks.

## Decisões pendentes (do Valmir)

- [ ] Vou entregar o serviço na mão, a partir de agora, para até 5 clientes?
- [ ] Quanto cobro: o preço de fundador desde já, ou grátis no primeiro mês em troca de feedback?
- [ ] Com que frequência verifico: todo dia, ou de hora em hora?
- [ ] O limite de vagas é 10, como eu disse no Indie Hackers? (Se sim, vira a linha de escassez da página de Founding.)
