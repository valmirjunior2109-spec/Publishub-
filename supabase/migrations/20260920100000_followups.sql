-- Publishub — fechar o loop de previsão.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260920000000).
--
-- Depois da análise completa o criador diz quando vai republicar. A partir daí
-- fica um lembrete agendado: 72 h depois (ou 48 h depois da data informada) sai
-- um e-mail pedindo a retenção real. É o que fecha o loop — sem isso a previsão
-- nunca é conferida e o placar de precisão não existe.

create table if not exists public.followups (
  id            uuid primary key default gen_random_uuid(),
  -- um lembrete por análise: republicar de novo reaproveita a mesma linha
  analysis_id   uuid not null unique references public.analyses (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- quando o criador disse que ia republicar (opcional)
  republish_on  date,
  -- quando o e-mail pode sair
  send_after    timestamptz not null,
  -- idioma do site na hora em que foi agendado: o e-mail sai nele
  locale        text not null default 'en' check (locale in ('en', 'pt-BR', 'es')),
  status        text not null default 'scheduled'
                check (status in ('scheduled', 'sent', 'cancelled', 'failed')),
  attempts      integer not null default 0,
  last_error    text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- O índice que o cron usa: só o que ainda está esperando para sair.
create index if not exists followups_due_idx on public.followups (send_after)
  where status = 'scheduled';
create index if not exists followups_user_id_idx on public.followups (user_id);

create trigger followups_set_updated_at
  before update on public.followups
  for each row execute function public.set_updated_at();

alter table public.followups enable row level security;

-- Cada um lê os próprios lembretes (a escrita continua sendo só do backend).
create policy "followups_select_own" on public.followups
  for select to authenticated using ((select auth.uid()) = user_id);
