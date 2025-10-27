/**
 * Migration Script: Add send_api column to uazapi_instances in Supabase
 * Usage: node server/migrations/add-send-api-to-supabase.mjs
 */

import pkg from 'pg';
const { Pool } = pkg;

// Extract Supabase connection string from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Parse Supabase credentials
// Supabase uses: postgresql://postgres:[password]@[host]:[port]/[database]
// The host is part of SUPABASE_URL
const parseSupabaseConnectionString = () => {
  // Supabase default port is 5432, password from env, host is extracted from URL
  // Format: https://[project-id].supabase.co
  const projectId = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectId) {
    throw new Error('Could not extract project ID from SUPABASE_URL');
  }

  const connectionString = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || 'password'}@db.${projectId}.supabase.co:5432/postgres?sslmode=require`;

  return connectionString;
};

const runMigration = async () => {
  const connectionString = parseSupabaseConnectionString();

  console.log('🔄 Starting Supabase migration...');
  console.log('📍 Connecting to Supabase PostgreSQL...\n');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 30000,
  });

  const client = await pool.connect();

  try {
    // Add send_api column
    console.log('📝 Adding send_api column to uazapi_instances...');
    await client.query(`
      ALTER TABLE uazapi_instances
      ADD COLUMN IF NOT EXISTS send_api VARCHAR(20) DEFAULT 'evolution';
    `);
    console.log('✅ Column added successfully');

    // Drop existing constraint if exists
    console.log('📋 Updating constraints...');
    await client.query(`
      ALTER TABLE uazapi_instances
      DROP CONSTRAINT IF EXISTS check_send_api;
    `);

    // Add new constraint
    await client.query(`
      ALTER TABLE uazapi_instances
      ADD CONSTRAINT check_send_api CHECK (send_api IN ('evolution', 'uazapi'));
    `);
    console.log('✅ Constraints updated successfully');

    // Verify the migration
    console.log('🔍 Verifying migration...');
    const result = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'uazapi_instances'
      ORDER BY ordinal_position;
    `);

    console.log('\n✅ Table structure after migration:');
    console.table(result.rows);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  Column already exists - this is fine!');
      console.log('Migration appears to have already been run.');
    } else {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration
runMigration()
  .then(() => {
    console.log('\n✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
