-- Migration: Extend ias table with AI workflow and prefix configuration
-- Description: Adds N8N workflow info, AI name prefix, consultant name, pause schedule, and more

-- Add new columns to ias table
ALTER TABLE ias
ADD COLUMN IF NOT EXISTS ai_name VARCHAR(100),                          -- IA name with uppercase surname (e.g., "Maria Luzia")
ADD COLUMN IF NOT EXISTS consultant_name VARCHAR(100),                   -- Consultant name with lowercase surname initial (e.g., "Maria luzia")
ADD COLUMN IF NOT EXISTS n8n_workflow_id VARCHAR(255),                   -- N8N workflow ID
ADD COLUMN IF NOT EXISTS n8n_workflow_name VARCHAR(255),                 -- N8N workflow name
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT,                           -- N8N webhook URL for this IA
ADD COLUMN IF NOT EXISTS n8n_trigger_type VARCHAR(50),                   -- Trigger type: webhook, schedule, manual, etc
ADD COLUMN IF NOT EXISTS n8n_last_execution_timestamp TIMESTAMP,         -- Last time this workflow was executed
ADD COLUMN IF NOT EXISTS n8n_config JSONB,                               -- Additional N8N configuration
ADD COLUMN IF NOT EXISTS pause_until TIMESTAMP,                          -- When to resume (if paused)
ADD COLUMN IF NOT EXISTS pause_reason VARCHAR(255),                      -- Why it was paused
ADD COLUMN IF NOT EXISTS message_prefix_template TEXT DEFAULT '*{name}:*\n', -- Custom message prefix
ADD COLUMN IF NOT EXISTS use_ai_prefix BOOLEAN DEFAULT true,             -- Whether to use prefix for AI messages
ADD COLUMN IF NOT EXISTS use_consultant_prefix BOOLEAN DEFAULT true,     -- Whether to use prefix for consultant messages
ADD COLUMN IF NOT EXISTS description TEXT,                               -- Detailed description of the IA
ADD COLUMN IF NOT EXISTS avatar_url TEXT,                                -- Avatar/profile picture URL
ADD COLUMN IF NOT EXISTS category VARCHAR(50),                           -- Category: sales, support, marketing, billing, etc
ADD COLUMN IF NOT EXISTS model_version VARCHAR(50),                      -- AI model version in use
ADD COLUMN IF NOT EXISTS performance_score DECIMAL(5, 2),                -- Performance score 0-100
ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(255),                  -- User ID who last modified this IA
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP;                     -- When it was last modified

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ias_status ON ias(status);
CREATE INDEX IF NOT EXISTS idx_ias_ai_name ON ias(ai_name);
CREATE INDEX IF NOT EXISTS idx_ias_n8n_workflow_id ON ias(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_ias_pause_until ON ias(pause_until) WHERE status = 'paused';
CREATE INDEX IF NOT EXISTS idx_ias_category ON ias(category);

-- Create a function to automatically resume paused IAs when pause_until expires
CREATE OR REPLACE FUNCTION resume_paused_ias()
RETURNS void AS $$
BEGIN
  UPDATE ias
  SET status = 'active', pause_until = NULL, pause_reason = NULL
  WHERE status = 'paused' AND pause_until IS NOT NULL AND pause_until <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a function to update last_modified_at timestamp
CREATE OR REPLACE FUNCTION update_ias_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = NOW();
  NEW.last_modified_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_update_ias_modified_at ON ias;
CREATE TRIGGER trigger_update_ias_modified_at
  BEFORE UPDATE ON ias
  FOR EACH ROW
  EXECUTE FUNCTION update_ias_modified_at();

-- Add comment to explain the new columns
COMMENT ON COLUMN ias.ai_name IS 'AI name with uppercase format (e.g., "Maria Luzia")';
COMMENT ON COLUMN ias.consultant_name IS 'Consultant name with lowercase surname initial (e.g., "Maria luzia") - auto-generated from ai_name';
COMMENT ON COLUMN ias.n8n_workflow_id IS 'ID of the N8N workflow associated with this AI';
COMMENT ON COLUMN ias.pause_until IS 'Timestamp until which the AI should remain paused (NULL if not paused)';
COMMENT ON COLUMN ias.message_prefix_template IS 'Template for message prefixes: *{name}:*\n or [{name}] etc';
