-- Confiança no teste grátis (/check): quem fez o teste pode apagar o relatório, e o site mostra
-- números agregados e anônimos dos testes que as próprias pessoas fizeram nos seus apps.
-- Migração só ADITIVA. Rode DEPOIS de 20261123000000_growth_app_check_referrals.sql e ANTES do deploy.

-- o hash do token que o navegador de quem criou o teste guarda (o token em si nunca fica no banco)
alter table public.app_checks add column if not exists delete_token_hash text;

-- ---------------------------------------------------------------- app_check_stats
-- Só contagens: nenhuma URL, nenhum e-mail, nada que identifique um app.
-- checked: testes concluídos; with_failure: com pelo menos uma falha; top_failure: a verificação
-- que mais falhou (id e quantas vezes).
create or replace function public.app_check_stats()
returns jsonb
language sql
stable
set search_path = public
as $$
  with done as (
    select result from app_checks where status = 'done' and result is not null
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
