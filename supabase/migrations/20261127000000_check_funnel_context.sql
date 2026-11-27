-- O /check como funil: o contexto opcional de quem entra na lista de espera e a primeira origem.
-- Migração só ADITIVA: colunas opcionais em `waitlist`, uma função nova e o relatório com os campos novos.
-- O código novo funciona antes desta migração rodar (o contexto só não é gravado, e o log avisa);
-- rode-a no SQL Editor do Supabase antes ou depois do deploy, tanto faz.
--
-- Segurança: o mesmo padrão das outras tabelas: RLS ligado, sem policies, e as funções só
-- podem ser chamadas pela service_role (o servidor).

-- ---------------------------------------------------------------- waitlist: contexto e atribuição
-- "Qual fluxo você quer ver verificado primeiro?": signup | login | checkout | form | logged_in | other
alter table public.waitlist add column if not exists priority_flow text check (length(priority_flow) <= 40);
-- "Conte em uma frase o que você está construindo."
alter table public.waitlist add column if not exists building text check (length(building) <= 200);
-- a primeira origem deste navegador (cookie publishub_attribution): { utm, referrer, landing, at }
alter table public.waitlist add column if not exists first_touch jsonb check (pg_column_size(first_touch) <= 2048);
-- a página onde a pessoa se inscreveu (/check, /check/[id], /, /pt…)
alter table public.waitlist add column if not exists conversion_path text check (length(conversion_path) <= 200);

create index if not exists waitlist_priority_flow_idx on public.waitlist (priority_flow);

-- ---------------------------------------------------------------- waitlist_add_context
-- Completa o contexto de uma inscrição pelo código de indicação. Só preenche o que está vazio:
-- nunca troca nem apaga o que já foi dito. Devolve true se a inscrição existe.
create or replace function public.waitlist_add_context(
  p_ref_code         text,
  p_ai_tool          text default null,
  p_priority_flow    text default null,
  p_building         text default null,
  p_first_touch      jsonb default null,
  p_conversion_path  text default null
) returns boolean
language plpgsql
set search_path = public
as $$
begin
  update waitlist set
    ai_tool         = coalesce(ai_tool, nullif(btrim(p_ai_tool), '')),
    priority_flow   = coalesce(priority_flow, nullif(btrim(p_priority_flow), '')),
    building        = coalesce(building, nullif(btrim(p_building), '')),
    first_touch     = coalesce(first_touch, p_first_touch),
    conversion_path = coalesce(conversion_path, nullif(btrim(p_conversion_path), ''))
  where ref_code = p_ref_code;
  return found;
end;
$$;

-- ---------------------------------------------------------------- waitlist_report (com o contexto)
-- O mesmo relatório da migração 20261123000000, mais: fluxos prioritários, ferramenta por canal e,
-- em cada inscrição, o fluxo, o que está construindo, a página da inscrição e a primeira origem.
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
      'with_flow', (select count(*) from wl where priority_flow is not null),
      'with_building', (select count(*) from wl where building is not null),
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
    'flows', coalesce((
      select jsonb_agg(row_to_json(f)::jsonb order by f.signups desc)
      from (select coalesce(priority_flow, 'not_given') as priority_flow, count(*) as signups from wl group by 1) f
    ), '[]'::jsonb),
    -- qual ferramenta de IA cada canal traz (a primeira origem quando existe, senão a da aba)
    'tools_by_source', coalesce((
      select jsonb_agg(row_to_json(x)::jsonb order by x.signups desc)
      from (
        select coalesce(nullif(first_touch #>> '{utm,utm_source}', ''), nullif(first_touch ->> 'referrer', ''), origin) as source,
               coalesce(ai_tool, 'Not given') as ai_tool, count(*) as signups
        from wl group by 1, 2
      ) x
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
        select email, name, ai_tool, priority_flow, building, app_url, invited_by, utm_source, utm_medium, utm_campaign, utm_content, referrer, form,
               conversion_path,
               first_touch #>> '{utm,utm_source}' as first_utm_source,
               first_touch #>> '{utm,utm_campaign}' as first_utm_campaign,
               first_touch ->> 'referrer' as first_referrer,
               first_touch ->> 'landing' as first_landing,
               created_at
        from wl order by created_at desc limit 2000
      ) r
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.waitlist_add_context(text, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.waitlist_add_context(text, text, text, text, jsonb, text) to service_role;
revoke all on function public.waitlist_report(timestamptz) from public, anon, authenticated;
grant execute on function public.waitlist_report(timestamptz) to service_role;
