-- O scanner de acessibilidade para lojas Shopify foi descontinuado (o código saiu do site).
-- Esta migração é forward-only e NÃO apaga dados: tira as tabelas que eram só do scanner do schema
-- public (que o PostgREST/Supabase API expõe) e as guarda no schema legacy_archive, sem acesso para
-- anon e authenticated. Assim o histórico fica disponível para exportar ou apagar depois, por decisão
-- explícita, e a migração 20261107000000_accessibility_scanner.sql (já aplicada) não é alterada.
--
-- O que é do scanner (criado em 20261107000000_accessibility_scanner.sql):
--   public.scans       → legacy_archive.scans        (URL da loja, status, risk score, hash de IP)
--   public.scan_pages  → legacy_archive.scan_pages   (páginas de cada scan; FK para scans, on delete cascade)
--   public.issues      → legacy_archive.issues       (violações do axe-core; FK para scans, on delete cascade)
--   índices scans_queue_idx e scans_ip_recent_idx    → removidos (só serviam à fila e ao rate limit do scanner)
-- Nenhuma função, trigger, policy ou view foi criada pelo scanner (RLS ligado, sem policies).
--
-- O que FICA em public, de propósito:
--   public.reservations: pagamentos reais (reserva de US$ 49). O webhook do Stripe ainda grava expirações e
--     reembolsos nela, e o /admin a lista. A FK reservations.scan_id continua válida (passa a apontar para
--     legacy_archive.scans: o Postgres guarda a FK pelo OID da tabela, não pelo nome).
--   public.leads: tabela compartilhada com o backend do produto de vídeo. As colunas store_url, scan_id e
--     source (do scanner) ficam, para não perder dados; só ganham um comentário. A FK leads.scan_id
--     também passa a apontar para legacy_archive.scans.
--   Tudo o que é da lista de espera, do Founding Customers, de usuários e de cobrança: não é tocado.
--
-- Reverter (se for preciso): alter table legacy_archive.<tabela> set schema public; para as três tabelas.
-- Apagar de vez (só depois de exportar o que interessar): veja o bloco comentado no fim.

create schema if not exists legacy_archive;
comment on schema legacy_archive is 'Dados históricos de produtos descontinuados (ex.: o scanner de acessibilidade para lojas Shopify). Sem acesso pela API.';

-- Sem acesso pela API: só o dono do banco (postgres) lê, pelo SQL Editor ou por conexão direta.
revoke all on schema legacy_archive from public;
revoke all on schema legacy_archive from anon, authenticated;

do $$
begin
  if to_regclass('public.issues') is not null then
    alter table public.issues set schema legacy_archive;
  end if;
  if to_regclass('public.scan_pages') is not null then
    alter table public.scan_pages set schema legacy_archive;
  end if;
  if to_regclass('public.scans') is not null then
    alter table public.scans set schema legacy_archive;
  end if;
end
$$;

-- os índices de fila e de rate limit do scanner (não guardam dados; recriáveis)
drop index if exists legacy_archive.scans_queue_idx;
drop index if exists legacy_archive.scans_ip_recent_idx;

-- As tabelas arquivadas: RLS continua ligado e sem policies; nenhum privilégio para os papéis da API.
do $$
declare
  t text;
begin
  foreach t in array array['scans', 'scan_pages', 'issues'] loop
    if to_regclass('legacy_archive.' || t) is not null then
      execute format('revoke all on legacy_archive.%I from anon, authenticated', t);
      execute format('comment on table legacy_archive.%I is %L', t,
        'Arquivo do scanner de acessibilidade descontinuado (migração 20261122000000). Somente leitura histórica.');
    end if;
  end loop;
end
$$;

-- Colunas do scanner que ficam em public (dados preservados)
do $$
begin
  if to_regclass('public.reservations') is not null then
    comment on table public.reservations is
      'Reservas de US$ 49 do scanner descontinuado (pagamento único). Não são mais vendidas; mantidas como registro de pagamento e para reembolsos.';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'leads' and column_name = 'scan_id') then
    comment on column public.leads.scan_id is 'Legado: scan do scanner descontinuado (legacy_archive.scans).';
    comment on column public.leads.store_url is 'Legado: loja informada no scanner descontinuado.';
    comment on column public.leads.source is 'Legado: origem do lead no scanner descontinuado.';
  end if;
end
$$;

-- ---------------------------------------------------------------- apagar de vez (NÃO roda aqui)
-- Só depois de exportar o que interessar e de decidir apagar o histórico. Rodar à mão no SQL Editor:
--
--   alter table public.leads drop constraint if exists leads_scan_id_fkey;
--   alter table public.reservations drop constraint if exists reservations_scan_id_fkey;
--   drop table if exists legacy_archive.issues;
--   drop table if exists legacy_archive.scan_pages;
--   drop table if exists legacy_archive.scans;
--
-- (as colunas leads.scan_id e reservations.scan_id ficam como uuid simples, sem FK)
