import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('========================================');
console.log('CREATE user_profiles TABLE');
console.log('========================================\n');

async function createUserProfilesTable() {
  console.log('Step 1: Creating user_profiles table...\n');

  try {
    // Since we can't execute raw SQL directly via the Supabase JS client,
    // we'll create the table using the Management API or provide instructions

    console.log('⚠️  Direct SQL execution is not available via Supabase JS client.');
    console.log('Please use one of the following methods:\n');

    console.log('METHOD 1 - Supabase Dashboard (Recommended):');
    console.log('==============================================');
    const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (projectId) {
      console.log(`1. Go to: https://app.supabase.com/project/${projectId}/sql`);
    } else {
      console.log('1. Go to your Supabase project SQL Editor');
    }
    console.log('2. Copy and paste the following SQL:\n');

    const createTableSQL = `
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT unique_user_id UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at DESC);

-- Create update trigger function
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile"
  ON public.user_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
`;

    console.log('SQL TO EXECUTE:');
    console.log('=====================================');
    console.log(createTableSQL);
    console.log('=====================================\n');

    console.log('\nMETHOD 2 - Using curl (Advanced):');
    console.log('==================================');
    console.log('You can use the Supabase Management API with curl, but this requires');
    console.log('additional authentication setup.\n');

    console.log('METHOD 3 - Supabase CLI:');
    console.log('========================');
    console.log('If you have Supabase CLI configured:');
    console.log('1. Save the SQL to a file in supabase/migrations/');
    console.log('2. Run: npx supabase db push\n');

    console.log('========================================');
    console.log('After creating the table, run this command to verify:');
    console.log('node scripts/check-user-profiles-table.js');
    console.log('========================================\n');

  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log('\nFull error:', err);
  }
}

async function checkIfTableExists() {
  console.log('Checking if table already exists...\n');

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('❌ Table does not exist yet.\n');
        return false;
      }
      console.log('⚠️  Error checking table:', error.message, '\n');
      return false;
    }

    console.log('✅ Table already exists!\n');
    return true;
  } catch (err) {
    console.log('⚠️  Exception:', err.message, '\n');
    return false;
  }
}

async function main() {
  const exists = await checkIfTableExists();

  if (exists) {
    console.log('The user_profiles table already exists in your database.');
    console.log('No action needed.\n');

    // Show current schema
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (!error && data !== null) {
      console.log('Run this command to see the full schema:');
      console.log('node scripts/check-user-profiles-table.js\n');
    }
  } else {
    await createUserProfilesTable();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
