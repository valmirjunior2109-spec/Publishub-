-- Founding Customers: a assinatura paga da Publishub (verificação de código gerado por IA).
-- Migração só ADITIVA: uma tabela e uma função novas. A tabela antiga `subscriptions` (do produto
-- de vídeo, planos creator/pro) não é tocada; esta é separada para os dois nunca se misturarem.
--
-- Quem escreve aqui é só o webhook do Stripe (/api/stripe/webhook), pela função abaixo, com o objeto
-- que o próprio Stripe manda (nunca com o que o navegador diz). RLS ligado, sem policy; só a service_role.

create table if not exists public.founding_subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  -- uma linha por assinatura do Stripe: o mesmo evento repetido atualiza a mesma linha
  stripe_subscription_id      text not null unique,
  stripe_customer_id          text,
  stripe_checkout_session_id  text,
  stripe_price_id             text,
  email                       text,
  -- o status do Stripe, sem tradução: active, trialing, past_due, canceled, unpaid, incomplete…
  status                      text,
  current_period_end          timestamptz,
  cancel_at_period_end        boolean not null default false,
  canceled_at                 timestamptz,
  last_paid_at                timestamptz,
  last_payment_failed_at      timestamptz,
  -- a hora do evento que definiu o status: um evento mais antigo, entregue depois, não sobrescreve
  status_event_at             timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists founding_subscriptions_email_idx on public.founding_subscriptions (lower(email));
create index if not exists founding_subscriptions_status_idx on public.founding_subscriptions (status);

alter table public.founding_subscriptions enable row level security;
revoke all on public.founding_subscriptions from anon, authenticated;

-- ---------------------------------------------------------------- founding_subscription_upsert
-- Aplica um evento do Stripe. Campos ausentes (nulos) nunca apagam o que já se sabia.
-- p: { subscription_id*, event_created* (unix), customer_id, checkout_session_id, price_id, email,
--      status, current_period_end (unix), cancel_at_period_end, canceled_at (unix), paid, payment_failed }
create or replace function public.founding_subscription_upsert(p jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_at timestamptz := to_timestamp((p->>'event_created')::bigint);
  v_has_status boolean := p ? 'status' and p->>'status' is not null;
begin
  if coalesce(p->>'subscription_id', '') = '' then
    raise exception 'subscription_id is required';
  end if;

  insert into founding_subscriptions as f (
    stripe_subscription_id, stripe_customer_id, stripe_checkout_session_id, stripe_price_id, email,
    status, current_period_end, cancel_at_period_end, canceled_at,
    last_paid_at, last_payment_failed_at, status_event_at
  ) values (
    p->>'subscription_id', p->>'customer_id', p->>'checkout_session_id', p->>'price_id', lower(p->>'email'),
    case when v_has_status then p->>'status' end,
    to_timestamp((p->>'current_period_end')::bigint),
    coalesce((p->>'cancel_at_period_end')::boolean, false),
    to_timestamp((p->>'canceled_at')::bigint),
    case when (p->>'paid')::boolean then v_at end,
    case when (p->>'payment_failed')::boolean then v_at end,
    case when v_has_status then v_at end
  )
  on conflict (stripe_subscription_id) do update set
    stripe_customer_id         = coalesce(excluded.stripe_customer_id, f.stripe_customer_id),
    stripe_checkout_session_id = coalesce(excluded.stripe_checkout_session_id, f.stripe_checkout_session_id),
    stripe_price_id            = coalesce(excluded.stripe_price_id, f.stripe_price_id),
    email                      = coalesce(excluded.email, f.email),
    -- o status e os campos da assinatura só mudam com um evento de assinatura igual ou mais novo
    status = case when v_has_status and (f.status_event_at is null or v_at >= f.status_event_at) then excluded.status else f.status end,
    current_period_end = case when v_has_status and (f.status_event_at is null or v_at >= f.status_event_at)
      then coalesce(excluded.current_period_end, f.current_period_end) else f.current_period_end end,
    cancel_at_period_end = case when v_has_status and (f.status_event_at is null or v_at >= f.status_event_at)
      then excluded.cancel_at_period_end else f.cancel_at_period_end end,
    canceled_at = case when v_has_status and (f.status_event_at is null or v_at >= f.status_event_at)
      then excluded.canceled_at else f.canceled_at end,
    status_event_at = case when v_has_status then greatest(f.status_event_at, v_at) else f.status_event_at end,
    last_paid_at = greatest(f.last_paid_at, excluded.last_paid_at),
    last_payment_failed_at = greatest(f.last_payment_failed_at, excluded.last_payment_failed_at),
    updated_at = now();
end;
$$;

revoke all on function public.founding_subscription_upsert(jsonb) from public, anon, authenticated;
grant execute on function public.founding_subscription_upsert(jsonb) to service_role;

-- Para ver no SQL Editor:
--   select email, status, current_period_end, cancel_at_period_end, last_paid_at, created_at
--   from public.founding_subscriptions order by created_at desc;
