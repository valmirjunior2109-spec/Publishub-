-- Feedback sobre a proposta do produto (seção "Tell us what you think" da home).
-- Cada resposta fica aqui e também é encaminhada por e-mail para copilot@getpublishub.com;
-- o banco garante que nada se perde se o envio do e-mail falhar.
-- Migração só ADITIVA: uma tabela nova, nada existente é alterado.
--
-- Segurança: RLS ligado, sem policy. Só a service_role (o servidor) lê e escreve.

create table if not exists public.proposal_feedback (
  id            uuid primary key default gen_random_uuid(),
  -- a reação à proposta: would_use, maybe, not_for_me
  verdict       text not null check (verdict in ('would_use', 'maybe', 'not_for_me')),
  -- onde a pessoa deixaria o Publishub rodar: preview, read_only_prod, prod_with_writes, never_prod
  live_app      text check (live_app in ('preview', 'read_only_prod', 'prod_with_writes', 'never_prod')),
  message       text not null check (length(message) between 1 and 4000),
  email         text check (length(email) <= 320),
  -- o e-mail para copilot@ saiu? (false = só ficou guardado aqui)
  emailed       boolean not null default false,
  ip_hash       text,
  created_at    timestamptz not null default now()
);

create index if not exists proposal_feedback_created_idx on public.proposal_feedback (created_at desc);
create index if not exists proposal_feedback_ip_idx on public.proposal_feedback (ip_hash, created_at desc);

alter table public.proposal_feedback enable row level security;
revoke all on public.proposal_feedback from anon, authenticated;
