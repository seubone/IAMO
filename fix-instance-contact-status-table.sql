-- Fix instance_contact_status table
-- Make instance_id nullable since Instances table doesn't exist in this database
-- The instance_number is sufficient as a foreign reference to Evolution database

ALTER TABLE public.instance_contact_status
  ALTER COLUMN instance_id DROP NOT NULL;

-- Drop the foreign key constraint if it exists
ALTER TABLE public.instance_contact_status
  DROP CONSTRAINT IF EXISTS instance_contact_status_instance_id_fkey;

-- Now you can insert contacts with just instance_number
-- ALTER TABLE will succeed
