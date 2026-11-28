# Playbook de crescimento: lista de espera e Founding Customers

> **Nomes e frase da marca (novembro de 2026).** O nome sempre vem com a frase: *"Publishub: verifique se o seu app feito com IA continua funcionando, antes dos seus usuários."* (em inglês: *"Publishub: check that your AI-built app still works, before your users do."*). O teste grátis é o **Publishub Check**, a verificação diária é o **Publishub Monitor** e o motor open source é o **stillworks** (minúsculas). Regras completas em [`docs/marca/posicionamento.md`](../docs/marca/posicionamento.md).

**A definição:** a Publishub não testa o software de ninguém. **Quem constrói testa o próprio app**, sozinho, vê o resultado com os próprios olhos e passa a confiar. A evidência vem de quem usa; a credibilidade vem de ser transparente e de ter um rosto por trás.

**Para quem:** pessoas que criam aplicações por conta própria, com Lovable, Bolt, v0, Cursor ou Claude Code: indie hackers, fundadores solo, quem está construindo o primeiro produto. Sem time de QA, sem ninguém para perguntar "isso ainda funciona?".

Os textos para postar estão em inglês (o idioma do site); as explicações, em português.

---

## O que está no site para isso

| Peça | Onde | O que faz pela confiança |
| --- | --- | --- |
| **"A night you might recognize"** | Home, logo depois do problema | A noite de quem constrói sozinho: a IA diz "pronto", você publica, e de manhã um usuário avisa que o cadastro não funciona. A pessoa se reconhece antes de qualquer argumento técnico. |
| **Nota do fundador** | Home, antes dos preços | Um rosto, um nome e um e-mail que chega a você. Para quem constrói sozinho, confiar numa pessoa é mais fácil que confiar numa marca. **Revise o texto: ele fala em seu nome.** |
| **Publishub Check** (o teste grátis) | `/check` | A pessoa testa o **próprio** app em cerca de um minuto. O relatório começa com uma frase humana ("Good news: you found it before your users did") e termina no convite para a lista e para o Founding Customers. |
| **"It looks. It never touches."** | `/check` | Só lê páginas públicas; nunca faz login nem envia formulários; o relatório é privado por link e não vai para o Google; dá para apagar a qualquer momento. |
| **Publishub Monitor** (beta) | Relatório do `/check` | Quem testou liga a verificação diária: confirma pelo e-mail e recebe alerta só quando aparece um problema novo. Cada monitor ativo é alguém que volta, e com quem dá para conversar sobre os fluxos com login. |
| **Pedido de verificação** | Relatório do `/check` | "Este teste não abriu seu cadastro, login nem checkout": a pessoa pede ao Valmir para verificar um fluxo. Chega por e-mail e aparece no `/admin` com quem tem usuários pagantes no topo. Veja [`novo-rumo.md`](novo-rumo.md). |
| **Números de quem usa** | Home e `/check` | "X apps checked by the people who built them. Y% had at least one failure." Só contagens, nada que identifique um app. Aparece sozinho depois dos primeiros 25 testes. |
| **Indicações** | Depois da inscrição | Posição na fila e link pessoal: cada amigo que entra sobe a pessoa 10 posições. |

No `/admin`, o painel "Waitlist" mostra: testes feitos, a conversão teste → inscrição, inscrições por indicação e quem mais indicou.

---

## Os três princípios

1. **Mostre, não prometa.** O Publishub Check e o Publishub Monitor existem hoje. Todo post leva para algo que a pessoa pode usar agora, no próprio app, e não só para "entre na lista".
2. **Seja uma pessoa.** Poste como Valmir, não como "a Publishub". Conte o que está construindo, o que deu errado, o que aprendeu. Responda todo mundo.
3. **Nunca exponha o app de ninguém.** Não poste print, URL ou resultado do app de outra pessoa. Se alguém compartilhar o próprio resultado, agradeça e compartilhe o post *dela*.

---

## 1. A história como conteúdo (a peça mais forte)

A noite das 23h48 é universal para quem constrói sozinho. Use-a como post de abertura.

**X / LinkedIn / Threads:**

> 11:48 PM — You ask the AI for one small change. It says "Done. Everything works."
> 11:52 PM — You deploy. Looks fine. You go to sleep.
> 8:15 AM — A user emails: "I tried to sign up three times. Nothing happens."
>
> If you build alone, you've lived this.
>
> I'm building Publishub so you find out before your users do. You can check your own app for free today, in about a minute:
> https://getpublishub.com/check?utm_source=x&utm_medium=social&utm_campaign=night_story

Varie com outras "noites" reais que as pessoas contarem para você (com permissão).

## 2. Build in public, como pessoa (3 posts por semana)

- **Segunda: o que estou construindo.** Uma decisão do produto e o porquê ("decidi que o teste nunca faz login, e aqui está o motivo").
- **Quarta: o que os números dizem.** Os números agregados do `/check` ("esta semana, 140 pessoas testaram o próprio app; 38% acharam pelo menos uma falha; a mais comum foi uma requisição falhando"). Só contagens, nunca apps.
- **Sexta: uma pergunta para quem constrói.** "Qual foi o bug que um usuário te contou antes de você descobrir?" As respostas viram histórias e conversas.

Os dados de mercado em [pesquisa-evidencias.md](pesquisa-evidencias.md) servem de apoio (sempre com a fonte). Não são o centro: o centro é a experiência de quem constrói.

## 3. Estar onde quem constrói sozinho conversa

- **Reddit:** r/lovable, r/boltnewbuilders, r/cursor, r/ClaudeAI, r/vibecoding, r/SideProject, r/indiehackers. Participe das conversas sobre "a IA quebrou meu app". Quando fizer sentido, sugira: *"you can check it yourself for free here"*. Siga a regra de cada sub sobre autopromoção.
- **Discords e comunidades** (Lovable, Build Club, Indie Hackers): peça permissão aos moderadores para oferecer o `/check` como recurso grátis para os membros.
- **Indie Hackers:** um post "Building in public: a safety net for people who ship alone with AI", contando por que você está construindo.

Links com UTM (troque `SUB` pelo nome do sub ou da comunidade):
`https://getpublishub.com/check?utm_source=reddit&utm_medium=community&utm_campaign=check&utm_content=SUB`

## 4. Lançamentos (quando os números do `/check` aparecerem no site)

- **Show HN:** `Show HN: A free, read-only check for apps you built with AI`. No primeiro comentário: por que você construiu, o que o teste faz e o que **não** faz. O HN valoriza a honestidade técnica.
- **Product Hunt:** lance o **Publishub Check com o Monitor** (algo usável), não a lista de espera. De terça a quinta, à 00:01 no horário do Pacífico. Peça para quem já testou o próprio app deixar um comentário sincero.

## 5. Da lista de espera para o Founding Customers

O Founding Customers não é uma venda: é um pedido de apoio para alguém que constrói sozinho, para quem também constrói sozinho.

- **Quem convidar primeiro:** quem se inscreveu pelo relatório (`form = check`) e quem informou a URL do app. Eles já sentiram o problema.
- **E-mail pessoal** (de você, não de um "noreply"), uns dias depois da inscrição:

> Subject: you checked your app on Publishub
>
> Hi,
>
> I'm Valmir, the founder of Publishub. I saw you ran a check on your app and joined the waitlist. Thank you.
>
> I'm building the full version alone: your sign-up, login and checkout journeys, checked after every deploy, so you hear about a broken flow before your users do.
>
> If that's something you'd use, you can reserve a Founding Customers spot. It's $0 today, nothing is charged before launch, and I'll email you at least 7 days before the first charge. It's also the clearest way to tell me this should exist: https://getpublishub.com/#pricing
>
> Either way, I'd love to know: what's the one flow in your app you'd want checked first? Just reply.
>
> Valmir

- **Responda toda resposta.** Cada conversa é pesquisa de produto e a melhor fonte de depoimentos (peça permissão antes de usar qualquer frase no site).

---

## O que acompanhar (no /admin)

| Métrica | O que diz |
| --- | --- |
| Testes feitos e "Check → signup" | Se o teste grátis convence: a meta inicial é 10–20% de quem testa entrar na lista. |
| Conversão visitante → inscrição na home | Se a história e a nota do fundador funcionam: 15–30%. |
| Inscrições por indicação | Se as pessoas confiam a ponto de indicar: meta de 15%+ do total. |
| Reservas do Founding Customers | O sinal mais forte de todos: quantas pessoas guardam o cartão por algo que ainda não existe. |

Se o `/check` tiver muito uso e pouca inscrição, o convite no fim do relatório precisa ficar mais forte. Se a home tiver pouca visita, o problema é a divulgação, não o site.

## Antes de divulgar

1. Rode as migrações `20261123000000_growth_app_check_referrals.sql` e `20261124000000_check_trust_stats.sql`, nessa ordem, **antes** do deploy.
2. Revise a nota do fundador na home (o texto fala em seu nome).
3. Teste o seu próprio app em `/check`, confira o relatório e apague-o pelo botão "Delete this report".
4. Inscreva-se pelo relatório, copie o link de indicação e abra-o pelo 4G do celular (outra rede) para conferir que você sobe 10 posições.
