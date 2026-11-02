-- Comissão do Partner também sobre as mensalidades (Creator e Pro).
--
-- Até aqui a comissão nascia só de uma compra única (purchases). Agora cada fatura
-- paga de uma assinatura de quem foi indicado gera a sua: uma por fatura
-- (stripe_invoice_id único), com o pagamento guardado para estornar num reembolso.
alter table public.commissions alter column purchase_id drop not null;
alter table public.commissions add column if not exists stripe_invoice_id text unique;
alter table public.commissions add column if not exists stripe_payment_intent text;
create index if not exists commissions_payment_intent_idx on public.commissions (stripe_payment_intent);

-- toda comissão vem de uma compra ou de uma fatura
alter table public.commissions drop constraint if exists commissions_source_check;
alter table public.commissions add constraint commissions_source_check check (purchase_id is not null or stripe_invoice_id is not null);
