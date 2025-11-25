-- Create instance_contact_status table
-- Manages contact status (active/paused/inactive) per WhatsApp instance
-- All contacts default to 'active' status

CREATE TABLE IF NOT EXISTS public.instance_contact_status (
  id BIGSERIAL PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public."Instances"(id) ON DELETE CASCADE,
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
CREATE INDEX idx_instance_contact_status_instance_number ON public.instance_contact_status(instance_number);
CREATE INDEX idx_instance_contact_status_instance_id ON public.instance_contact_status(instance_id);
CREATE INDEX idx_instance_contact_status_contact_jid ON public.instance_contact_status(contact_jid);
CREATE INDEX idx_instance_contact_status_status ON public.instance_contact_status(status);
CREATE INDEX idx_instance_contact_status_paused_until ON public.instance_contact_status(paused_until);
CREATE INDEX idx_instance_contact_status_inactive_until ON public.instance_contact_status(inactive_until);

-- Enable Row Level Security
ALTER TABLE public.instance_contact_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read contact status"
  ON public.instance_contact_status FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert contact status"
  ON public.instance_contact_status FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update contact status"
  ON public.instance_contact_status FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete contact status"
  ON public.instance_contact_status FOR DELETE
  TO authenticated USING (true);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_instance_contact_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_instance_contact_status_updated_at
  BEFORE UPDATE ON public.instance_contact_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_instance_contact_status_timestamp();

-- Create trigger for auto-resume when paused_until expires
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

-- Create trigger for auto-activate when inactive_until expires
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
