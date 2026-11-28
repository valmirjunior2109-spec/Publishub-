-- O monitor contínuo: a Publishub roda o teste das páginas públicas de um app todo dia e avisa por e-mail
-- só quando aparece um problema NOVO (comparado com a execução anterior). É o primeiro recurso contínuo de verdade.
-- Migração só ADITIVA: uma tabela nova e uma coluna opcional em app_checks.
--
-- Fluxo: a pessoa ativa no relatório (só quem criou o teste) → status 'pending' → confirma pelo link do e-mail
-- (double opt-in: ninguém liga alertas para o e-mail de outra pessoa) → 'active' → o agendamento diário da Vercel
-- (/api/cron/monitors) cria um teste por monitor vencido → ao terminar, compara com o anterior e manda o alerta.
-- Os links de confirmar e parar levam uma assinatura HMAC do id (nada de token guardado aqui).
--
-- Segurança: RLS ligado, sem policy. Só a service_role (o servidor) lê e escreve.

create table if not exists public.monitors (
  id                 uuid primary key default gen_random_uuid(),
  url                text not null check (length(url) <= 2048),
  email              text not null check (length(email) <= 320),
  locale             text not null default 'en' check (locale in ('en', 'pt')),
  status             text not null default 'pending' check (status in ('pending', 'active', 'stopped')),
  -- o último teste terminado: a base de comparação da próxima execução
  baseline_check_id  uuid,
  -- o teste que o agendamento começou e ainda não foi comparado
  running_check_id   uuid,
  next_run_at        timestamptz,
  last_run_at        timestamptz,
  last_alert_at      timestamptz,
  alerts_sent        integer not null default 0,
  ip_hash            text,
  created_at         timestamptz not null default now(),
  confirmed_at       timestamptz,
  stopped_at         timestamptz
);

-- o mesmo app no mesmo e-mail só tem um monitor ligado (ou esperando confirmação)
create unique index if not exists monitors_open_email_url_key on public.monitors (lower(email), url) where status <> 'stopped';
create index if not exists monitors_due_idx on public.monitors (next_run_at) where status = 'active';
create index if not exists monitors_ip_idx on public.monitors (ip_hash, created_at desc);

alter table public.monitors enable row level security;
revoke all on public.monitors from anon, authenticated;

-- cada teste feito pelo monitor aponta para ele (os testes do /check continuam com monitor_id vazio)
alter table public.app_checks add column if not exists monitor_id uuid;
create index if not exists app_checks_monitor_idx on public.app_checks (monitor_id, created_at desc) where monitor_id is not null;

-- ---------------------------------------------------------------- app_check_stats (sem os testes do monitor)
-- Os números públicos ("X apps testados pelas pessoas que os construíram") contam só os testes que as pessoas
-- fizeram; as execuções diárias do monitor ficam de fora para não inflar a contagem. O resto é igual à 20261124000000.
create or replace function public.app_check_stats()
returns jsonb
language sql
stable
set search_path = public
as $$
  with done as (
    select result from app_checks where status = 'done' and result is not null and monitor_id is null
  ),
  fails as (
    select c->>'id' as id, count(*)::int as n
    from done, jsonb_array_elements(done.result->'checks') as c
    where c->>'verdict' = 'fail'
    group by 1
  )
  select jsonb_build_object(
    'checked', (select count(*)::int from done),
    'with_failure', (select count(*)::int from done where coalesce((result->'summary'->>'fail')::int, 0) > 0),
    'top_failure', (select jsonb_build_object('id', id, 'count', n) from fails order by n desc, id limit 1)
  );
$$;

revoke all on function public.app_check_stats() from public, anon, authenticated;
grant execute on function public.app_check_stats() to service_role;
