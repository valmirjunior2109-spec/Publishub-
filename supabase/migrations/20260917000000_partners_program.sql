-- Publishub Partners (programa de comissão): quem entra no programa ganha uma
-- comissão sobre o que cada conta indicada por ele pagar de verdade.
--
-- O que já existia continua onde estava e não é duplicado:
--   * o código do link é profiles.referral_code (migração 20260915);
--   * quem chegou por /?ref=CODE vira uma linha em referrals;
--   * o valor pago vem de purchases (Stripe).
-- Aqui entram só as três coisas que ainda não existiam: quem é Partner,
-- quantos cliques o link recebeu e quanto é devido.
--
-- Só o backend (service_role) lê e escreve: RLS ligado, sem policies.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  -- fração do valor pago (0.30 = 30%)
  commission_rate numeric(5, 4) not null default 0.3000 check (commission_rate >= 0 and commission_rate <= 1),
  status text not null default 'active' check (status in ('pending', 'active', 'paused')),
  created_at timestamptz not null default now()
);

-- Uma linha por visita ao link. Guardamos o código (não o partner) porque o
-- clique acontece antes de qualquer login e o código é o que vem na URL.
create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  created_at timestamptz not null default now()
);

create index if not exists referral_clicks_code_idx on public.referral_clicks (code);

-- Uma comissão por compra paga de uma conta indicada. purchase_id é único: a
-- mesma compra nunca gera duas comissões, mesmo se o webhook repetir.
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  referral_id uuid not null references public.referrals (id) on delete cascade,
  purchase_id uuid not null unique references public.purchases (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null,
  -- 'pending' = devida e ainda não paga ao Partner (pagamento é manual no MVP);
  -- 'reversed' = a compra foi reembolsada.
  status text not null default 'pending' check (status in ('pending', 'paid', 'reversed')),
  created_at timestamptz not null default now()
);

create index if not exists commissions_partner_id_idx on public.commissions (partner_id);

alter table public.partners enable row level security;
alter table public.referral_clicks enable row level security;
alter table public.commissions enable row level security;
