-- Publishub — o que o criador decidiu sobre cada corte sugerido
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260927000000).
--
-- A IA sugere, o criador decide. Cada sugestão de corte de uma análise pode ser
-- aceita, rejeitada ou aceita com o trecho ajustado. Uma linha por sugestão e por
-- pessoa: mudar de ideia substitui a decisão; voltar para "pendente" apaga a linha.
--
-- É a base simples das preferências: quanto cada pessoa aceita, rejeita e ajusta de
-- cada tipo de corte (kind), para as sugestões futuras se parecerem com o que ela escolhe.
--
-- Rodar de novo não falha.

create table if not exists public.suggestion_decisions (
  id               uuid primary key default gen_random_uuid(),
  analysis_id      uuid not null references public.analyses (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  -- a posição da sugestão na lista da análise (o resultado da análise não muda depois de pronto)
  suggestion_index integer not null check (suggestion_index >= 0 and suggestion_index < 100),
  kind             text,
  -- o trecho como a IA sugeriu
  start_seconds    numeric(8, 2) not null,
  end_seconds      numeric(8, 2) not null,
  decision         text not null check (decision in ('accepted', 'rejected')),
  -- preenchidos só quando o criador ajustou o trecho antes de aceitar
  adjusted_start   numeric(8, 2),
  adjusted_end     numeric(8, 2),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (analysis_id, user_id, suggestion_index)
);

create index if not exists suggestion_decisions_user_idx on public.suggestion_decisions (user_id, kind);

alter table public.suggestion_decisions enable row level security;

-- Cada um lê as próprias decisões; a escrita continua sendo só do backend.
drop policy if exists "suggestion_decisions_select_own" on public.suggestion_decisions;
create policy "suggestion_decisions_select_own" on public.suggestion_decisions
  for select to authenticated using ((select auth.uid()) = user_id);
