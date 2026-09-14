-- Publishub Partners: link de indicação e quem chegou por ele.
-- profiles.referral_code é o código do link (/?ref=CODE); referrals guarda uma
-- linha por conta indicada. A conversão é lida de purchases (compra paga da conta
-- indicada), então não há coluna de "convertido" aqui.
-- Só o backend (service_role) escreve; RLS ligado, sem policies novas.

alter table public.profiles add column if not exists referral_code text unique;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users (id) on delete cascade,
  referred_user_id uuid not null unique references auth.users (id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  check (referrer_id <> referred_user_id)
);

create index if not exists referrals_referrer_id_idx on public.referrals (referrer_id);

alter table public.referrals enable row level security;
