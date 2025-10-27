-- Adicionar coluna send_api à tabela uazapi_instances
ALTER TABLE uazapi_instances
ADD COLUMN IF NOT EXISTS send_api VARCHAR(20) DEFAULT 'evolution';

-- Adicionar constraint
ALTER TABLE uazapi_instances
ADD CONSTRAINT check_send_api CHECK (send_api IN ('evolution', 'uazapi', 'both'));

-- Verificar resultado
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'uazapi_instances' AND column_name = 'send_api';
