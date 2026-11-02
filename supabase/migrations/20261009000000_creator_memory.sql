-- Publishub — a memória do criador
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260929000000).
--
-- A Publishub aprende com cada pessoa: o que ela aceita e recusa nos cortes, o que
-- pediu para mudar nos vídeos editados, o que sentiu falta nas análises e como os
-- vídeos dela vêm evoluindo. Tudo isso já mora em outras tabelas
-- (suggestion_decisions, edit_feedback, analysis_feedback, analyses); esta guarda
-- só o que é da memória em si, e que a pessoa controla:
--
--   - enabled: usar ou não a memória nas próximas análises (pausar);
--   - forgotten_at: "esquecer tudo". O que veio antes disto não entra mais na
--     memória. As decisões e o feedback continuam onde estão: a revisão de cada
--     análise antiga volta como a pessoa deixou;
--   - notes: o que a própria pessoa escreveu sobre o estilo dela;
--   - hidden: pedidos aprendidos que ela tirou da memória, um a um (o feedback
--     continua no histórico, só deixa de orientar a IA).
--
-- Uma linha por pessoa, criada no primeiro ajuste. Sem linha, a memória está
-- ligada e vazia de notas.
--
-- Rodar de novo não falha.

create table if not exists public.creator_memory (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  enabled      boolean not null default true,
  forgotten_at timestamptz,
  -- [{id, text, created_at}], no máximo 20, cada uma com até 300 caracteres (o backend confere)
  notes        jsonb not null default '[]'::jsonb,
  -- [{source: "request" | "missing", id}]
  hidden       jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists creator_memory_set_updated_at on public.creator_memory;
create trigger creator_memory_set_updated_at
  before update on public.creator_memory
  for each row execute function public.set_updated_at();

-- A memória lê o feedback por pessoa, do mais novo para o mais velho.
create index if not exists edit_feedback_user_idx on public.edit_feedback (user_id, created_at desc);
create index if not exists analysis_feedback_user_idx on public.analysis_feedback (user_id, created_at desc);

alter table public.creator_memory enable row level security;

-- Cada um lê a própria memória; a escrita continua sendo só do backend.
drop policy if exists "creator_memory_select_own" on public.creator_memory;
create policy "creator_memory_select_own" on public.creator_memory
  for select to authenticated using ((select auth.uid()) = user_id);
