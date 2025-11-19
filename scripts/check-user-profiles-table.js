import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

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
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('========================================');
console.log('USER PROFILES TABLE CHECK');
console.log('========================================\n');

async function checkTableExists() {
  console.log('Checking if user_profiles table exists...\n');

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (error) {
      // Check if error is because table doesn't exist
      if (error.message.includes('does not exist') || error.code === 'PGRST204' || error.code === '42P01') {
        console.log('❌ Table "user_profiles" does not exist\n');
        return false;
      }

      // Other error
      console.log('⚠️  Error checking table:', error.message);
      return false;
    }

    console.log('✅ Table "user_profiles" exists!\n');
    return true;
  } catch (err) {
    console.log('❌ Exception while checking table:', err.message);
    return false;
  }
}

async function getTableSchema() {
  console.log('Fetching current schema for user_profiles table...\n');

  try {
    // Query information_schema to get column details
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_profiles'
        ORDER BY ordinal_position;
      `
    });

    if (error) {
      // Try alternative method using direct query
      const { data: columns, error: colError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(0);

      if (colError) {
        console.log('⚠️  Could not fetch schema details');
        return null;
      }

      console.log('✅ Table columns (basic info):');
      if (columns && typeof columns === 'object') {
        console.log('Columns detected from query result\n');
      }
      return columns;
    }

    if (data && data.length > 0) {
      console.log('✅ Current Schema:\n');
      console.log('Column Name          | Data Type       | Nullable | Default');
      console.log('-------------------------------------------------------------');

      data.forEach(col => {
        const name = col.column_name.padEnd(20);
        const type = col.data_type.padEnd(15);
        const nullable = col.is_nullable === 'YES' ? 'YES' : 'NO ';
        const defaultVal = col.column_default || '';
        console.log(`${name} | ${type} | ${nullable}     | ${defaultVal}`);
      });
      console.log('');

      return data;
    }

    return null;
  } catch (err) {
    console.log('⚠️  Could not fetch detailed schema:', err.message);

    // Try simple column detection
    try {
      const { data: sample } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

      if (sample && sample.length > 0) {
        console.log('✅ Columns detected from sample data:');
        console.log(Object.keys(sample[0]).join(', '));
        console.log('');
      }
    } catch (e) {
      // Ignore
    }

    return null;
  }
}

async function createTable() {
  console.log('========================================');
  console.log('CREATING user_profiles TABLE');
  console.log('========================================\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'server', 'migrations', 'create-user-profiles-table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL...\n');

    // Execute the migration
    // Note: Supabase doesn't support direct SQL execution via the JS client
    // You need to either:
    // 1. Use the Supabase SQL Editor in the dashboard
    // 2. Use the Supabase CLI
    // 3. Create a database function to execute SQL

    console.log('⚠️  To create the table, you need to execute the SQL migration manually.');
    console.log('Options:\n');
    console.log('1. Use Supabase Dashboard SQL Editor:');
    console.log(`   - Go to: ${SUPABASE_URL.replace('https://', 'https://app.').replace('.supabase.co', '.supabase.co')}/editor/sql`);
    console.log('   - Paste the SQL from: server/migrations/create-user-profiles-table.sql\n');

    console.log('2. Use Supabase CLI:');
    console.log('   npx supabase db push\n');

    console.log('3. Or copy the SQL below and execute it:\n');
    console.log('-------------------------------------------------------------');
    console.log(migrationSQL);
    console.log('-------------------------------------------------------------\n');

  } catch (err) {
    console.log('❌ Error reading migration file:', err.message);
  }
}

async function getRowCount() {
  try {
    const { count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('⚠️  Could not get row count:', error.message);
      return null;
    }

    console.log(`📊 Total profiles in table: ${count}\n`);
    return count;
  } catch (err) {
    console.log('⚠️  Could not get row count:', err.message);
    return null;
  }
}

async function main() {
  const exists = await checkTableExists();

  if (exists) {
    await getTableSchema();
    await getRowCount();

    console.log('========================================');
    console.log('✅ TABLE CHECK COMPLETE');
    console.log('========================================\n');
  } else {
    console.log('Table does not exist. Will prepare migration...\n');
    await createTable();

    console.log('========================================');
    console.log('⚠️  ACTION REQUIRED');
    console.log('========================================\n');
    console.log('Please execute the migration SQL to create the user_profiles table.');
    console.log('After creating the table, run this script again to verify.\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
