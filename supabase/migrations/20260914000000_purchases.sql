-- Compras do plano Creator (pagamento único no Stripe).
-- Uma linha por checkout pago. user_id fica nulo até a pessoa entrar com o e-mail
-- do pagamento; o backend liga as duas coisas no primeiro acesso.
-- Só o backend (service_role) lê e escreve aqui: RLS ligado e sem policies.

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  stripe_payment_intent text unique,
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  amount_cents integer not null,
  currency text not null,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at timestamptz not null default now(),
  refunded_at timestamptz
);

create index if not exists purchases_email_idx on public.purchases (email);
create index if not exists purchases_user_id_idx on public.purchases (user_id);

alter table public.purchases enable row level security;
