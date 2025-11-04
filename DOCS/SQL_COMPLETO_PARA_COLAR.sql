-- ============================================================
-- MIGRATION COMPLETA - COPIE E COLE NO SUPABASE
-- ============================================================
-- Este arquivo contém TODOS os SQLs necessários
-- Abra o Supabase → SQL Editor → Copie tudo abaixo → Cole e Execute
-- ============================================================

-- ============================================================
-- 1. CRIAR TIPOS ENUM (se não existirem)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ia_status') THEN
    CREATE TYPE ia_status AS ENUM ('active', 'paused', 'inactive');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ia_category') THEN
    CREATE TYPE ia_category AS ENUM ('sales', 'support', 'marketing', 'billing', 'onboarding', 'other');
  END IF;
END
$$;

-- ============================================================
-- 2. CRIAR TABELA IAS (Artificial Intelligence - IAs)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ias (
  -- Primary Key
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Basic Information
  name TEXT NOT NULL,
  status ia_status NOT NULL DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  description TEXT,

  -- AI Names (com prefixos diferenciados)
  ai_name VARCHAR(100),                              -- Ex: "Maria Luzia" (sobrenome maiúsculo)
  consultant_name VARCHAR(100),                      -- Ex: "Maria luzia" (sobrenome minúsculo)

  -- Configuration Parameters
  parameters JSONB,                                  -- Parâmetros e configurações da IA
  status_history JSONB,                              -- Histórico de status

  -- N8N Workflow Integration
  n8n_workflow_id VARCHAR(255),
  n8n_workflow_name VARCHAR(255),
  n8n_webhook_url TEXT,
  n8n_trigger_type VARCHAR(50),                      -- webhook, schedule, manual, trigger_node, other
  n8n_last_execution_timestamp TIMESTAMP WITH TIME ZONE,
  n8n_config JSONB,                                  -- Configuração adicional do N8N

  -- Pause Schedule
  pause_until TIMESTAMP WITH TIME ZONE,              -- Quando retomar se pausada
  pause_reason VARCHAR(255),                         -- Por que foi pausada

  -- Message Formatting
  message_prefix_template TEXT DEFAULT '*{name}:*\n',  -- Template customizável do prefixo
  use_ai_prefix BOOLEAN DEFAULT true,                  -- Usar prefixo em mensagens da IA
  use_consultant_prefix BOOLEAN DEFAULT true,         -- Usar prefixo em mensagens do consultor

  -- Additional Configuration
  avatar_url TEXT,
  category ia_category DEFAULT 'other',
  model_version VARCHAR(50),
  performance_score DECIMAL(5, 2),                   -- Score 0-100

  -- Metadata
  last_modified_by VARCHAR(255),
  last_modified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ias_status ON public.ias(status);
CREATE INDEX IF NOT EXISTS idx_ias_ai_name ON public.ias(ai_name);
CREATE INDEX IF NOT EXISTS idx_ias_category ON public.ias(category);
CREATE INDEX IF NOT EXISTS idx_ias_n8n_workflow_id ON public.ias(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_ias_pause_until ON public.ias(pause_until) WHERE status = 'paused';
CREATE INDEX IF NOT EXISTS idx_ias_created_at ON public.ias(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ias_updated_at ON public.ias(updated_at DESC);

-- ============================================================
-- 4. CRIAR FUNÇÕES TRIGGER
-- ============================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_ias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_ias_updated_at ON public.ias;
CREATE TRIGGER trigger_update_ias_updated_at
  BEFORE UPDATE ON public.ias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ias_updated_at();

-- Função para retomar automaticamente IAs pausadas
CREATE OR REPLACE FUNCTION public.resume_paused_ias()
RETURNS void AS $$
BEGIN
  UPDATE public.ias
  SET
    status = 'active'::ia_status,
    pause_until = NULL,
    pause_reason = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE status = 'paused'::ia_status
    AND pause_until IS NOT NULL
    AND pause_until <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. ATIVAR ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.ias ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. CRIAR POLÍTICAS RLS
-- ============================================================

-- Política para leitura
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read ias"
  ON public.ias
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para inserção
CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert ias"
  ON public.ias
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para atualização
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update ias"
  ON public.ias
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para deleção
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete ias"
  ON public.ias
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 7. ADICIONAR COMENTÁRIOS (DOCUMENTAÇÃO)
-- ============================================================

COMMENT ON TABLE public.ias IS 'Armazena configurações de agentes de IA com integração N8N e formatação de mensagens';
COMMENT ON COLUMN public.ias.ai_name IS 'Nome da IA com formato maiúsculo (ex: "Maria Luzia")';
COMMENT ON COLUMN public.ias.consultant_name IS 'Nome do Consultor com inicial do sobrenome minúscula (ex: "Maria luzia") - gerado automaticamente';
COMMENT ON COLUMN public.ias.n8n_workflow_id IS 'ID do workflow N8N associado a esta IA';
COMMENT ON COLUMN public.ias.pause_until IS 'Timestamp até quando a IA deve permanecer pausada (NULL se não pausada)';
COMMENT ON COLUMN public.ias.message_prefix_template IS 'Template para prefixos: *{name}:*\n ou [{name}] etc';

-- ============================================================
-- 8. CRIAR TABELA BOT_INSTANCES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bot_instances (
  id BIGSERIAL PRIMARY KEY,

  -- Foreign key para uazapi_instances
  instance_id UUID UNIQUE NOT NULL,
  instance_number VARCHAR(20) NOT NULL,
  instance_remote_jid VARCHAR(100),

  -- Configuração do Bot
  has_bot_enabled BOOLEAN DEFAULT false,
  bot_name VARCHAR(100),                    -- Nome da IA (ex: "Maria Luzia" - maiúsculo)
  consultant_name VARCHAR(100),              -- Nome do Consultor (ex: "Maria luzia" - minúsculo)
  bot_activity VARCHAR(255),                 -- Função/atividade do bot (ex: "Suporte de Vendas")

  -- Message formatting (customizável por instância)
  message_prefix_template TEXT DEFAULT '*{name}:*\n',  -- Template: *{name}:*\n ou [{name}] ou {name}: etc
  use_prefix_for_bot BOOLEAN DEFAULT true,
  use_prefix_for_consultant BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. CRIAR ÍNDICES PARA BOT_INSTANCES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bot_instances_instance_number
  ON public.bot_instances(instance_number);

CREATE INDEX IF NOT EXISTS idx_bot_instances_enabled
  ON public.bot_instances(has_bot_enabled)
  WHERE has_bot_enabled = true;

CREATE INDEX IF NOT EXISTS idx_bot_instances_instance_id
  ON public.bot_instances(instance_id);

-- ============================================================
-- 10. CRIAR FUNÇÃO TRIGGER PARA BOT_INSTANCES
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_bot_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_bot_instances_updated_at ON public.bot_instances;
CREATE TRIGGER trigger_update_bot_instances_updated_at
  BEFORE UPDATE ON public.bot_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bot_instances_updated_at();

-- ============================================================
-- 11. ATIVAR RLS PARA BOT_INSTANCES
-- ============================================================

ALTER TABLE public.bot_instances ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. CRIAR POLÍTICAS RLS PARA BOT_INSTANCES
-- ============================================================

-- Leitura
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read bot configs"
  ON public.bot_instances
  FOR SELECT
  TO authenticated
  USING (true);

-- Inserção
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage bot configs"
  ON public.bot_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Atualização
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update bot configs"
  ON public.bot_instances
  FOR UPDATE
  TO authenticated
  USING (true);

-- Deleção
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete bot configs"
  ON public.bot_instances
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- ✅ PRONTO!
-- ============================================================
-- Se viu tudo executado com sucesso (nenhum erro), suas tabelas estão criadas!
-- Próximos passos:
-- 1. Abra "Table Editor" no Supabase e verifique se as tabelas "ias" e "bot_instances" existem
-- 2. Rode: npm run build
-- 3. Rode: npm run dev
-- 4. Teste a aplicação!
-- ============================================================
