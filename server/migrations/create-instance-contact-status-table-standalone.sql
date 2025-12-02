-- Create instance_contact_status table (Standalone version - no FK to Supabase Instances)
-- Manages contact status (active/paused/inactive) per WhatsApp instance
-- All contacts default to 'active' status
--
-- NOTE: This version removes the FK to public."Instances" since that table
-- exists only in the Evolution API database (Supabase), not in the simonia database.

CREATE TABLE IF NOT EXISTS public.instance_contact_status (
  id BIGSERIAL PRIMARY KEY,
  instance_id UUID NOT NULL, -- No FK constraint for standalone DB
  instance_number VARCHAR(255) NOT NULL,
  contact_jid VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
  pause_reason TEXT,
  inactive_reason TEXT,
  paused_at TIMESTAMP WITH TIME ZONE,
  paused_until TIMESTAMP WITH TIME ZONE,
  inactive_at TIMESTAMP WITH TIME ZONE,
  inactive_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instance_id, contact_jid),
  UNIQUE(instance_number, contact_jid)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_instance_contact_status_instance_number ON public.instance_contact_status(instance_number);
CREATE INDEX IF NOT EXISTS idx_instance_contact_status_instance_id ON public.instance_contact_status(instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_contact_status_contact_jid ON public.instance_contact_status(contact_jid);
CREATE INDEX IF NOT EXISTS idx_instance_contact_status_status ON public.instance_contact_status(status);
CREATE INDEX IF NOT EXISTS idx_instance_contact_status_paused_until ON public.instance_contact_status(paused_until);
CREATE INDEX IF NOT EXISTS idx_instance_contact_status_inactive_until ON public.instance_contact_status(inactive_until);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_instance_contact_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_instance_contact_status_updated_at ON public.instance_contact_status;
CREATE TRIGGER trigger_instance_contact_status_updated_at
  BEFORE UPDATE ON public.instance_contact_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_instance_contact_status_timestamp();

-- Create function for auto-resume when paused_until expires
CREATE OR REPLACE FUNCTION public.auto_resume_paused_contacts()
RETURNS void AS $$
BEGIN
  UPDATE public.instance_contact_status
  SET
    status = 'active',
    pause_reason = NULL,
    paused_at = NULL,
    paused_until = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE status = 'paused'
    AND paused_until IS NOT NULL
    AND paused_until <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function for auto-activate when inactive_until expires
CREATE OR REPLACE FUNCTION public.auto_activate_inactive_contacts()
RETURNS void AS $$
BEGIN
  UPDATE public.instance_contact_status
  SET
    status = 'active',
    inactive_reason = NULL,
    inactive_at = NULL,
    inactive_until = NULL,
    pause_reason = NULL,
    paused_at = NULL,
    paused_until = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE status = 'inactive'
    AND inactive_until IS NOT NULL
    AND inactive_until <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE public.instance_contact_status IS 'Tracks contact status (active/paused/inactive) per WhatsApp instance - standalone version without FK to Instances';
COMMENT ON COLUMN public.instance_contact_status.status IS 'Contact status: active (enabled), paused (temporarily disabled), inactive (disabled)';
COMMENT ON COLUMN public.instance_contact_status.paused_until IS 'When the pause expires (NULL = indefinite pause)';
COMMENT ON COLUMN public.instance_contact_status.inactive_until IS 'When the inactive period ends (NULL = indefinite inactive)';
