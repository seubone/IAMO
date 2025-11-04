-- Migration: Create bot_instances table
-- Description: Stores AI/Bot configuration for each WhatsApp instance
-- This allows managing multiple AI assistants across different instances with custom prefixes

-- Create the table
CREATE TABLE IF NOT EXISTS public.bot_instances (
  id BIGSERIAL PRIMARY KEY,

  -- Foreign key to uazapi_instances
  instance_id UUID UNIQUE NOT NULL,
  instance_number VARCHAR(20) NOT NULL,
  instance_remote_jid VARCHAR(100),

  -- Bot configuration
  has_bot_enabled BOOLEAN DEFAULT false,
  bot_name VARCHAR(100),                    -- IA name (e.g., "Maria Luzia" - uppercase surname)
  consultant_name VARCHAR(100),              -- Consultant name (e.g., "Maria luzia" - lowercase surname initial)
  bot_activity VARCHAR(255),                 -- Bot's function/activity (e.g., "Sales Support")

  -- Message formatting (customizable per instance)
  message_prefix_template TEXT DEFAULT '*{name}:*\n',
  use_prefix_for_bot BOOLEAN DEFAULT true,
  use_prefix_for_consultant BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_instances_instance_number
  ON public.bot_instances(instance_number);

CREATE INDEX IF NOT EXISTS idx_bot_instances_enabled
  ON public.bot_instances(has_bot_enabled)
  WHERE has_bot_enabled = true;

CREATE INDEX IF NOT EXISTS idx_bot_instances_instance_id
  ON public.bot_instances(instance_id);

-- Create trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION public.update_bot_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_bot_instances_updated_at ON public.bot_instances;

-- Create the trigger
CREATE TRIGGER trigger_update_bot_instances_updated_at
  BEFORE UPDATE ON public.bot_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bot_instances_updated_at();

-- Create RLS policies (if using RLS)
-- Enable RLS on the table
ALTER TABLE public.bot_instances ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all bot configurations
CREATE POLICY "Allow authenticated users to read bot configs"
  ON public.bot_instances
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update/insert bot configurations
CREATE POLICY "Allow authenticated users to manage bot configs"
  ON public.bot_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update bot configs"
  ON public.bot_instances
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete bot configurations
CREATE POLICY "Allow authenticated users to delete bot configs"
  ON public.bot_instances
  FOR DELETE
  TO authenticated
  USING (true);
