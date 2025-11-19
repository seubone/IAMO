import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function runMigration() {
  console.log('========================================');
  console.log('RUNNING user_profiles TABLE MIGRATION');
  console.log('========================================\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'create-user-profiles-table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded\n');
    console.log('Executing SQL migration...\n');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (!statement || statement.startsWith('--')) {
        continue;
      }

      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          console.log(`⚠️  Error in statement ${i + 1}:`, error.message);

          // If error is about function not existing, suggest alternative
          if (error.message.includes('exec_sql') || error.message.includes('does not exist')) {
            console.log('\n⚠️  The exec_sql function does not exist in your Supabase database.');
            console.log('You need to create it first or use the Supabase SQL Editor.');
            console.log('\nTo create the exec_sql function, run this SQL in Supabase SQL Editor:\n');
            console.log('CREATE OR REPLACE FUNCTION exec_sql(sql text)');
            console.log('RETURNS void');
            console.log('LANGUAGE plpgsql');
            console.log('SECURITY DEFINER');
            console.log('AS $$');
            console.log('BEGIN');
            console.log('  EXECUTE sql;');
            console.log('END;');
            console.log('$$;\n');
            break;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err: any) {
        console.log(`❌ Exception in statement ${i + 1}:`, err.message);
      }
    }

    console.log('\n========================================');
    console.log('MIGRATION EXECUTION COMPLETE');
    console.log('========================================\n');

    // Verify the table was created
    console.log('Verifying table creation...\n');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.log('⚠️  Table verification failed:', error.message);
      console.log('\nPlease use the Supabase SQL Editor to execute the migration manually:');
      console.log(`URL: ${SUPABASE_URL.replace('https://', 'https://app.').replace('.supabase.co', '.supabase.co')}/editor/sql`);
      console.log('\nSQL file location: server/migrations/create-user-profiles-table.sql\n');
    } else {
      console.log('✅ Table "user_profiles" verified successfully!\n');
    }

  } catch (err: any) {
    console.log('❌ Migration failed:', err.message);
    console.log('\nFull error:', err);
  }
}

runMigration();
