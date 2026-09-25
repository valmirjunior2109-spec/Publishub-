-- Publishub — a análise paga e o e-mail de quem ainda não comprou.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260925000000).
--
-- A análise grátis mostra a queda e as duas primeiras recomendações; o resto só
-- sai do servidor quando ela é paga. O checkout leva o id da análise no
-- client_reference_id, e o webhook do Stripe marca aqui que ela foi paga.
--
-- Quem ainda não comprou pode deixar o e-mail para receber a análise: isso vai
-- para `leads`, que só o backend lê e escreve.
--
-- Rodar de novo não falha.

-- quando a análise foi paga (nulo = não foi). Reembolso volta para nulo.
alter table public.analyses
  add column if not exists paid_at timestamptz;

-- de qual análise veio a compra: é por ela que o reembolso sabe o que fechar de novo
alter table public.purchases
  add column if not exists analysis_id uuid references public.analyses (id) on delete set null;

create index if not exists purchases_analysis_id_idx on public.purchases (analysis_id)
  where analysis_id is not null;

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  -- a análise apagada (conta apagada) leva o e-mail junto
  analysis_id uuid references public.analyses (id) on delete cascade,
  -- o idioma do site quando o e-mail foi deixado: é nele que a mensagem sai
  locale      text,
  created_at  timestamptz not null default now(),
  -- o mesmo e-mail na mesma análise é um lead só, por mais que o botão seja clicado
  unique (email, analysis_id)
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- Só o backend (service_role) lê e escreve: RLS ligado e sem policies.
alter table public.leads enable row level security;
