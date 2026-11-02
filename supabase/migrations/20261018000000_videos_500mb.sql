-- Vídeos de até 500 MB (plano Pro do Supabase).
--
-- No plano gratuito o máximo por arquivo era 50 MB, e editor de vídeo exporta
-- 1 minuto em 1080p com mais que isso. O número aqui deve ser igual a
-- MAX_UPLOAD_MB do backend e NEXT_PUBLIC_MAX_UPLOAD_MB do frontend (padrão 500).
-- O limite global do projeto (Storage → Settings) precisa ser pelo menos este.
update storage.buckets
   set file_size_limit = 524288000
 where id = 'videos';
