-- Publishub — previsão cega e primeiro uso sem cadastro.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260917).
--
-- O que muda no produto:
--   * o primeiro upload aceita só o vídeo, sem conta: a IA aposta no segundo da
--     queda e a pessoa confere no Insights ("acertou" / "errou, foi em X");
--   * quem se cadastra depois leva o que já fez (guest_sessions.claimed_by);
--   * os eventos do funil ficam registrados para medir o que acontece.
--
-- Modelo de acesso: igual ao resto do projeto — só o backend (service_role)
-- escreve. RLS ligado em tudo; as linhas de convidado não têm user_id, então as
-- policies "select_own" não as expõem (o convidado lê pela API, com o token).

-- ---------------------------------------------------------------- convidados

create table if not exists public.guest_sessions (
  id          uuid primary key default gen_random_uuid(),
  -- sha256 do token que fica no navegador: o token em si nunca é guardado
  token_hash  text not null unique,
  -- sha256(ip + salt) e do user agent: servem só para o limite anti-abuso
  ip_hash     text,
  ua_hash     text,
  -- a conta que reivindicou esta sessão ao se cadastrar
  claimed_by  uuid references auth.users (id) on delete set null,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists guest_sessions_ip_hash_idx on public.guest_sessions (ip_hash, created_at desc);
create index if not exists guest_sessions_claimed_by_idx on public.guest_sessions (claimed_by);

alter table public.guest_sessions enable row level security;

-- ---------------------------------------------------------------- vídeos e análises sem conta

-- Um vídeo (e a análise dele) nasce de uma conta OU de uma sessão de convidado.
-- O check garante que sempre há um dono; o claim troca guest_id por user_id.
alter table public.videos   alter column user_id drop not null;
alter table public.analyses alter column user_id drop not null;

alter table public.videos   add column if not exists guest_id uuid references public.guest_sessions (id) on delete cascade;
alter table public.analyses add column if not exists guest_id uuid references public.guest_sessions (id) on delete cascade;

do $$ begin
  alter table public.videos add constraint videos_has_owner check (user_id is not null or guest_id is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.analyses add constraint analyses_has_owner check (user_id is not null or guest_id is not null);
exception when duplicate_object then null; end $$;

create index if not exists videos_guest_id_idx on public.videos (guest_id);
create index if not exists analyses_guest_id_idx on public.analyses (guest_id);

-- ---------------------------------------------------------------- previsão cega

-- A aposta feita só com o vídeo (sem o print): o segundo e a frase daquele
-- momento, mais a resposta de quem abriu o Insights. blind_hit usa ±1 s de
-- tolerância e é o que alimenta a métrica de precisão.
alter table public.analyses
  add column if not exists blind_at_seconds     numeric(10, 2),
  add column if not exists blind_phrase         text,
  add column if not exists blind_shown_at       timestamptz,
  add column if not exists blind_response       text
                                                check (blind_response in ('hit', 'miss')),
  add column if not exists blind_actual_seconds numeric(10, 2),
  add column if not exists blind_hit            boolean,
  add column if not exists blind_responded_at   timestamptz;

create index if not exists analyses_blind_hit_idx on public.analyses (user_id, blind_hit)
  where blind_hit is not null;

-- ---------------------------------------------------------------- eventos do funil

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null
              check (name in ('prediction_shown', 'prediction_confirmed', 'full_analysis_viewed',
                              'paywall_viewed', 'purchased', 'real_result_submitted')),
  user_id     uuid references auth.users (id) on delete set null,
  guest_id    uuid references public.guest_sessions (id) on delete set null,
  analysis_id uuid references public.analyses (id) on delete set null,
  props       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists events_name_created_at_idx on public.events (name, created_at desc);
create index if not exists events_analysis_id_idx on public.events (analysis_id);

alter table public.events enable row level security;
