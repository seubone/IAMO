/**
 * Instance Bot Status Table
 * Tracks bot pause/inactive status per WhatsApp instance number
 * Allows pausing IA for specific numbers with expiration dates
 */

-- Create table for tracking bot status per instance
CREATE TABLE IF NOT EXISTS public.instance_bot_status (
  id BIGSERIAL PRIMARY KEY,
  instance_id UUID NOT NULL,
  instance_number VARCHAR(20) NOT NULL,

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'inactive'
  pause_reason VARCHAR(255),                     -- Reason for pause
  inactive_reason VARCHAR(255),                  -- Reason for inactive

  -- Expiration tracking
  paused_until TIMESTAMP WITH TIME ZONE,        -- When pause expires (NULL = indefinite)
  inactive_until TIMESTAMP WITH TIME ZONE,      -- When inactive period ends

  -- Timestamps
  paused_at TIMESTAMP WITH TIME ZONE,           -- When pause was set
  inactive_at TIMESTAMP WITH TIME ZONE,         -- When inactive was set
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  -- Unique constraint: one status per instance number
  UNIQUE(instance_number)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_instance_bot_status_instance_id ON public.instance_bot_status(instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_bot_status_instance_number ON public.instance_bot_status(instance_number);
CREATE INDEX IF NOT EXISTS idx_instance_bot_status_status ON public.instance_bot_status(status);
CREATE INDEX IF NOT EXISTS idx_instance_bot_status_paused_until ON public.instance_bot_status(paused_until)
  WHERE status = 'paused' AND paused_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instance_bot_status_inactive_until ON public.instance_bot_status(inactive_until)
  WHERE status = 'inactive' AND inactive_until IS NOT NULL;

-- Create trigger to auto-update the updated_at column
CREATE OR REPLACE FUNCTION public.update_instance_bot_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_instance_bot_status_updated_at ON public.instance_bot_status;
CREATE TRIGGER trigger_instance_bot_status_updated_at
BEFORE UPDATE ON public.instance_bot_status
FOR EACH ROW
EXECUTE FUNCTION public.update_instance_bot_status_updated_at();

-- Create function to automatically resume paused instances when pause expires
CREATE OR REPLACE FUNCTION public.resume_expired_bot_pauses()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-resume paused instances if pause_until has passed
  UPDATE public.instance_bot_status
  SET
    status = 'active',
    pause_reason = NULL,
    paused_at = NULL,
    paused_until = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE status = 'paused'
    AND paused_until IS NOT NULL
    AND paused_until <= CURRENT_TIMESTAMP;

  -- Auto-activate inactive instances if inactive_until has passed
  UPDATE public.instance_bot_status
  SET
    status = 'active',
    inactive_reason = NULL,
    inactive_at = NULL,
    inactive_until = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE status = 'inactive'
    AND inactive_until IS NOT NULL
    AND inactive_until <= CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Run resume function on each update
DROP TRIGGER IF EXISTS trigger_resume_expired_bot_pauses ON public.instance_bot_status;
CREATE TRIGGER trigger_resume_expired_bot_pauses
AFTER UPDATE ON public.instance_bot_status
FOR EACH ROW
EXECUTE FUNCTION public.resume_expired_bot_pauses();

-- Enable RLS
ALTER TABLE public.instance_bot_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read bot status" ON public.instance_bot_status;
CREATE POLICY "Allow authenticated users to read bot status"
ON public.instance_bot_status
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to create bot status" ON public.instance_bot_status;
CREATE POLICY "Allow authenticated users to create bot status"
ON public.instance_bot_status
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update bot status" ON public.instance_bot_status;
CREATE POLICY "Allow authenticated users to update bot status"
ON public.instance_bot_status
FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete bot status" ON public.instance_bot_status;
CREATE POLICY "Allow authenticated users to delete bot status"
ON public.instance_bot_status
FOR DELETE
TO authenticated
USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.instance_bot_status IS 'Tracks bot/IA status per WhatsApp instance number - allows pausing/deactivating specific numbers';
COMMENT ON COLUMN public.instance_bot_status.status IS 'Bot status: active (working), paused (temporarily disabled), inactive (disabled)';
COMMENT ON COLUMN public.instance_bot_status.paused_until IS 'When the pause expires (NULL = indefinite pause)';
COMMENT ON COLUMN public.instance_bot_status.inactive_until IS 'When the inactive period ends (NULL = indefinite inactive)';
COMMENT ON COLUMN public.instance_bot_status.paused_at IS 'Timestamp when bot was paused';
COMMENT ON COLUMN public.instance_bot_status.inactive_at IS 'Timestamp when bot was inactivated';
