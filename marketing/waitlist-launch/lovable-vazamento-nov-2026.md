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

## X (post principal)

> ~4,000 Lovable apps were found leaking passports and private messages this month.
>
> Not because Lovable is bad. Because the agent that wrote the code is the same one that said "done", and nobody checked.
>
> Before your next deploy, 5 things to test by hand 🧵

**Fio (respostas ao próprio post):**

> 1/ Log out and open every page that should need a login. If you can see data, so can anyone.

> 2/ Make a second account. Can it see the first account's data? (On Supabase: is row-level security on for every table?)

> 3/ Submit every form, then reload. "Saved!" on screen doesn't mean it saved. Read the data back.

> 4/ Open the browser console on your main pages. Red errors = a feature that silently stopped working.

> 5/ Do 1–4 again after every AI change. That's the part nobody does, because clicking through the whole app eats the time the AI saved.

> 6/ I'm building the "after every change" part. Meanwhile, a free real-browser check of your public pages (crashes, failed requests, broken pages). Not a security scan, but it catches what breaks first:
> https://getpublishub.com/check?utm_source=x&utm_medium=social&utm_campaign=lovable_leak

---

## LinkedIn

> This month, a study of ~159,000 apps built with Lovable found about 4,000 leaking sensitive data: passport scans, payment details, more than 200,000 private messages.
>
> The cause wasn't exotic. Generated back-ends with no authentication.
>
> I don't think the lesson is "don't use AI builders". I use AI to write most of my code. The lesson is that **writing the code and checking the code are now done by the same agent**. It writes the change, it says "done", and the only test is whether the page looks right.
>
> What I do before every deploy now:
> → Log out and open the pages that should need a login
> → Create a second account and try to see the first one's data
> → Submit every form, reload, and read the data back
> → Open the console on the main pages
>
> And then again after the next AI change. That's the part that doesn't scale by hand, and it's what I'm building Publishub for.
>
> In the meantime there's a free check that opens your public pages in a real browser and shows crashes, failed requests and broken pages. It's not a security scan, but it's a start: https://getpublishub.com/check?utm_source=linkedin&utm_medium=social&utm_campaign=lovable_leak
>
> Sources in the first comment.

**Primeiro comentário:** os três links da seção "O que aconteceu".

---

## Threads

> ~4,000 Lovable apps leaked passports and private messages this month. The fix isn't to stop using AI. It's to stop letting the agent that wrote the code be the only one that checks it.
>
> 4 things to test by hand before every deploy, in the replies 👇

(Respostas: os itens 1 a 4 do fio do X. Último: o link do /check com `utm_source=threads`.)

---

## Reddit: r/lovable e r/vibecoding

Postar como texto, **sem link no corpo**. O link só vai nos comentários, se alguém perguntar como checar. Ler as regras de cada subreddit antes.

**Título:** After this week's Lovable leak news: the checklist I run before every deploy

> If you missed it: a study of ~159k Lovable apps found ~4,000 exposing sensitive data (passports, private messages), mostly from back-ends with no auth. Not a Lovable-only problem. Any AI builder can generate this.
>
> What I check now before I ship anything an AI wrote:
>
> 1. **Logged out, open every page that should need login.** If data shows up, it's public.
> 2. **Second account test.** Sign up twice. Can account B see account A's stuff? On Supabase, check RLS is enabled on every table, not just the ones you remember.
> 3. **Read the data back.** Submit each form, reload, confirm it's really there. A "Saved!" toast can show while the insert was blocked.
> 4. **Console open on the main pages.** Red errors are usually a feature that quietly broke.
> 5. **Repeat after every AI change.** The agent can fix one page and break another it didn't mention.
>
> What am I missing? Curious what everyone else checks.

**Se alguém perguntar como automatizar:** responder com o stillworks (open source) e/ou o /check, deixando claro o que cada um faz e o que não faz:
- stillworks: `https://github.com/valmirjunior2109-spec/stillworks` (a receita `read-the-data-back` cobre o item 3)
- /check: `https://getpublishub.com/check?utm_source=reddit&utm_medium=community&utm_campaign=lovable_leak`

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
