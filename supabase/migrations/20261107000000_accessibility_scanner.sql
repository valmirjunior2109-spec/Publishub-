-- Publishub vira scanner de acessibilidade para lojas Shopify.
-- Migração só ADITIVA: cria tabelas novas e acrescenta colunas opcionais em `leads`.
-- Nada do produto anterior é apagado (as tabelas antigas continuam onde estão).
--
-- Segurança: RLS ligado em todas, sem nenhuma policy. Só o servidor (service_role,
-- que ignora o RLS) lê e escreve. O relatório é lido pelo servidor a partir do id
-- uuid do scan, que não dá para adivinhar.

-- ---------------------------------------------------------------- scans
create table if not exists public.scans (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,
  is_shopify   boolean,
  status       text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  risk_score   smallint check (risk_score between 0 and 100),
  created_at   timestamptz not null default now(),
  ip_hash      text,
  -- 'web' (o formulário do site) ou 'admin' (scan em lote pelo /admin)
  source       text not null default 'web',
  error        text,
  started_at   timestamptz,
  finished_at  timestamptz,
  -- o total de ocorrências por regra (o que entra no risk score)
  summary      jsonb
);

create index if not exists scans_created_at_idx on public.scans (created_at desc);
create index if not exists scans_queue_idx on public.scans (created_at) where status = 'queued';
create index if not exists scans_ip_recent_idx on public.scans (ip_hash, created_at desc);

-- ---------------------------------------------------------------- scan_pages
create table if not exists public.scan_pages (
  id           uuid primary key default gen_random_uuid(),
  scan_id      uuid not null references public.scans (id) on delete cascade,
  url          text not null,
  -- home, collection, product ou cart
  kind         text,
  status       text not null default 'running' check (status in ('running', 'done', 'failed', 'skipped')),
  error        text,
  issue_count  integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists scan_pages_scan_idx on public.scan_pages (scan_id, created_at);

-- ---------------------------------------------------------------- issues
create table if not exists public.issues (
  id            uuid primary key default gen_random_uuid(),
  scan_id       uuid not null references public.scans (id) on delete cascade,
  page_url      text not null,
  rule_id       text not null,
  impact        text not null check (impact in ('critical', 'serious', 'moderate', 'minor')),
  selector      text,
  html_snippet  text,
  -- o resumo da regra (axe), a explicação em inglês simples e a orientação geral de correção
  help          text,
  help_url      text,
  explanation   text,
  fix_guidance  text,
  -- quantos elementos desta regra existem nesta página (só alguns viram exemplo)
  occurrences   integer not null default 1,
  created_at    timestamptz not null default now()
);

create index if not exists issues_scan_idx on public.issues (scan_id);

-- ---------------------------------------------------------------- leads (já existe: só colunas novas)
-- A tabela veio do produto anterior (e-mail por análise de vídeo). As colunas novas são
-- opcionais, então as linhas antigas continuam válidas.
alter table public.leads add column if not exists store_url text;
alter table public.leads add column if not exists scan_id uuid references public.scans (id) on delete set null;
alter table public.leads add column if not exists source text;

-- o mesmo e-mail no mesmo relatório é um lead só (linhas antigas têm scan_id nulo e não colidem)
create unique index if not exists leads_email_scan_key on public.leads (email, scan_id);
create index if not exists leads_scan_idx on public.leads (scan_id);

-- ---------------------------------------------------------------- reservations
create table if not exists public.reservations (
  id                     uuid primary key default gen_random_uuid(),
  email                  text,
  store_url              text,
  scan_id                uuid references public.scans (id) on delete set null,
  stripe_session_id      text not null unique,
  stripe_payment_intent  text,
  status                 text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'expired')),
  -- em centavos, na moeda do Checkout
  amount                 integer,
  currency               text,
  created_at             timestamptz not null default now(),
  paid_at                timestamptz
);

create index if not exists reservations_created_at_idx on public.reservations (created_at desc);
create index if not exists reservations_payment_intent_idx on public.reservations (stripe_payment_intent);

-- ---------------------------------------------------------------- RLS: só o servidor
alter table public.scans enable row level security;
alter table public.scan_pages enable row level security;
alter table public.issues enable row level security;
alter table public.leads enable row level security;
alter table public.reservations enable row level security;

revoke all on public.scans, public.scan_pages, public.issues, public.reservations from anon, authenticated;
