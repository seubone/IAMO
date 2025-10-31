-- Migration: Add index on Instance.ownerJid for cross-instance message synchronization
-- Purpose: Improve performance when looking up all instances with the same WhatsApp number
-- Created: 2025-10-31

-- Create index on Instance.ownerJid for faster lookups
CREATE INDEX IF NOT EXISTS idx_instance_owner_jid ON "Instance" ("ownerJid");

-- This index enables fast queries like:
-- SELECT id FROM "Instance" WHERE "ownerJid" = '558487168184@s.whatsapp.net'
-- Which is used to find all instances that share the same WhatsApp phone number

-- Index details:
-- - Table: Instance
-- - Column: ownerJid (character varying)
-- - Type: B-tree (default)
-- - Purpose: Speed up owner_jid lookups during message synchronization

-- Optional: Add comment to document this index
COMMENT ON INDEX idx_instance_owner_jid IS 'Index for cross-instance message sync: finds all instances with same ownerJid';
