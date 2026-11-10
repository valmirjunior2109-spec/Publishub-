-- Founding Customers, modelo pré-lançamento: a RESERVA (compromisso), sem cobrança.
-- Migração só ADITIVA: uma tabela e duas funções novas.
--
-- Como funciona:
--   1. Hoje: o Stripe Checkout em modo "setup" guarda o cartão (com autorização para cobranças futuras)
--      e cria o cliente no Stripe. Nada é cobrado e nenhuma assinatura é criada. O webhook grava a
--      reserva aqui, com status 'reserved'.
--   2. No lançamento: scripts/founding-activate.mjs avisa e cria a assinatura de cada reserva, com a
--      primeira cobrança no mínimo 7 dias depois do aviso. A reserva vira 'activated' e a assinatura
--      passa a ser acompanhada em public.founding_subscriptions (pelos eventos do webhook).
--   3. Quem desistir antes do lançamento: 'canceled' (o cartão é removido do cliente no Stripe).
--
-- RLS ligado, sem policy: só a service_role (o servidor) lê e escreve.

create table if not exists public.founding_commitments (
  id                          uuid primary key default gen_random_uuid(),
  -- uma reserva por sessão do Checkout: o mesmo evento repetido atualiza a mesma linha
  stripe_checkout_session_id  text not null unique,
  stripe_customer_id          text,
  stripe_setup_intent_id      text,
  -- o preço que vale no lançamento (o preço recorrente do Founding Customers)
  stripe_price_id             text,
  email                       text,
  status                      text not null default 'reserved' check (status in ('reserved', 'canceled', 'activated')),
  utm_source                  text,
  utm_medium                  text,
  utm_campaign                text,
  utm_content                 text,
  -- preenchidos no lançamento pelo script de ativação
  stripe_subscription_id      text,
  first_charge_at             timestamptz,
  activated_at                timestamptz,
  canceled_at                 timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists founding_commitments_status_idx on public.founding_commitments (status, created_at desc);
create index if not exists founding_commitments_email_idx on public.founding_commitments (lower(email));

alter table public.founding_commitments enable row level security;
revoke all on public.founding_commitments from anon, authenticated;

-- ---------------------------------------------------------------- founding_commitment_upsert
-- Grava a reserva vinda do webhook (checkout.session.completed em modo setup).
-- Nunca rebaixa uma reserva já ativada ou cancelada, e campos nulos não apagam o que já se sabia.
create or replace function public.founding_commitment_upsert(p jsonb)
returns void
language plpgsql
set search_path = public
as $$
begin
  if coalesce(p->>'checkout_session_id', '') = '' then
    raise exception 'checkout_session_id is required';
  end if;
  insert into founding_commitments as c (
    stripe_checkout_session_id, stripe_customer_id, stripe_setup_intent_id, stripe_price_id, email,
    utm_source, utm_medium, utm_campaign, utm_content
  ) values (
    p->>'checkout_session_id', p->>'customer_id', p->>'setup_intent_id', p->>'price_id', lower(p->>'email'),
    p->>'utm_source', p->>'utm_medium', p->>'utm_campaign', p->>'utm_content'
  )
  on conflict (stripe_checkout_session_id) do update set
    stripe_customer_id     = coalesce(excluded.stripe_customer_id, c.stripe_customer_id),
    stripe_setup_intent_id = coalesce(excluded.stripe_setup_intent_id, c.stripe_setup_intent_id),
    stripe_price_id        = coalesce(excluded.stripe_price_id, c.stripe_price_id),
    email                  = coalesce(excluded.email, c.email),
    updated_at             = now();
end;
$$;

-- ---------------------------------------------------------------- founding_commitments_report
-- O que o /admin mostra: os totais e a lista de reservas. No SQL Editor: select jsonb_pretty(public.founding_commitments_report());
create or replace function public.founding_commitments_report()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'reserved', (select count(*) from founding_commitments where status = 'reserved'),
      'activated', (select count(*) from founding_commitments where status = 'activated'),
      'canceled', (select count(*) from founding_commitments where status = 'canceled')
    ),
    'commitments', coalesce((
      select jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc)
      from (
        select email, status, utm_source, utm_campaign, stripe_customer_id, stripe_subscription_id, first_charge_at, created_at
        from founding_commitments order by created_at desc limit 2000
      ) r
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------- para o lançamento (scripts/founding-activate.mjs)
-- As reservas que ainda esperam o lançamento.
create or replace function public.founding_commitments_pending()
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r.created_at), '[]'::jsonb)
  from (
    select stripe_checkout_session_id, stripe_customer_id, stripe_setup_intent_id, stripe_price_id, email, created_at
    from founding_commitments where status = 'reserved'
  ) r;
$$;

-- Marca uma reserva como ativada (só se ainda estiver 'reserved'). Devolve true se marcou.
create or replace function public.founding_commitment_activate(p_session text, p_subscription text, p_first_charge timestamptz)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update founding_commitments
  set status = 'activated', stripe_subscription_id = p_subscription, first_charge_at = p_first_charge, activated_at = now(), updated_at = now()
  where stripe_checkout_session_id = p_session and status = 'reserved';
  return found;
end;
$$;

revoke all on function public.founding_commitment_upsert(jsonb) from public, anon, authenticated;
revoke all on function public.founding_commitments_report() from public, anon, authenticated;
revoke all on function public.founding_commitments_pending() from public, anon, authenticated;
revoke all on function public.founding_commitment_activate(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.founding_commitment_upsert(jsonb) to service_role;
grant execute on function public.founding_commitments_report() to service_role;
grant execute on function public.founding_commitments_pending() to service_role;
grant execute on function public.founding_commitment_activate(text, text, timestamptz) to service_role;
