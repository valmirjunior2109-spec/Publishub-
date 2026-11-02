-- Publishub — os códigos do AppSumo.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20261016000000).
-- Depois rode o arquivo de importação com os 10.000 códigos (publishub-appsumo-codes-import.sql),
-- que insere só o sha256 de cada código: o código em si nunca fica no banco.
--
-- Um código é resgatado por uma conta só, uma vez. A conta pode somar até 3
-- (1 = Creator, 2 ou 3 = Pro, com o limite mensal de análises de cada nível).
-- Reembolso no AppSumo: o código vira "deactivated" e para de contar.
-- Só o backend (service_role) lê e escreve: RLS ligado e sem policies.
--
-- Rodar de novo não falha.

create table if not exists public.appsumo_codes (
  code_hash      text primary key,
  status         text not null default 'available' check (status in ('available', 'redeemed', 'deactivated')),
  user_id        uuid references auth.users (id) on delete set null,
  redeemed_at    timestamptz,
  deactivated_at timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists appsumo_codes_user_id_idx on public.appsumo_codes (user_id)
  where user_id is not null;

alter table public.appsumo_codes enable row level security;
