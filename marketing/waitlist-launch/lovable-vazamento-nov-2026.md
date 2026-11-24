# Gancho de notícia: o vazamento dos apps Lovable (nov/2026)

Posts prontos para aproveitar a notícia da semana. Postar como Valmir, não como "a Publishub". Responder todo mundo na primeira hora.

## O que aconteceu (só fatos com fonte)

- **Nov/2026:** uma análise de 159.041 apps feitos no Lovable encontrou cerca de 4.000 vazando dados sensíveis, entre eles fotos de passaporte e mais de 200 mil mensagens privadas. Causa apontada: back-end gerado sem autenticação. ([Cybernews](https://cybernews.com/security/lovable-ai-apps-expose-personal-information/), [OECD AI](https://oecd.ai/en/incidents/2026-11-03-6b59))
- **Fev/2026:** um pesquisador achou 16 falhas (6 críticas) num app em destaque no próprio Discover do Lovable. A resposta do Lovable: o usuário é responsável por corrigir o que foi sinalizado antes de publicar. ([The Register](https://www.theregister.com/2026/02/27/lovable_app_vulnerabilities))
- **Mai/2025:** 170 de 1.645 apps Lovable amostrados deixavam dados pessoais acessíveis para qualquer um. ([The Next Web](https://thenextweb.com/news/lovable-vibe-coding-security-crisis-exposed))

## Regras para estes posts

1. **Não diga que o /check acha vazamento de dados.** Ele abre as páginas públicas num navegador real (crashes de JavaScript, requests que falham, páginas quebradas). Não é scanner de segurança. A história é outra, e é a nossa: *o mesmo agente que escreveu o código diz que ele funciona, e ninguém testa de verdade*.
2. **Nunca cite, mostre ou teste o app de alguém.** Só os relatórios públicos acima.
3. **Não ataque o Lovable.** Muitos leitores usam e gostam dele. O problema é de toda ferramenta de IA, não de uma.
4. **Todo link com UTM** (`utm_campaign=lovable_leak`), para o /admin mostrar o que converteu.

---

## X: posts diretos (um por dia, nesta ordem)

Cada post cabe em 280 caracteres (o X conta qualquer link como 23). Fixe o post 1 no perfil.

**Post 1: a notícia (fixar no perfil)**

```text
4,000 Lovable apps leaked passports and private messages this month.

Same story every time: the AI says "done". Nobody checks.

Check your app in 60 seconds. Real browser, free, no signup:
https://getpublishub.com/check?utm_source=x&utm_medium=social&utm_campaign=lovable_leak&utm_content=p1
```

**Post 2: a dor**

```text
Your AI said "done".
Your signup form doesn't submit.
You find out when a user tells you.

Paste your URL. Real browser, 60 seconds, free:
https://getpublishub.com/check?utm_source=x&utm_medium=social&utm_campaign=lovable_leak&utm_content=p2
```

**Post 3: checklist (sem link, para alcance; o link vai na primeira resposta)**

```text
Shipping with Lovable, Bolt or Cursor? 3 checks before every deploy:

1. Log out. Open pages that need login. See data? So can everyone.
2. Make 2 accounts. Can B see A's data?
3. Submit a form. Reload. Still there?

5 minutes. Saves your launch.
```

Primeira resposta do post 3:

```text
Want the boring part automated? Free real-browser check of your public pages:
https://getpublishub.com/check?utm_source=x&utm_medium=social&utm_campaign=lovable_leak&utm_content=p3
```

**Post 4: enquete (use o recurso de enquete do X com as 4 opções)**

```text
Vibe coders, honest answer:

After your AI changes something, how do you know the app still works?
```

Opções: `I click through it` · `I ask the AI` · `Users tell me` · `I don't`

Responda a quem votar e, no fim do dia, poste o resultado com o link do post 2.

**Post 5: para quem usa Claude Code ou Cursor (stillworks)**

```text
I made Claude Code test its own changes.

It opens your app in a real browser, finds what broke, and hands the agent a report to fix it.

Open source, one line:
claude mcp add stillworks -- npx -y stillworks mcp

https://github.com/valmirjunior2109-spec/stillworks
```

---

## Reddit: um post por subreddit, em dias diferentes

Leia as regras de cada subreddit antes. Fique nos comentários respondendo nas primeiras 2 horas. Nunca poste o mesmo texto em dois lugares no mesmo dia.

### r/lovable (sem link no corpo: o link só vai num comentário se pedirem)

**Título:**

```text
4,000 Lovable apps leaked user data this month. 3 checks that take 5 minutes
```

**Texto:**

```text
~4,000 of ~159k Lovable apps were found exposing passports and private messages. Cause: back-ends with no auth. Not a Lovable-only problem, any AI builder can do this.

Before every deploy:

1. Log out and open every page that should need login. If you see data, everyone can.
2. Create 2 accounts. Can account B see account A's stuff? Check RLS is on for EVERY Supabase table.
3. Submit a form, reload. A "Saved!" toast doesn't mean it saved.

Repeat after every AI change. It fixes one page and breaks another.

What else do you check?
```

**Comentário, se alguém pedir uma ferramenta:**

```text
I built a free one for the "did something break" part: it opens your public pages in a real browser and lists crashes, failed requests and broken pages. Read-only, no signup. Not a security scanner.
https://getpublishub.com/check?utm_source=reddit&utm_medium=community&utm_campaign=lovable_leak&utm_content=lovable
```

### r/SideProject (aqui pode mostrar o que você fez)

**Título:**

```text
I built a free tool that opens your AI-built app in a real browser and shows what's broken
```

**Texto:**

```text
I build with AI and kept shipping stuff that "worked": signup button dead, dashboard 404, API returning 500s. The AI said done every time.

So I built a free check. Paste a URL and in ~60s it:

- opens your app + key pages (signup, login, pricing) in a real browser
- catches JavaScript crashes, failed requests, "not found" screens, blank pages
- checks mobile layout and internal links
- gives you a report with screenshots

Read-only: never logs in or submits forms. No signup.

https://getpublishub.com/check?utm_source=reddit&utm_medium=community&utm_campaign=lovable_leak&utm_content=sideproject

Roast it. What should it catch that it doesn't?
```

### r/ClaudeAI e r/cursor (o stillworks, open source)

**Título:**

```text
I made Claude Code (and Cursor) test their own changes in a real browser. Open source MCP
```

**Texto:**

```text
My problem: the agent says "done", I open the app, signup is broken.

stillworks is an MCP server. After a change, the agent calls check_app, a real browser opens the app, and the agent gets back a report: which page broke, the JS error, the failed request and the server response. Then it fixes it.

Claude Code:
claude mcp add stillworks -- npx -y stillworks mcp

Cursor: one-click install in the README. Also works in VS Code, Windsurf, Codex.

For signup/login/checkout, it runs journeys you define (the agent can write them for you).

MIT, no telemetry: https://github.com/valmirjunior2109-spec/stillworks

Feedback welcome, especially on what it misses.
```

### r/vibecoding (pergunta primeiro, ferramenta só nos comentários)

**Título:**

```text
How do you know your app still works after the AI changes it?
```

**Texto:**

```text
Genuine question. My options so far:

- click through everything after every prompt (kills the speed)
- ask the AI "does it work?" (it always says yes)
- wait for users to complain

The worst bugs I've shipped were on pages the AI didn't even mention touching.

What's your routine?
```

Nos comentários, quando fizer sentido, use o mesmo comentário do r/lovable.

---

## Discord (canais de ajuda ou showcase do Lovable e do Bolt)

Não abrir post novo com link. Responder dúvidas tipo "meu app quebrou depois do deploy" ou "como sei se meu RLS está certo" com os itens 1 a 3 da checklist, e só no fim:

> I made a free check that opens your public pages in a real browser and lists crashes and failed requests, if it helps: https://getpublishub.com/check?utm_source=discord&utm_medium=community&utm_campaign=lovable_leak (read-only, never logs in or submits forms)

---

## E-mail para a waitlist (assunto + corpo curto)

**Assunto:** the Lovable leak, and the 4 checks I run now

> Hi, Valmir here.
>
> You probably saw it: ~4,000 apps built with Lovable were found leaking passports and private messages this month. Here's the short checklist I run before every deploy now: [os 4 itens do LinkedIn].
>
> One question: which of these do you actually do today? Just hit reply. I read every answer, and it decides what Publishub tests first.
>
> If you want to be one of the first apps Publishub checks after every deploy, Founding Customers is $0 today: https://getpublishub.com/?utm_source=email&utm_medium=email&utm_campaign=lovable_leak#pricing
