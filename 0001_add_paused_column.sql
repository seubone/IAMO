ALTER TABLE public.bot_instances
ADD COLUMN bot_paused BOOLEAN DEFAULT FALSE NOT NULL;

-- Opcional: Adicionar um comentário para descrever a coluna
COMMENT ON COLUMN public.bot_instances.bot_paused IS 'Indica se um bot ativo está temporariamente pausado.';
