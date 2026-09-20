-- Publishub — uma relação só entre análise e vídeo.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260920300000).
--
-- A 20260920200000 acrescentou a FK simples (video_id → videos.id) para o join
-- voltar a funcionar em linha de convidado. Só que ficaram duas relações entre
-- as tabelas, e aí o PostgREST passa a recusar qualquer embed que não diga qual
-- usar: "PGRST201, more than one relationship found". O código novo diz; o que
-- estava publicado não dizia, e todas as telas que listam vídeo quebraram.
--
-- Então fica só a simples. A composta garantia que uma análise não apontasse
-- para o vídeo de outra conta, mas ela já não valia para convidado (com user_id
-- nulo, NULL não casa com NULL). Quem garante isso agora é o backend, que grava
-- vídeo e análise com o mesmo dono no mesmo lugar (register_video), e toda
-- leitura filtra pelo dono.

do $$
declare
  composta record;
begin
  for composta in
    select conname
      from pg_constraint
     where conrelid = 'public.analyses'::regclass
       and contype = 'f'
       and pg_get_constraintdef(oid) like '%videos(id, user_id)%'
  loop
    execute format('alter table public.analyses drop constraint %I', composta.conname);
  end loop;
end $$;
