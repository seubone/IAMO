-- Create instance_n8n_workflows table
-- Associations between Evolution WhatsApp instances and N8N workflows
CREATE TABLE IF NOT EXISTS instance_n8n_workflows (
  id BIGSERIAL PRIMARY KEY,

  -- Instance Reference
  instance_id UUID NOT NULL,
  instance_number VARCHAR(20) NOT NULL,

  -- N8N Workflow Configuration
  workflow_id VARCHAR(255) NOT NULL,
  workflow_name VARCHAR(255) NOT NULL,
  webhook_url TEXT,
  trigger_type VARCHAR(50) NOT NULL DEFAULT 'webhook', -- webhook, schedule, manual, trigger_node, other

  -- Workflow Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP,
  last_error_message TEXT,
  last_error_at TIMESTAMP,

  -- Configuration
  config JSONB DEFAULT '{}', -- Custom workflow configuration

  -- Timing
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(instance_id, workflow_id),
  UNIQUE(instance_number, workflow_id)
);

-- Create indexes for fast queries
CREATE INDEX idx_instance_n8n_workflows_instance_id ON instance_n8n_workflows(instance_id);
CREATE INDEX idx_instance_n8n_workflows_instance_number ON instance_n8n_workflows(instance_number);
CREATE INDEX idx_instance_n8n_workflows_workflow_id ON instance_n8n_workflows(workflow_id);
CREATE INDEX idx_instance_n8n_workflows_is_active ON instance_n8n_workflows(is_active);
CREATE INDEX idx_instance_n8n_workflows_trigger_type ON instance_n8n_workflows(trigger_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_instance_n8n_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_instance_n8n_workflows_updated_at
BEFORE UPDATE ON instance_n8n_workflows
FOR EACH ROW
EXECUTE FUNCTION update_instance_n8n_workflows_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON instance_n8n_workflows TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE instance_n8n_workflows_id_seq TO authenticated;
