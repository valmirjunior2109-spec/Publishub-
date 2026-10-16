-- Publishub — as assinaturas mensais (Creator e Pro), ao lado do Vitalício Fundador.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20261009000000).
--
-- O Vitalício Fundador continua em `purchases` (pagamento único). Assinatura é
-- outra coisa: ela vive, renova, atrasa e acaba, e quem diz em que estado está é
-- o Stripe. Por isso uma linha por assinatura do Stripe, atualizada pelo webhook
-- com o objeto que o próprio Stripe devolve (nunca com o que o navegador diz).
--
-- user_id fica nulo até a pessoa entrar com o e-mail do pagamento (ou quando o
-- link já veio com client_reference_id); o backend liga as duas coisas no /api/me.
-- Só o backend (service_role) lê e escreve aqui: RLS ligado e sem policies.
--
-- Rodar de novo não falha.

create table if not exists public.subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  -- única: o mesmo evento repetido pelo Stripe atualiza a mesma linha, nunca cria outra
  stripe_subscription_id      text not null unique,
  stripe_customer_id          text,
  -- a sessão de checkout que criou a assinatura (nula se o webhook da assinatura chegou antes)
  stripe_checkout_session_id  text,
  stripe_price_id             text,
  stripe_product_id           text,
  -- o plano que o preço vendia quando a linha foi gravada; nulo = produto que o backend não conhece
  plan                        text check (plan in ('creator', 'pro')),
  -- o status do Stripe, sem tradução: active, trialing, past_due, canceled, unpaid, incomplete…
  status                      text not null,
  email                       text,
  user_id                     uuid references auth.users (id) on delete set null,
  current_period_end          timestamptz,
  cancel_at_period_end        boolean not null default false,
  canceled_at                 timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists subscriptions_email_idx on public.subscriptions (email);
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;
