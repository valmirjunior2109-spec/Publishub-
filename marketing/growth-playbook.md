# Playbook de crescimento da lista de espera

O que mudou no site para trazer gente, e como usar cada peça. Os textos prontos para postar estão em inglês (o idioma do site); as explicações, em português.

## As três peças novas

| Peça | Onde | Para quê |
| --- | --- | --- |
| **Teste grátis** | [getpublishub.com/check](https://getpublishub.com/check) | A pessoa cola a URL do app e, em cerca de um minuto, vê o que está quebrado: erros de JavaScript, requisições que falham, links quebrados, páginas "404", layout no celular. É o motivo para alguém visitar e compartilhar *hoje*, e o relatório termina no convite para a lista. |
| **Indicações** | Depois da inscrição | Cada pessoa ganha um link pessoal (`?ref=...`) e vê a posição na fila. Cada amigo que entra pelo link a sobe **10 posições**. |
| **URL do app no cadastro** | Formulário (opcional) | Mostra quem tem um app de verdade no ar: são os primeiros a convidar e as melhores pessoas para conversar. |

No `/admin`, o painel "Waitlist" agora mostra: inscrições por indicação, testes grátis feitos, a conversão teste → inscrição e quem mais indicou.

> **Compromisso público:** o site diz que os convites saem "em lotes, começando do topo". Convide nessa ordem (os termos permitem convidar também quem tem o setup que você está testando primeiro).

---

## 1. O estudo com 100 apps (o post com mais chance de viralizar)

Dados próprios rendem mais do que qualquer anúncio. O script roda o mesmo teste do `/check` numa lista de URLs e gera um CSV com o resumo.

1. Junte ~100 URLs **públicas** de apps feitos com IA: projetos do showcase do Lovable, "Made with Bolt", posts de lançamento no r/SideProject, no Product Hunt e no X ("built this with Lovable/Cursor in a weekend").
2. Salve uma URL por linha em `urls.txt` e rode, de dentro de `frontend/` (precisa de um Chrome instalado):
   ```bash
   CHROME_EXECUTABLE_PATH="/caminho/do/chrome" npm run check:batch -- urls.txt > resultado.csv
   ```
   O resumo sai no terminal ("At least one failure: 38 (38%)", e quantos falharam em cada verificação).
3. Publique os números **agregados**, sem expor apps específicos (nem nomes, nem prints de apps de terceiros sem permissão).

**Post para o X / LinkedIn (preencha com os seus números):**

> We ran 100 apps built with AI coding tools (Lovable, Bolt, Cursor, Claude Code) through a real browser.
>
> - X% had at least one JavaScript crash
> - X% had API requests failing on the first page
> - X% had a key page (pricing, sign-up) showing a 404
> - X% didn't fit on a phone screen
>
> The code compiled. The apps were live. Nobody had clicked through them.
>
> Free check for your own app: https://getpublishub.com/check?utm_source=x&utm_medium=social&utm_campaign=study_100

Reddit (r/vibecoding, r/lovable, r/cursor, r/SideProject): o mesmo conteúdo como discussão, com o método explicado e o link só no fim ou nos comentários, onde a regra do sub permitir.

## 2. "Show HN" e Product Hunt (só com o teste grátis no ar)

- **Show HN:** `Show HN: Free real-browser check for AI-built apps`. No primeiro comentário, conte por que construiu, o que o teste faz e o que **não** faz (não loga, não envia formulários). O HN valoriza honestidade técnica.
- **Product Hunt:** lance o **teste grátis** como produto (é algo usável), não a lista de espera. Agende para uma terça a quinta, 00:01 no horário do Pacífico.

Links com UTM:
- HN: `https://getpublishub.com/check?utm_source=hn&utm_medium=community&utm_campaign=show_hn`
- Product Hunt: `https://getpublishub.com/check?utm_source=producthunt&utm_medium=launch&utm_campaign=ph_launch`

## 3. Responder onde a dor aparece (diário, 20 minutos)

Procure no X e no Reddit por: `lovable broken`, `cursor broke my app`, `vibe coding bug`, `claude code regression`, `works locally but not in production`.

Responda **ajudando primeiro**: rode o `/check` no app da pessoa (se ela postou o link) e responda com o que achou. Exemplo:

> Ran it through a real browser: the /pricing link shows your 404 page and there's a failing request to your Supabase function on load. Report: <link do relatório>

Esse é o melhor anúncio possível: um resultado útil, de graça, no contexto certo.

## 4. Build in public (3 posts por semana)

- **Segunda:** um bug real que o teste encontrou (sem expor o app) e por que agentes de IA erram isso.
- **Quarta:** número da semana (testes feitos, % com falha, inscrições).
- **Sexta:** o que você construiu na semana no Publishub.

## 5. Parcerias de baixo custo

- Criadores de conteúdo sobre Lovable, Bolt e Cursor no YouTube e no X: ofereça rodar o teste nos apps dos seguidores numa live.
- Comunidades (Discord do Lovable, Build Club, Indie Hackers): peça permissão aos moderadores para oferecer o teste grátis como recurso.
- Newsletters de "vibe coding" e IA para devs: o estudo com 100 apps é uma pauta pronta.

---

## O que acompanhar (no /admin)

| Métrica | Meta inicial |
| --- | --- |
| Conversão visitante → inscrição (home) | 15–30% |
| Teste grátis → inscrição ("Check → signup") | 10–20% |
| Inscrições por indicação | 15%+ do total |
| Inscrições com URL de app | quanto maior, melhor: são os primeiros convidados |

Se o teste grátis tiver muito uso e pouca inscrição, o convite no fim do relatório precisa ficar mais forte. Se a home converter bem mas tiver pouca visita, o problema é distribuição, não o site.

## Antes de divulgar

1. Rode a migração `supabase/migrations/20261123000000_growth_app_check_referrals.sql` **antes** do deploy.
2. Faça o deploy e rode um teste em https://getpublishub.com/check com o seu próprio app.
3. Inscreva-se pelo relatório, copie o link de indicação, abra numa janela anônima **em outra rede** (o 4G do celular, por exemplo) e inscreva outro e-mail: a sua posição deve subir 10 lugares. Inscrições pela mesma rede não contam como indicação (é a proteção contra fraude).
