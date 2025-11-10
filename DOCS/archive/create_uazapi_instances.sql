-- ============================================
-- Criar Tabela: uazapi_instances
-- ============================================
-- Descrição: Armazena tokens da API UAZapi para cada instância WhatsApp
-- Banco de dados: monitor_ia (PostgreSQL)
-- Data: 2024-10-24
-- ============================================

-- 1. Criar tabela principal
CREATE TABLE IF NOT EXISTS uazapi_instances (
  instance_number TEXT PRIMARY KEY,
  api_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_uazapi_instances_created_at
ON uazapi_instances(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_uazapi_instances_updated_at
ON uazapi_instances(updated_at DESC);

-- 3. Adicionar comentários para documentação
COMMENT ON TABLE uazapi_instances IS 'Armazena tokens de API UAZapi para cada instância WhatsApp (Evolution API)';

COMMENT ON COLUMN uazapi_instances.instance_number IS 'Número único da instância WhatsApp em formato brasileiro (ex: 5511999999999)';

COMMENT ON COLUMN uazapi_instances.api_token IS 'Token de autenticação fornecido pela plataforma UAZapi (https://quatro-cinco.uazapi.com)';

COMMENT ON COLUMN uazapi_instances.created_at IS 'Data e hora de criação do registro (UTC)';

COMMENT ON COLUMN uazapi_instances.updated_at IS 'Data e hora da última atualização (UTC)';

-- 4. Verificar se a tabela foi criada com sucesso
-- Execute esta query depois para confirmar:
-- SELECT * FROM information_schema.tables WHERE table_name = 'uazapi_instances';

-- 5. Ver estrutura da tabela
-- Execute esta query para ver os detalhes:
-- \d uazapi_instances;

-- 6. Exemplo de inserção (descomente para testar)
-- INSERT INTO uazapi_instances (instance_number, api_token)
-- VALUES ('5511999999999', 'seu-token-uazapi-aqui')
-- ON CONFLICT (instance_number)
-- DO UPDATE SET
--   api_token = 'seu-token-uazapi-aqui',
--   updated_at = CURRENT_TIMESTAMP;

-- 7. Exemplo de query para buscar token
-- SELECT api_token FROM uazapi_instances WHERE instance_number = '5511999999999';

-- 8. Exemplo de deletar token
-- DELETE FROM uazapi_instances WHERE instance_number = '5511999999999';
