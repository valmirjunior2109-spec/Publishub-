-- Publishub — enviar a análise para o Notion.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260922000000).
--
-- A pessoa conecta a conta DELA no Notion (OAuth, sem API key), escolhe onde as
-- análises vão cair e o Publishub cria uma página lá. O token fica cifrado: nem
-- quem lê a tabela consegue usar a conta de ninguém.

create table if not exists public.notion_connections (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  -- cifrado no backend (Fernet) e nunca devolvido para a tela
  access_token      text not null,
  bot_id            text,
  workspace_id      text,
  workspace_name    text,
  workspace_icon    text,
  -- onde as análises são criadas: uma página ("page") ou uma base ("data_source")
  target_type       text check (target_type in ('page', 'data_source')),
  target_id         text,
  target_title      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists notion_connections_set_updated_at on public.notion_connections;
create trigger notion_connections_set_updated_at
  before update on public.notion_connections
  for each row execute function public.set_updated_at();

alter table public.notion_connections enable row level security;
-- Ninguém lê esta tabela pelo PostgREST: o token só existe para o backend usar.
-- Sem policy de select, a chave anônima não vê nada (a service_role ignora RLS).

-- A página criada no Notion para cada análise: é o link que a tela mostra depois.
create table if not exists public.notion_exports (
  id           uuid primary key default gen_random_uuid(),
  analysis_id  uuid not null unique references public.analyses (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  page_id      text not null,
  page_url     text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists notion_exports_user_id_idx on public.notion_exports (user_id, created_at desc);

drop trigger if exists notion_exports_set_updated_at on public.notion_exports;
create trigger notion_exports_set_updated_at
  before update on public.notion_exports
  for each row execute function public.set_updated_at();

alter table public.notion_exports enable row level security;

drop policy if exists "notion_exports_select_own" on public.notion_exports;
create policy "notion_exports_select_own" on public.notion_exports
  for select to authenticated using ((select auth.uid()) = user_id);
