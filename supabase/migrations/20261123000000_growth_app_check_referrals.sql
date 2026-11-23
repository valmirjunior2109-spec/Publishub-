-- Aquisição: o teste grátis de apps (/check) e as indicações da lista de espera.
-- Migração só ADITIVA: uma tabela nova, colunas opcionais em `waitlist` e funções novas.
-- A função antiga waitlist_join continua existindo (o deploy anterior segue funcionando
-- enquanto o novo não sobe). Rode ANTES do deploy do código que usa waitlist_join_ref.
--
-- Segurança: o mesmo padrão das outras tabelas: RLS ligado, sem policies, e as funções só
-- podem ser chamadas pela service_role (o servidor).

-- ---------------------------------------------------------------- app_checks
-- Cada teste grátis: a URL, o resultado (as verificações) e as capturas de tela.
create table if not exists public.app_checks (
  id           uuid primary key default gen_random_uuid(),
  url          text not null check (length(url) <= 2048),
  status       text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  -- { summary, checks[], pages[], meta } — o formato está em frontend/src/lib/check/types.ts
  result       jsonb,
  -- { desktop, mobile }: JPEG em data URL, separado para o resultado continuar leve
  screenshots  jsonb,
  error        text,
  ip_hash      text,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz
);

create index if not exists app_checks_created_idx on public.app_checks (created_at desc);
create index if not exists app_checks_ip_idx on public.app_checks (ip_hash, created_at desc);

alter table public.app_checks enable row level security;
revoke all on public.app_checks from anon, authenticated;

-- ---------------------------------------------------------------- waitlist: indicações e URL do app
alter table public.waitlist add column if not exists app_url text check (length(app_url) <= 300);
-- o código do link de indicação desta pessoa (getpublishub.com/?ref=CODIGO)
alter table public.waitlist add column if not exists ref_code text;
-- o código de quem indicou (só na inscrição nova; nunca muda depois)
alter table public.waitlist add column if not exists invited_by text;

-- toda inscrição nova ganha um código, até as da função antiga waitlist_join (durante o deploy)
alter table public.waitlist alter column ref_code set default substr(md5(gen_random_uuid()::text), 1, 8);
-- quem já estava na lista ganha um código também
update public.waitlist
set ref_code = substr(md5(id::text || clock_timestamp()::text), 1, 8)
where ref_code is null;

create unique index if not exists waitlist_ref_code_key on public.waitlist (ref_code);
create index if not exists waitlist_invited_by_idx on public.waitlist (invited_by);

-- ---------------------------------------------------------------- waitlist_position
-- A posição na fila: a ordem de chegada, menos p_bonus posições por amigo que entrou pelo link.
create or replace function public.waitlist_position(p_ref_code text, p_bonus integer default 10)
returns jsonb
language sql
stable
set search_path = public
as $$
  with me as (select id, created_at, ref_code from waitlist where ref_code = p_ref_code),
  refs as (select count(*)::int as n from waitlist where invited_by = p_ref_code)
  select case when not exists (select 1 from me) then null else jsonb_build_object(
    'ref_code', (select ref_code from me),
    'referrals', (select n from refs),
    'position', greatest(1, (select count(*)::int from waitlist w, me where w.created_at <= me.created_at) - p_bonus * (select n from refs)),
    'total', (select count(*)::int from waitlist)
  ) end;
$$;

-- ---------------------------------------------------------------- waitlist_join_ref
-- Como waitlist_join, mais a URL do app e o código de quem indicou. Devolve
-- { status: joined | duplicate | rate_limited, ref_code, referrals, position, total }.
-- Num e-mail que já estava na lista, nada muda (nem a indicação), e volta a posição atual.
create or replace function public.waitlist_join_ref(
  p_email         text,
  p_name          text default null,
  p_ai_tool       text default null,
  p_app_url       text default null,
  p_invited_by    text default null,
  p_utm_source    text default null,
  p_utm_medium    text default null,
  p_utm_campaign  text default null,
  p_utm_content   text default null,
  p_referrer      text default null,
  p_form          text default null,
  p_ip_hash       text default null,
  p_max_per_hour  integer default 5
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_email text := lower(btrim(p_email));
  v_code text;
  v_invited text;
  v_id uuid;
  v_try integer := 0;
begin
  select ref_code into v_code from waitlist where lower(email) = v_email;
  if found then
    return jsonb_build_object('status', 'duplicate') || coalesce(waitlist_position(v_code), '{}'::jsonb);
  end if;

  if p_ip_hash is not null
     and (select count(*) from waitlist where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= p_max_per_hour then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  -- só vale um código que existe; o mesmo IP não pode indicar a si mesmo várias vezes
  select ref_code into v_invited from waitlist
  where ref_code = p_invited_by and (p_ip_hash is null or ip_hash is distinct from p_ip_hash);

  loop
    v_code := substr(md5(gen_random_uuid()::text), 1, 8);
    exit when not exists (select 1 from waitlist where ref_code = v_code);
    v_try := v_try + 1;
    if v_try > 5 then raise exception 'could not generate a referral code'; end if;
  end loop;

  insert into waitlist (email, name, ai_tool, app_url, ref_code, invited_by, utm_source, utm_medium, utm_campaign, utm_content, referrer, form, ip_hash)
  values (v_email, nullif(btrim(p_name), ''), nullif(p_ai_tool, ''), nullif(btrim(p_app_url), ''), v_code, v_invited,
          p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_referrer, p_form, p_ip_hash)
  on conflict ((lower(email))) do nothing
  returning id into v_id;

  -- dois envios ao mesmo tempo: o segundo cai aqui
  if v_id is null then
    select ref_code into v_code from waitlist where lower(email) = v_email;
    return jsonb_build_object('status', 'duplicate') || coalesce(waitlist_position(v_code), '{}'::jsonb);
  end if;

  insert into waitlist_events (event, detail, utm_source, utm_medium, utm_campaign, utm_content, referrer, ip_hash)
  values ('signup', p_form, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_referrer, p_ip_hash);

  return jsonb_build_object('status', 'joined') || waitlist_position(v_code);
end;
$$;

-- ---------------------------------------------------------------- waitlist_report (com indicações e testes)
-- O mesmo relatório de antes, mais: indicações, quem mais indicou, testes grátis e a URL do app na lista.
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
  ck as (
    select * from app_checks where p_since is null or created_at >= p_since
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
      'share_clicks', (select count(*) from ev where event = 'share_click'),
      'referrals', (select count(*) from wl where invited_by is not null),
      'from_check', (select count(*) from wl where form = 'check'),
      'app_checks', (select count(*) from ck),
      'app_checks_done', (select count(*) from ck where status = 'done')
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
    'referrers', coalesce((
      select jsonb_agg(row_to_json(r)::jsonb order by r.referrals desc)
      from (
        select o.email, count(*)::int as referrals
        from wl join waitlist o on o.ref_code = wl.invited_by
        group by o.email order by 2 desc limit 20
      ) r
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
        select email, name, ai_tool, app_url, invited_by, utm_source, utm_medium, utm_campaign, utm_content, referrer, form, created_at
        from wl order by created_at desc limit 2000
      ) r
    ), '[]'::jsonb)
  );
$$;

-- só o servidor chama as funções
revoke all on function public.waitlist_position(text, integer) from public, anon, authenticated;
revoke all on function public.waitlist_join_ref(text, text, text, text, text, text, text, text, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.waitlist_report(timestamptz) from public, anon, authenticated;
grant execute on function public.waitlist_position(text, integer) to service_role;
grant execute on function public.waitlist_join_ref(text, text, text, text, text, text, text, text, text, text, text, text, integer) to service_role;
grant execute on function public.waitlist_report(timestamptz) to service_role;
