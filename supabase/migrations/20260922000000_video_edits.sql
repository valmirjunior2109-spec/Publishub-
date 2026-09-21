-- Publishub — cortes aplicados com aprovação do criador.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260921200000).
--
-- O Publishub sugere cortes; quem decide é o criador. Quando ele aprova, o
-- backend gera um vídeo NOVO com os trechos removidos. O original nunca é
-- tocado: esta tabela guarda o arquivo editado ao lado dele, e apagar a edição
-- não tira nada de quem enviou.

create table if not exists public.video_edits (
  id                        uuid primary key default gen_random_uuid(),
  -- uma edição por análise: reaplicar cortes substitui a anterior
  analysis_id               uuid not null unique references public.analyses (id) on delete cascade,
  user_id                   uuid not null references auth.users (id) on delete cascade,
  status                    text not null default 'pending'
                            check (status in ('pending', 'processing', 'completed', 'failed')),
  -- os trechos que o criador aprovou tirar, e os que sobraram
  cuts                      jsonb not null default '[]'::jsonb,
  kept                      jsonb,
  -- o vídeo editado no Storage (o original continua no video correspondente)
  storage_path              text,
  duration_seconds          numeric(10, 2),
  original_duration_seconds numeric(10, 2),
  removed_seconds           numeric(10, 2),
  size_bytes                bigint,
  error_code                text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists video_edits_user_id_idx on public.video_edits (user_id, created_at desc);
create index if not exists video_edits_unfinished_idx on public.video_edits (status)
  where status in ('pending', 'processing');

drop trigger if exists video_edits_set_updated_at on public.video_edits;
create trigger video_edits_set_updated_at
  before update on public.video_edits
  for each row execute function public.set_updated_at();

alter table public.video_edits enable row level security;

-- Cada um lê as próprias edições; a escrita continua sendo só do backend.
drop policy if exists "video_edits_select_own" on public.video_edits;
create policy "video_edits_select_own" on public.video_edits
  for select to authenticated using ((select auth.uid()) = user_id);
