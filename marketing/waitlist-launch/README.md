# Lançamento da lista de espera (72 horas)

Página: **https://getpublishub.com** (a home do site; o endereço antigo `/verify` redireciona para cá)

Os textos prontos estão nesta pasta, em inglês:

| Arquivo | O quê |
| --- | --- |
| [x-posts.md](x-posts.md) | 3 posts para o X: lançamento, o problema, build in public |
| [reddit-posts.md](reddit-posts.md) | 2 posts: uma discussão e um anúncio (só onde a comunidade permite) |
| [indie-hackers-build-club.md](indie-hackers-build-club.md) | Descrição de lançamento para Indie Hackers e Build Club |
| [direct-share.md](direct-share.md) | Mensagem curta para Discord, Slack e grupos |

## Antes de postar

1. Faça o merge do PR e rode a migração `supabase/migrations/20261108100000_waitlist.sql` no SQL Editor do Supabase.
2. Abra https://getpublishub.com, inscreva o seu próprio e-mail e confira a inscrição no /admin, no painel "Waitlist".
3. Cole o link no [Card Validator do X](https://cards-dev.twitter.com/validator) ou no [Post Inspector do LinkedIn](https://www.linkedin.com/post-inspector/) para ver a prévia do link.

## Os links com UTM

Use **sempre** o link do canal: é assim que o /admin separa as inscrições por origem.

| Canal | Link |
| --- | --- |
| X, post 1 | https://getpublishub.com/?utm_source=x&utm_medium=social&utm_campaign=waitlist_launch&utm_content=launch |
| X, post 2 | https://getpublishub.com/?utm_source=x&utm_medium=social&utm_campaign=waitlist_launch&utm_content=problem |
| X, post 3 | https://getpublishub.com/?utm_source=x&utm_medium=social&utm_campaign=waitlist_launch&utm_content=build_in_public |
| LinkedIn | https://getpublishub.com/?utm_source=linkedin&utm_medium=social&utm_campaign=waitlist_launch&utm_content=launch |
| Reddit (troque `SUB` pelo nome do sub) | https://getpublishub.com/?utm_source=reddit&utm_medium=community&utm_campaign=waitlist_launch&utm_content=SUB |
| Indie Hackers | https://getpublishub.com/?utm_source=indiehackers&utm_medium=community&utm_campaign=waitlist_launch |
| Build Club | https://getpublishub.com/?utm_source=buildclub&utm_medium=community&utm_campaign=waitlist_launch |
| Discord, Slack, grupos (troque `NOME`) | https://getpublishub.com/?utm_source=NOME&utm_medium=community&utm_campaign=waitlist_launch&utm_content=direct |
| Mensagem direta | https://getpublishub.com/?utm_source=dm&utm_medium=direct&utm_campaign=waitlist_launch |

Quem se inscreve recebe botões de compartilhar no X e no LinkedIn. Esses links já levam `utm_campaign=waitlist_share`, então as indicações aparecem separadas.

## Ordem sugerida

| Quando | O quê |
| --- | --- |
| Dia 1, manhã (horário dos EUA) | X post 1 (lançamento) e LinkedIn. Fixe o post 1 no perfil. |
| Dia 1, tarde | Indie Hackers e Build Club. |
| Dia 1 e 2 | Reddit, **um sub por dia**, com a discussão (post 1) onde link não é permitido e o anúncio (post 2) só onde autopromoção é permitida. Leia as regras de cada sub antes. |
| Dia 2 | X post 2 (o problema). Responda a cada comentário. |
| Dia 3 | X post 3 (build in public), com o que você aprendeu nas respostas. Mensagens diretas para quem comentou. |

Não poste o mesmo texto em vários subs no mesmo dia: o Reddit trata isso como spam.

## Como ver o resultado

**No /admin** (painel "Waitlist"): inscrições, visitantes únicos, conversão, a tabela por origem e por campanha, os cliques nos CTAs e nos compartilhamentos, a ferramenta de IA de cada um e o CSV.

**No SQL Editor do Supabase:**

```sql
-- o relatório inteiro (o mesmo do /admin)
select jsonb_pretty(public.waitlist_report());

-- só as últimas 72 horas
select jsonb_pretty(public.waitlist_report(now() - interval '72 hours'));

-- inscrições por origem
select coalesce(utm_source, referrer, 'direct') as origem, utm_content, count(*)
from public.waitlist
group by 1, 2
order by 3 desc;

-- as inscrições mais recentes
select email, name, ai_tool, utm_source, utm_campaign, utm_content, referrer, created_at
from public.waitlist
order by created_at desc
limit 50;
```

"Visitantes" são IPs diferentes (em hash) que abriram a página com JavaScript. Um bloqueador de anúncios não impede a contagem, porque ela é feita no nosso próprio domínio.
