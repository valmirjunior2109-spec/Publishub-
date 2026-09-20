-- Publishub — a integração com o Manus sai do produto.
-- Execute no Supabase: Dashboard → SQL Editor → cole → Run (depois da 20260921100000).
--
-- Por quê: conectar exigia colar uma chave de API, e o criador que o Publishub
-- atende não quer saber de chave — quer entrar com a conta dele. O login com
-- conta não é possível hoje: o OAuth do Manus ("Open Apps") exige conta Team e
-- só autoriza quem está no mesmo time de quem criou o app, então um botão
-- "Entrar com Manus" não funcionaria para quem usa o produto.
--
-- O plano de ação continua exportável por "Copiar plano", que serve para levar
-- o trabalho a qualquer ferramenta. O código da integração fica no histórico do
-- Git, caso o Manus abra o OAuth um dia.
--
-- As tabelas guardavam a chave de cada criador (cifrada). Apagar aqui é o certo:
-- segredo que não é mais usado não tem por que continuar existindo.

drop table if exists public.manus_tasks;
drop table if exists public.manus_connections;
