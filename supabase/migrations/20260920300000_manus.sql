-- Publishub — integração com o Manus (opcional).
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260920200000).
--
-- O plano de ação pode ser mandado para o Manus, que executa o trabalho a partir
-- dele. Quem conecta é o criador, com a chave dele: os créditos são dele, e o
-- Publishub não depende disso para nada. Sem estas tabelas, o resto do produto
-- funciona igual e a seção some da tela.

-- A chave da API do Manus, cifrada no backend antes de chegar aqui. Só o backend
-- (service_role) lê e escreve: RLS ligado e sem policy nenhuma, então nem com a
-- chave pública nem com a sessão do usuário esta tabela é legível.
create table if not exists public.manus_connections (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  api_key       text not null,  -- cifrada (Fernet), nunca em claro
  key_hint      text not null,  -- os últimos caracteres, só para a tela dizer qual chave é
  connected_at  timestamptz not null default now(),
  last_error    text
);

alter table public.manus_connections enable row level security;

-- Uma linha por envio: qual análise virou qual tarefa no Manus.
create table if not exists public.manus_tasks (
  id           uuid primary key default gen_random_uuid(),
  analysis_id  uuid not null unique references public.analyses (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  task_id      text not null,
  task_url     text,
  -- espelho do status do Manus (running, stopped, waiting, error)
  status       text not null default 'running',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists manus_tasks_user_id_idx on public.manus_tasks (user_id, created_at desc);

drop trigger if exists manus_tasks_set_updated_at on public.manus_tasks;
create trigger manus_tasks_set_updated_at
  before update on public.manus_tasks
  for each row execute function public.set_updated_at();

alter table public.manus_tasks enable row level security;

-- A tarefa em si não é segredo: cada um lê as próprias (a escrita continua só no backend).
drop policy if exists "manus_tasks_select_own" on public.manus_tasks;
create policy "manus_tasks_select_own" on public.manus_tasks
  for select to authenticated using ((select auth.uid()) = user_id);
