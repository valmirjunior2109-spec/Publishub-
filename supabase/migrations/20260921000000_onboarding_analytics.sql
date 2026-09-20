-- Publishub — onboarding e o funil inteiro medido.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260920400000).

-- ---------------------------------------------------------------- onboarding

-- Quando a pessoa terminou as boas-vindas. Nulo = ainda não viu.
-- É o que impede a tela de aparecer de novo.
alter table public.profiles
  add column if not exists onboarded_at timestamptz;

-- ---------------------------------------------------------------- eventos do funil

-- A lista de eventos cresceu: agora cobre signup, upload, análise e pagamento.
-- O check some e vira validação no backend (events_service.NAMES): assim um
-- evento novo é um deploy, não uma migração.
do $$ begin
  alter table public.events drop constraint events_name_check;
exception when undefined_object then null; end $$;

do $$ begin
  alter table public.events
    add constraint events_name_length check (char_length(name) between 3 and 40);
exception when duplicate_object then null; end $$;

-- Buscar "todos os eventos desta pessoa, na ordem" é a consulta que responde
-- "onde ela travou".
create index if not exists events_user_id_created_at_idx on public.events (user_id, created_at desc);
