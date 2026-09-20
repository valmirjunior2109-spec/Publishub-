-- Publishub — o grátis passa a entregar o valor inteiro antes de cobrar.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260921000000).
--
-- Antes: toda análise grátis vinha parcial (segundo e frase abertos, reescritas
-- e plano no Lifetime). O problema é que ninguém compra o que nunca viu.
--
-- Agora: as primeiras análises da conta saem completas, e só depois do limite as
-- novas vêm parciais, com o paywall explicando o que falta. A decisão é tomada
-- quando a análise nasce e fica gravada aqui — assim ela não muda debaixo de
-- quem já viu o resultado, e um limite alterado amanhã não tira nada de ninguém.

alter table public.analyses
  add column if not exists full_access boolean not null default true;

comment on column public.analyses.full_access is
  'Esta análise entrega o plano de ação completo. Falso = parcial (só o segundo da queda e a frase); quem comprar o Lifetime destrava tudo mesmo assim.';
