-- Publishub — o plano que a análise usou fica gravado nela.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260923000000).
--
-- O Pro roda uma análise mais profunda (mais frames do vídeo e um plano maior).
-- Guardar o plano na linha, como já fazemos com full_access, garante que o que
-- a pessoa viu não mude depois: se ela trocar de plano amanhã, a análise de hoje
-- continua explicável.
--
-- Nulo nas análises antigas e nas contas grátis.

alter table public.analyses
  add column if not exists tier text check (tier in ('creator', 'pro'));
