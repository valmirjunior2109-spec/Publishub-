-- Lista de espera do Publishub (verificação de código gerado por IA): o e-mail de quem
-- se inscreve em /verify, de onde veio (UTM e site de origem) e os eventos do funil.
-- Migração só ADITIVA: tabelas e funções novas, nada existente é alterado.
--
-- Segurança: RLS ligado, sem policy, e as funções só podem ser chamadas pela service_role
-- (o servidor). A chave pública (anon) não lê nem escreve nada aqui.

-- ---------------------------------------------------------------- waitlist
create table if not exists public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (length(email) between 3 and 320),
  name          text check (length(name) <= 80),
  -- a ferramenta de IA principal (Claude Code, Cursor, Codex…), opcional
  ai_tool       text check (length(ai_tool) <= 40),
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  -- só o domínio do site de origem (news.ycombinator.com), nunca a URL inteira
  referrer      text,
  -- onde estava o formulário: hero ou early_access
  form          text,
  ip_hash       text,
  created_at    timestamptz not null default now()
);

-- um e-mail é uma inscrição só, sem diferença de maiúsculas
create unique index if not exists waitlist_email_key on public.waitlist (lower(email));
create index if not exists waitlist_created_idx on public.waitlist (created_at desc);
create index if not exists waitlist_ip_idx on public.waitlist (ip_hash, created_at desc);

-- ---------------------------------------------------------------- waitlist_events
-- O funil: visitas, cliques nos CTAs, inscrições e compartilhamentos. O visitante é contado
-- pelo hash do IP (o mesmo do rate limit); nada fica guardado no navegador.
create table if not exists public.waitlist_events (
  id            bigint generated always as identity primary key,
  event         text not null check (event in ('page_view', 'cta_click', 'signup', 'share_click')),
  -- qual CTA (hero, nav, early_access, how) ou qual rede (x, linkedin, copy)
  detail        text check (length(detail) <= 40),
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  referrer      text,
  ip_hash       text,
  created_at    timestamptz not null default now()
);

create index if not exists waitlist_events_created_idx on public.waitlist_events (created_at desc);
create index if not exists waitlist_events_ip_idx on public.waitlist_events (ip_hash, created_at desc);

alter table public.waitlist enable row level security;
alter table public.waitlist_events enable row level security;
revoke all on public.waitlist, public.waitlist_events from anon, authenticated;

-- ---------------------------------------------------------------- waitlist_join
-- Inscreve um e-mail. Devolve 'joined', 'duplicate' (já estava na lista) ou 'rate_limited'
-- (mais de p_max_per_hour inscrições novas deste IP na última hora).
-- A primeira origem fica: uma segunda inscrição do mesmo e-mail não muda nada.
create or replace function public.waitlist_join(
  p_email         text,
  p_name          text default null,
  p_ai_tool       text default null,
  p_utm_source    text default null,
  p_utm_medium    text default null,
  p_utm_campaign  text default null,
  p_utm_content   text default null,
  p_referrer      text default null,
  p_form          text default null,
  p_ip_hash       text default null,
  p_max_per_hour  integer default 5
) returns text
language plpgsql
set search_path = public
as $$
declare
  v_email text := lower(btrim(p_email));
  v_id uuid;
begin
  if exists (select 1 from waitlist where lower(email) = v_email) then
    return 'duplicate';
  end if;

  if p_ip_hash is not null
     and (select count(*) from waitlist where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= p_max_per_hour then
    return 'rate_limited';
  end if;

  insert into waitlist (email, name, ai_tool, utm_source, utm_medium, utm_campaign, utm_content, referrer, form, ip_hash)
  values (v_email, nullif(btrim(p_name), ''), nullif(p_ai_tool, ''), p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_referrer, p_form, p_ip_hash)
  on conflict ((lower(email))) do nothing
  returning id into v_id;

  -- dois envios ao mesmo tempo: o segundo cai aqui
  if v_id is null then
    return 'duplicate';
  end if;

  insert into waitlist_events (event, detail, utm_source, utm_medium, utm_campaign, utm_content, referrer, ip_hash)
  values ('signup', p_form, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_referrer, p_ip_hash);
  return 'joined';
end;
$$;

-- ---------------------------------------------------------------- waitlist_track
-- Grava um evento do funil vindo do navegador. Um IP que manda mais de 120 eventos em
-- 10 minutos é ignorado em silêncio, para um robô não inflar as visitas.
create or replace function public.waitlist_track(
  p_event         text,
  p_detail        text default null,
  p_utm_source    text default null,
  p_utm_medium    text default null,
  p_utm_campaign  text default null,
  p_utm_content   text default null,
  p_referrer      text default null,
  p_ip_hash       text default null
) returns boolean
language plpgsql
set search_path = public
as $$
begin
  if p_event not in ('page_view', 'cta_click', 'share_click') then
    return false;
  end if;
  if p_ip_hash is not null
     and (select count(*) from waitlist_events where ip_hash = p_ip_hash and created_at > now() - interval '10 minutes') >= 120 then
    return false;
  end if;
  insert into waitlist_events (event, detail, utm_source, utm_medium, utm_campaign, utm_content, referrer, ip_hash)
  values (p_event, left(p_detail, 40), p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_referrer, p_ip_hash);
  return true;
end;
$$;

-- ---------------------------------------------------------------- waitlist_report
-- Tudo o que o /admin mostra, num JSON só. Também dá para rodar no SQL Editor:
--   select jsonb_pretty(public.waitlist_report());
--   select jsonb_pretty(public.waitlist_report(now() - interval '72 hours'));
-- A "origem" é o utm_source; sem UTM, o domínio de onde a pessoa veio; sem nada, 'direct'.
create or replace function public.waitlist_report(p_since timestamptz default null)
returns jsonb
language sql
stable
set search_path = public
as $$
  with
  ev as (
    select *, coalesce(nullif(utm_source, ''), nullif(referrer, ''), 'direct') as origin
    from waitlist_events
    where p_since is null or created_at >= p_since
  ),
  wl as (
    select *, coalesce(nullif(utm_source, ''), nullif(referrer, ''), 'direct') as origin
    from waitlist
    where p_since is null or created_at >= p_since
  ),
  visits as (
    select origin, count(*) as page_views, count(distinct ip_hash) as visitors
    from ev where event = 'page_view' group by origin
  ),
  signups as (
    select origin, count(*) as signups from wl group by origin
  ),
  sources as (
    select
      coalesce(v.origin, s.origin) as source,
      coalesce(v.visitors, 0) as visitors,
      coalesce(v.page_views, 0) as page_views,
      coalesce(s.signups, 0) as signups
    from visits v
    full join signups s on s.origin = v.origin
  )
  select jsonb_build_object(
    'since', p_since,
    'totals', jsonb_build_object(
      'signups', (select count(*) from wl),
      'page_views', (select count(*) from ev where event = 'page_view'),
      'visitors', (select count(distinct ip_hash) from ev where event = 'page_view'),
      'cta_clicks', (select count(*) from ev where event = 'cta_click'),
      'share_clicks', (select count(*) from ev where event = 'share_click')
    ),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'visitors', visitors, 'page_views', page_views, 'signups', signups) order by signups desc, visitors desc, source)
      from sources
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(row_to_json(c)::jsonb order by c.signups desc)
      from (
        select origin as source, utm_medium as medium, utm_campaign as campaign, utm_content as content, count(*) as signups
        from wl group by 1, 2, 3, 4
      ) c
    ), '[]'::jsonb),
    'ctas', coalesce((
      select jsonb_agg(row_to_json(c)::jsonb order by c.clicks desc)
      from (select event, coalesce(detail, '') as detail, count(*) as clicks from ev where event in ('cta_click', 'share_click') group by 1, 2) c
    ), '[]'::jsonb),
    'tools', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb order by t.signups desc)
      from (select coalesce(ai_tool, 'Not given') as ai_tool, count(*) as signups from wl group by 1) t
    ), '[]'::jsonb),
    'days', coalesce((
      select jsonb_agg(row_to_json(d)::jsonb order by d.day)
      from (
        select day, sum(visitors)::int as visitors, sum(signups)::int as signups from (
          select date_trunc('day', created_at)::date as day, count(distinct ip_hash) as visitors, 0 as signups from ev where event = 'page_view' group by 1
          union all
          select date_trunc('day', created_at)::date, 0, count(*) from wl group by 1
        ) x group by day
      ) d
    ), '[]'::jsonb),
    'signups', coalesce((
      select jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc)
      from (
        select email, name, ai_tool, utm_source, utm_medium, utm_campaign, utm_content, referrer, form, created_at
        from wl order by created_at desc limit 2000
      ) r
    ), '[]'::jsonb)
  );
$$;

-- só o servidor chama as funções (o Postgres dá EXECUTE a PUBLIC por padrão; o Supabase, à anon)
revoke all on function public.waitlist_join(text, text, text, text, text, text, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.waitlist_track(text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.waitlist_report(timestamptz) from public, anon, authenticated;
grant execute on function public.waitlist_join(text, text, text, text, text, text, text, text, text, text, integer) to service_role;
grant execute on function public.waitlist_track(text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.waitlist_report(timestamptz) to service_role;
