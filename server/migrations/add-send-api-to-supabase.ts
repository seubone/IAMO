/**
 * Migration: Add send_api column to uazapi_instances table in Supabase
 * This migration adds support for choosing between Evolution and UazAPI for sending messages
 *
 * NOTE: Supabase doesn't provide direct SQL execution via SDK for DDL operations.
 * You need to run this SQL directly in the Supabase SQL Editor:
 * https://app.supabase.com/project/svfucusuhnwmwyojmxgr/sql
 */

const SQL_MIGRATION = `
-- Add send_api column to uazapi_instances
ALTER TABLE uazapi_instances
ADD COLUMN IF NOT EXISTS send_api VARCHAR(20) DEFAULT 'evolution';

-- Drop existing constraint if it exists
ALTER TABLE uazapi_instances
DROP CONSTRAINT IF EXISTS check_send_api;

-- Add CHECK constraint for valid values
ALTER TABLE uazapi_instances
ADD CONSTRAINT check_send_api CHECK (send_api IN ('evolution', 'uazapi'));

-- Verify the migration
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'uazapi_instances'
ORDER BY ordinal_position;
`;

console.log("🔄 Supabase Migration: Add send_api column");
console.log("=" .repeat(60));
console.log("\n⚠️  IMPORTANT: Supabase doesn't allow DDL via SDK.");
console.log("Please run this SQL in the Supabase Dashboard:\n");
console.log("📍 Go to: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/sql");
console.log("📍 Click: New Query");
console.log("📍 Paste the SQL below and click: RUN\n");
console.log("=" .repeat(60));
console.log(SQL_MIGRATION);
console.log("=" .repeat(60));
console.log("\n✅ After running in Supabase, restart the application");
console.log("   Command: npm run dev\n");

export { SQL_MIGRATION };
