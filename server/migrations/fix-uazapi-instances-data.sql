-- Migration: Fix uazapi_instances table - Sync instance_number from Evolution DB
-- Location: Supabase SQL Editor
--
-- IMPORTANT: Execute this AFTER the table is created
-- This migration syncs instance_number from Evolution DB using instance_id

-- Step 1: First, let's see what we have
-- SELECT instance_id, instance_number FROM public.uazapi_instances;

-- Step 2: Create a view to join with Evolution instance data (if possible)
-- Note: This may not work if Evolution DB is separate. Manual sync below:

-- Step 3: For now, manually populate instance_number using known mappings
-- You can get the instance numbers from Evolution DB:
-- SELECT id, number FROM "Instance" ORDER BY number;

-- Then use UPDATE statements like:
-- UPDATE public.uazapi_instances
-- SET instance_number = '5511999999999'
-- WHERE instance_id = 'f5dc9a99-921d-4899-ad30-1337a1da6c7c';

-- For a cleaner approach, we'll create an endpoint to sync this automatically

-- Step 4: Verify the table structure is correct
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'uazapi_instances'
ORDER BY ordinal_position;

-- Step 5: Check current data
SELECT
  instance_id,
  instance_number,
  api_token,
  send_api,
  created_at,
  updated_at
FROM public.uazapi_instances;
