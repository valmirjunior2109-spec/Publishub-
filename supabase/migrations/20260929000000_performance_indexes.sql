-- publishub — índices para as consultas que hoje varrem a tabela inteira.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260928000000).
--
-- Cada índice abaixo corresponde a uma consulta real do backend
-- (backend/app/services/supabase_service.py) ou a uma chave estrangeira com
-- "on delete cascade / set null" que não tinha índice. Sem índice, apagar a linha
-- de cima obriga o Postgres a ler a tabela de baixo inteira para achar as filhas:
-- é o que deixa lento apagar uma conta, uma análise ou uma indicação.
--
-- Não muda dado nenhum nem o comportamento do app: só deixa as leituras mais
-- rápidas. Rodar de novo não falha.

-- ---------------------------------------------------------------- consultas do backend

-- leads.by_analysis: "quem deixou o e-mail nesta análise" (.eq("analysis_id")).
-- O único índice era (email, analysis_id), que não serve para buscar só pela análise.
-- Também é a FK analysis_id → analyses (on delete cascade).
create index if not exists leads_analysis_id_idx on public.leads (analysis_id);

-- guest.analyses: as análises do convidado, mais nova primeiro
-- (.eq("guest_id").order("created_at", desc)). Com o created_at junto, o Postgres
-- já lê na ordem certa em vez de ordenar depois. Substitui o índice só de guest_id.
create index if not exists analyses_guest_id_created_at_idx on public.analyses (guest_id, created_at desc)
  where guest_id is not null;
drop index if exists public.analyses_guest_id_idx;

-- O mesmo para os vídeos do convidado (contagem do limite anti-abuso e claim).
-- Só as linhas de convidado entram: as de conta ficariam no índice à toa.
create index if not exists videos_guest_id_partial_idx on public.videos (guest_id)
  where guest_id is not null;
drop index if exists public.videos_guest_id_idx;

-- Ficaram de fora de propósito, depois de medir com 20 mil perfis e 8 mil compras:
--   * profiles.by_code (ilike no código de indicação): um índice de trigramas ficou
--     mais lento que ler a tabela (2,4 ms contra 1,0 ms) numa busca exata;
--   * purchases.paid_emails (status = 'paid'): quase toda compra é paga, então o
--     Postgres nunca usaria o índice.

-- ---------------------------------------------------------------- chaves estrangeiras sem índice

-- commissions.referral_id → referrals (on delete cascade)
create index if not exists commissions_referral_id_idx on public.commissions (referral_id);

-- edit_feedback.user_id e analysis_feedback.user_id → auth.users (on delete cascade):
-- apagar uma conta procurava o feedback dela lendo a tabela inteira.
create index if not exists edit_feedback_user_id_idx on public.edit_feedback (user_id);
create index if not exists analysis_feedback_user_id_idx on public.analysis_feedback (user_id);

-- events.guest_id → guest_sessions (on delete set null)
create index if not exists events_guest_id_idx on public.events (guest_id)
  where guest_id is not null;

-- ---------------------------------------------------------------- estatísticas

-- O planejador passa a conhecer os índices novos já na próxima consulta.
analyze public.leads, public.analyses, public.videos, public.commissions,
        public.edit_feedback, public.analysis_feedback, public.events;
