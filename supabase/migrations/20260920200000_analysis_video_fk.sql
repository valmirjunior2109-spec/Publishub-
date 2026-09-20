-- Publishub — conserta o vínculo entre análise e vídeo para as linhas de convidado.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260920100000).
--
-- O problema: a única FK entre analyses e videos era a composta (video_id, user_id),
-- que existe para garantir que uma análise nunca aponte para o vídeo de outra conta.
-- Desde que user_id passou a aceitar nulo (convidado), essa FK deixa de casar —
-- NULL não é igual a NULL — e o join do PostgREST devolve o vídeo como null. O
-- backend ficava sem o arquivo e a análise travava em "transcrevendo".
--
-- A correção é uma FK simples (video_id → videos.id) só para o join ter por onde
-- ir. A composta continua existindo e continua valendo para linhas com conta.

do $$ begin
  alter table public.analyses
    add constraint analyses_video_fkey foreign key (video_id) references public.videos (id) on delete cascade;
exception when duplicate_object then null; end $$;
