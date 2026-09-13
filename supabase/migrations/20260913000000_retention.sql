-- Publishub — o produto vira "curva de retenção": vídeo + print do Insights →
-- segundo da queda, frase transcrita, reescritas e o loop de previsão.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260911).

-- ---------------------------------------------------------------- videos

-- o print da curva de retenção (no bucket `insights`) e a hipótese do criador
alter table public.videos
  add column if not exists insights_path text unique,
  add column if not exists hypothesis    text check (char_length(hypothesis) <= 500);

-- ---------------------------------------------------------------- analyses

-- etapa em andamento (para a tela mostrar progresso real, não simulado)
-- e o resultado do loop de previsão, registrado pelo criador depois de republicar
alter table public.analyses
  add column if not exists step                text
                                               check (step in ('transcribing', 'aligning', 'diagnosing')),
  add column if not exists outcome             text not null default 'pending'
                                               check (outcome in ('pending', 'confirmed', 'refuted')),
  add column if not exists actual_retention    numeric(5, 2)
                                               check (actual_retention between 0 and 100),
  add column if not exists outcome_recorded_at timestamptz;

create index if not exists analyses_user_id_outcome_idx on public.analyses (user_id, outcome);

-- ---------------------------------------------------------------- storage: prints

-- Bucket privado para o print do Insights. Só imagens, até 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('insights', 'insights', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Mesma regra do bucket de vídeos: cada usuário só escreve e lê na própria pasta.
drop policy if exists "insights_bucket_insert_own_folder" on storage.objects;
create policy "insights_bucket_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'insights' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "insights_bucket_select_own_folder" on storage.objects;
create policy "insights_bucket_select_own_folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'insights' and (storage.foldername(name))[1] = (select auth.uid())::text);
