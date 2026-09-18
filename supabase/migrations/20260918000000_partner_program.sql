-- Publishub Partners (convite): creators aprovados ganham o Lifetime de graça.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260915).
--
--   * profiles.is_partner é a fonte da verdade do status. O backend lê essa flag em
--     entitlement() e concede o Lifetime; o navegador nunca decide isso. Quem escreve
--     é só o backend (service_role, pelo CLI `python -m app.manage_partners`): o RLS de
--     profiles só tem policy de select, então o cliente não consegue se promover.
--   * O código e a atribuição continuam sendo os de 20260915 (profiles.referral_code e
--     referrals): o Partner usa o mesmo link /?ref=CODE, sem sistema paralelo.
--   * referral_clicks guarda uma linha por visitante que abriu o link de um Partner.

alter table public.profiles
  add column if not exists is_partner boolean not null default false,
  add column if not exists partner_since timestamptz;

create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists referral_clicks_referrer_id_idx on public.referral_clicks (referrer_id);

alter table public.referral_clicks enable row level security;

-- As estatísticas do painel do Partner, numa consulta só (sem listas de ids na URL e
-- sem o limite de linhas do PostgREST):
--   clicks       visitantes que abriram o link
--   signups      contas criadas pelo link (linhas de referrals)
--   active_users contas indicadas que registraram ao menos um vídeo
--   conversions  contas indicadas com compra paga (cada conta conta uma vez, igual ao
--                progresso do Partners aberto; reembolso deixa de contar)
create or replace function public.partner_stats(p_partner uuid)
returns table (clicks bigint, signups bigint, active_users bigint, conversions bigint)
language sql
stable
set search_path = ''
as $$
  select
    (select count(*) from public.referral_clicks c where c.referrer_id = p_partner),
    (select count(*) from public.referrals r where r.referrer_id = p_partner),
    (select count(distinct v.user_id)
       from public.videos v
       join public.referrals r on r.referred_user_id = v.user_id
      where r.referrer_id = p_partner),
    (select count(distinct p.user_id)
       from public.purchases p
       join public.referrals r on r.referred_user_id = p.user_id
      where r.referrer_id = p_partner and p.status = 'paid');
$$;

-- Funções em public ficam expostas pela API com a chave pública: só o backend chama esta.
revoke execute on function public.partner_stats(uuid) from public, anon, authenticated;
grant execute on function public.partner_stats(uuid) to service_role;
