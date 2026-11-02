-- Publishub — o link público do resultado de uma análise.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20261015000000).
--
-- O criador escolhe compartilhar "meu Reel perdia gente no 0:04": o link mostra
-- só a queda, a frase e o diagnóstico (nunca o vídeo nem o plano). Sem token, a
-- análise é privada, como sempre foi; desligar o link volta o token para nulo.
--
-- Rodar de novo não falha.

alter table public.analyses
  add column if not exists share_token text,
  add column if not exists shared_at timestamptz;

create unique index if not exists analyses_share_token_idx on public.analyses (share_token)
  where share_token is not null;
