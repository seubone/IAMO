-- Migration: Add send_api column to uazapi_instances
-- Location: Supabase SQL Editor
-- URL: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/sql
--
-- INSTRUCTIONS:
-- 1. Go to https://app.supabase.com/project/svfucusuhnwmwyojmxgr/sql
-- 2. Click "New Query"
-- 3. Copy and paste ALL content below
-- 4. Click "RUN" button
-- 5. Wait for success message
-- 6. Restart the backend server

-- Add send_api column with default value
ALTER TABLE uazapi_instances
ADD COLUMN IF NOT EXISTS send_api VARCHAR(20) DEFAULT 'evolution';

-- Drop existing constraint if it exists to avoid conflicts
ALTER TABLE uazapi_instances
DROP CONSTRAINT IF EXISTS check_send_api;

-- Add CHECK constraint for valid API values
ALTER TABLE uazapi_instances
ADD CONSTRAINT check_send_api CHECK (send_api IN ('evolution', 'uazapi'));

-- Verification query - shows the new column structure
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'uazapi_instances'
ORDER BY ordinal_position;
