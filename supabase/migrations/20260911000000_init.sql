-- Publishub MVP — schema inicial.
-- Execute no Supabase: Dashboard → SQL Editor → cole este arquivo → Run.
-- (Ou com a Supabase CLI: `supabase link` + `supabase db push`.)
--
-- Modelo de acesso:
--   * O frontend usa a chave pública (anon/publishable) + a sessão do usuário.
--     Pelo RLS, cada usuário só LÊ as próprias linhas e só envia arquivos
--     para a própria pasta no Storage.
--   * Todas as ESCRITAS em videos/analyses são feitas pelo backend FastAPI com
--     a chave service_role (que ignora RLS), depois de validar o token do
--     usuário. Por isso não há policies de insert/update/delete nessas tabelas.

-- ---------------------------------------------------------------- tabelas

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now()
);

create table public.videos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  filename          text not null check (char_length(filename) between 1 and 255),
  storage_path      text not null unique,
  size_bytes        bigint not null check (size_bytes > 0),
  mime_type         text not null,
  duration_seconds  numeric(10, 2),
  status            text not null default 'uploaded'
                    check (status in ('uploaded', 'processing', 'analyzed', 'failed')),
  created_at        timestamptz not null default now(),
  -- permite que analyses referencie (video, dono) e garanta que são do mesmo usuário
  unique (id, user_id)
);

create table public.analyses (
  id             uuid primary key default gen_random_uuid(),
  video_id       uuid not null,
  user_id        uuid not null references auth.users (id) on delete cascade,
  status         text not null default 'pending'
                 check (status in ('pending', 'processing', 'completed', 'failed')),
  result         jsonb,
  error_message  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (video_id, user_id) references public.videos (id, user_id) on delete cascade
);

create index videos_user_id_created_at_idx on public.videos (user_id, created_at desc);
create index analyses_user_id_created_at_idx on public.analyses (user_id, created_at desc);
create index analyses_video_id_idx on public.analyses (video_id);
create index analyses_unfinished_idx on public.analyses (status) where status in ('pending', 'processing');

-- ---------------------------------------------------------------- triggers

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger analyses_set_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();

-- Cria o perfil automaticamente quando alguém se cadastra pelo Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.analyses enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "videos_select_own" on public.videos
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "analyses_select_own" on public.analyses
  for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- storage

-- Bucket privado: vídeos só são acessíveis pela dona do arquivo ou pelo backend.
-- O limite de tamanho aqui deve ser igual a MAX_UPLOAD_MB do backend
-- (no plano gratuito do Supabase o máximo por arquivo é 50 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuário envia arquivos apenas para a pasta "<seu user id>/..."
create policy "videos_bucket_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "videos_bucket_select_own_folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
