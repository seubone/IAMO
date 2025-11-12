-- Migration: Create uazapi_instances table in Supabase
-- Location: Supabase SQL Editor
-- URL: https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Click "New Query"
-- 4. Copy and paste ALL content below
-- 5. Click "RUN" button
-- 6. Wait for success message
-- 7. Restart the backend server

-- Create uazapi_instances table
CREATE TABLE IF NOT EXISTS public.uazapi_instances (
  id BIGSERIAL PRIMARY KEY,
  instance_id UUID UNIQUE NOT NULL,
  instance_number VARCHAR(20) UNIQUE,
  api_token TEXT,
  send_api VARCHAR(20) DEFAULT 'evolution' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_send_api CHECK (send_api IN ('evolution', 'uazapi'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_uazapi_instances_instance_id ON public.uazapi_instances(instance_id);
CREATE INDEX IF NOT EXISTS idx_uazapi_instances_instance_number ON public.uazapi_instances(instance_number);

-- Enable RLS (Row Level Security) if using auth
ALTER TABLE public.uazapi_instances ENABLE ROW LEVEL SECURITY;

-- Optional: Allow all users to read (customize as needed)
CREATE POLICY "Enable read access for all users" ON public.uazapi_instances
  FOR SELECT USING (true);

-- Optional: Allow authenticated users to insert/update
CREATE POLICY "Enable insert for authenticated users" ON public.uazapi_instances
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.uazapi_instances
  FOR UPDATE USING (true);

-- Verification query - shows the new table structure
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'uazapi_instances'
ORDER BY ordinal_position;
