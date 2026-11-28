-- Pedidos de verificação manual: no fim do relatório do /check, a pessoa pede ao Valmir para verificar um
-- fluxo que o teste grátis não abre (cadastro, login, checkout…). É o começo do serviço feito à mão
-- (concierge) com os primeiros clientes. Cada pedido fica aqui e também é encaminhado por e-mail ao fundador.
-- Migração só ADITIVA: uma tabela nova, nada existente é alterado.
--
-- Segurança: RLS ligado, sem policy. Só a service_role (o servidor) lê e escreve.

create table if not exists public.verification_requests (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (length(email) <= 320),
  app_url       text check (length(app_url) <= 300),
  -- signup | login | checkout | form | logged_in | other (os mesmos de waitlist.priority_flow)
  flow          text not null check (length(flow) <= 40),
  -- o app já tem usuários pagantes? yes | users_no_revenue | no_users
  paying        text check (paying in ('yes', 'users_no_revenue', 'no_users')),
  note          text check (length(note) <= 1000),
  -- o relatório de onde veio o pedido (para o fundador abrir antes de responder)
  check_id      uuid,
  locale        text check (locale in ('en', 'pt')),
  -- o e-mail para o fundador saiu? (false = só ficou guardado aqui)
  emailed       boolean not null default false,
  -- o fundador já respondeu? (marcado à mão no /admin no futuro; por enquanto, só para o SQL)
  status        text not null default 'new' check (status in ('new', 'contacted', 'customer', 'not_a_fit')),
  ip_hash       text,
  created_at    timestamptz not null default now()
);

create index if not exists verification_requests_created_idx on public.verification_requests (created_at desc);
create index if not exists verification_requests_ip_idx on public.verification_requests (ip_hash, created_at desc);

alter table public.verification_requests enable row level security;
revoke all on public.verification_requests from anon, authenticated;
