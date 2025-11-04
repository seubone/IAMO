-- Migration: Create ias table (IAs/AI Agents)
-- Description: Main table for storing AI/IA configurations with support for N8N workflows,
-- message prefixes, pause scheduling, and more

-- Create enum type for status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ia_status') THEN
    CREATE TYPE ia_status AS ENUM ('active', 'paused', 'inactive');
  END IF;
END
$$;

-- Create enum type for category
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ia_category') THEN
    CREATE TYPE ia_category AS ENUM ('sales', 'support', 'marketing', 'billing', 'onboarding', 'other');
  END IF;
END
$$;

-- Create the main ias table
CREATE TABLE IF NOT EXISTS public.ias (
  -- Primary Key
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Basic Information
  name TEXT NOT NULL,
  status ia_status NOT NULL DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  description TEXT,

  -- AI Names (with prefixes)
  ai_name VARCHAR(100),                              -- e.g., "Maria Luzia" (uppercase surname)
  consultant_name VARCHAR(100),                      -- e.g., "Maria luzia" (lowercase surname initial)

  -- Configuration Parameters
  parameters JSONB,                                  -- AI parameters, prompts, configs
  status_history JSONB,                              -- Audit trail of status transitions

  -- N8N Workflow Integration
  n8n_workflow_id VARCHAR(255),
  n8n_workflow_name VARCHAR(255),
  n8n_webhook_url TEXT,
  n8n_trigger_type VARCHAR(50),                      -- webhook, schedule, manual, trigger_node, other
  n8n_last_execution_timestamp TIMESTAMP WITH TIME ZONE,
  n8n_config JSONB,                                  -- Additional N8N configuration

  -- Pause Schedule
  pause_until TIMESTAMP WITH TIME ZONE,              -- When to resume if paused
  pause_reason VARCHAR(255),                         -- Why it was paused

  -- Message Formatting
  message_prefix_template TEXT DEFAULT '*{name}:*\n',  -- Customizable message prefix
  use_ai_prefix BOOLEAN DEFAULT true,
  use_consultant_prefix BOOLEAN DEFAULT true,

  -- Additional Configuration
  avatar_url TEXT,
  category ia_category DEFAULT 'other',
  model_version VARCHAR(50),
  performance_score DECIMAL(5, 2),                   -- 0-100 score

  -- Metadata
  last_modified_by VARCHAR(255),
  last_modified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ias_status ON public.ias(status);
CREATE INDEX IF NOT EXISTS idx_ias_ai_name ON public.ias(ai_name);
CREATE INDEX IF NOT EXISTS idx_ias_category ON public.ias(category);
CREATE INDEX IF NOT EXISTS idx_ias_n8n_workflow_id ON public.ias(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_ias_pause_until ON public.ias(pause_until) WHERE status = 'paused';
CREATE INDEX IF NOT EXISTS idx_ias_created_at ON public.ias(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ias_updated_at ON public.ias(updated_at DESC);

-- Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION public.update_ias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_ias_updated_at ON public.ias;
CREATE TRIGGER trigger_update_ias_updated_at
  BEFORE UPDATE ON public.ias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ias_updated_at();

-- Create function to automatically resume paused IAs
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

-- Add comments to explain columns
COMMENT ON TABLE public.ias IS 'Stores AI/IA agent configurations with N8N workflow integration and message formatting';
COMMENT ON COLUMN public.ias.ai_name IS 'AI name with uppercase format (e.g., "Maria Luzia")';
COMMENT ON COLUMN public.ias.consultant_name IS 'Consultant name with lowercase surname initial (e.g., "Maria luzia") - auto-generated from ai_name';
COMMENT ON COLUMN public.ias.n8n_workflow_id IS 'ID of the N8N workflow associated with this AI';
COMMENT ON COLUMN public.ias.pause_until IS 'Timestamp until which the AI should remain paused (NULL if not paused)';
COMMENT ON COLUMN public.ias.message_prefix_template IS 'Template for message prefixes: *{name}:*\n or [{name}] etc';

-- Enable RLS (Row Level Security) if using Supabase
ALTER TABLE public.ias ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ias' AND policyname = 'Allow authenticated users to read ias'
  ) THEN
    CREATE POLICY "Allow authenticated users to read ias"
      ON public.ias
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ias' AND policyname = 'Allow authenticated users to insert ias'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert ias"
      ON public.ias
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ias' AND policyname = 'Allow authenticated users to update ias'
  ) THEN
    CREATE POLICY "Allow authenticated users to update ias"
      ON public.ias
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ias' AND policyname = 'Allow authenticated users to delete ias'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete ias"
      ON public.ias
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- Insert some example data (optional - comment out if not needed)
-- INSERT INTO public.ias (id, name, ai_name, consultant_name, status, category, description)
-- VALUES
--   ('550e8400-e29b-41d4-a716-446655440000', 'IA Vendas', 'Maria Luzia', 'Maria luzia', 'active', 'sales', 'IA para atendimento de vendas'),
--   ('550e8400-e29b-41d4-a716-446655440001', 'IA Suporte', 'João Silva', 'João silva', 'active', 'support', 'IA para suporte técnico'),
--   ('550e8400-e29b-41d4-a716-446655440002', 'IA Marketing', 'Ana Costa', 'Ana costa', 'paused', 'marketing', 'IA para campanhas de marketing');
