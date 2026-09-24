-- Publishub — o vídeo editado sai sozinho, e o criador diz se gostou.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260924000000).
--
-- Até aqui o criador aprovava cortes um a um antes de qualquer vídeo sair. Agora
-- a análise termina e o vídeo editado já vem junto, com os cortes que ela
-- recomendou. Embaixo dele, uma pergunta: gostou? Se não, a pessoa escreve o que
-- mudaria, e isso vira uma versão nova.
--
-- `video_edits` continua com uma linha por análise (a versão atual). O histórico
-- de feedback fica em `edit_feedback`, porque cada versão nova apaga o feedback
-- da anterior na linha, e o que a pessoa pediu é justamente o que não pode sumir.
--
-- Rodar de novo não falha.

alter table public.video_edits
  -- quem pediu esta versão: a análise (auto), o criador escolhendo cortes (manual)
  -- ou o criador dizendo o que mudaria (revision)
  add column if not exists source        text not null default 'manual'
                                         check (source in ('auto', 'manual', 'revision')),
  add column if not exists revision      integer not null default 1,
  -- o pedido do criador que gerou esta versão, e o que a IA respondeu a ele
  add column if not exists instruction   text,
  add column if not exists reply         text,
  -- o veredito sobre a versão atual (nulo = ainda não respondeu)
  add column if not exists feedback      text check (feedback in ('liked', 'disliked')),
  add column if not exists feedback_note text,
  add column if not exists feedback_at   timestamptz;

create table if not exists public.edit_feedback (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- de qual versão do vídeo editado a pessoa estava falando
  revision    integer not null default 1,
  rating      text not null check (rating in ('liked', 'disliked')),
  note        text,
  -- os cortes daquela versão, para saber depois o que exatamente não agradou
  cuts        jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists edit_feedback_analysis_idx on public.edit_feedback (analysis_id, created_at desc);
create index if not exists edit_feedback_rating_idx on public.edit_feedback (rating, created_at desc);

alter table public.edit_feedback enable row level security;

-- Cada um lê o próprio feedback; a escrita continua sendo só do backend.
drop policy if exists "edit_feedback_select_own" on public.edit_feedback;
create policy "edit_feedback_select_own" on public.edit_feedback
  for select to authenticated using ((select auth.uid()) = user_id);
