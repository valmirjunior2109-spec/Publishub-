-- Extrator de e-mails do scanner: de qual página pública da loja veio cada e-mail.
-- Migração só ADITIVA: uma coluna opcional e um índice. Nada é apagado.

-- a página onde o e-mail apareceu (ex.: https://loja.com/pages/contact); nula nos leads deixados pela pessoa
alter table public.leads add column if not exists source_page text;

-- o /admin e o limite de 3 e-mails por loja buscam por loja e origem (source = 'auto_extract')
create index if not exists leads_store_source_idx on public.leads (store_url, source);
