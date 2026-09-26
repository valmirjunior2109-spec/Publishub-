-- Publishub — "Essa análise foi útil?"
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260926000000).
--
-- Uma pergunta só, embaixo da análise: foi útil ou não. Se não foi, a pessoa pode
-- dizer o que faltou. É o que diz se a análise está entregando valor, e o texto
-- do "o que faltou" é o que orienta a próxima melhoria.
--
-- Uma linha por análise e por pessoa: responder de novo substitui a resposta.
--
-- Rodar de novo não falha.

create table if not exists public.analysis_feedback (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  useful      boolean not null,
  -- "o que faltou?": só quando não foi útil, e opcional
  missing     text check (missing is null or char_length(missing) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (analysis_id, user_id)
);

create index if not exists analysis_feedback_useful_idx on public.analysis_feedback (useful, created_at desc);

alter table public.analysis_feedback enable row level security;

-- Cada um lê a própria resposta; a escrita continua sendo só do backend.
drop policy if exists "analysis_feedback_select_own" on public.analysis_feedback;
create policy "analysis_feedback_select_own" on public.analysis_feedback
  for select to authenticated using ((select auth.uid()) = user_id);
