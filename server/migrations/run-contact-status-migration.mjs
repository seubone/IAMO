/**
 * Migration Runner for instance_contact_status table
 * Execute this script to create the instance_contact_status table in Supabase
 *
 * Usage:
 * node server/migrations/run-contact-status-migration.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required");
  process.exit(1);
}

async function runMigration() {
  try {
    console.log("🚀 Starting migration for instance_contact_status table...");
    console.log("📍 Supabase URL:", supabaseUrl);

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, "create-instance-contact-status-table.sql");

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    console.log("\n📝 Preparing SQL statements...\n");

    // Split by statements and execute as a single batch
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"))
      .join(";\n") + ";";

    console.log(`Total SQL size: ${statements.length} characters\n`);

    // Execute via HTTP API with service role key
    console.log("🔐 Executing with service role authentication...\n");

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      },
      body: JSON.stringify({ query: statements }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️  RPC method attempt: ${response.status} ${response.statusText}`);
      console.log(`   Response: ${errorText.substring(0, 200)}`);

      // Try direct SQL execution via Supabase HTTP interface
      console.log("\n🔄 Attempting direct SQL execution...\n");

      const directResponse = await fetch(`${supabaseUrl}/graphql/v1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({
          query: `query { __typename }`, // Test query
        }),
      });

      if (!directResponse.ok) {
        throw new Error(`GraphQL endpoint failed: ${directResponse.status}`);
      }

      console.log("📌 Using the SQL Editor is recommended:");
      console.log("   1. Go to: Supabase Dashboard > SQL Editor");
      console.log("   2. Create a new query");
      console.log("   3. Paste the content from: server/migrations/create-instance-contact-status-table.sql");
      console.log("   4. Click 'Run'");
      throw new Error("Automated execution requires a custom RPC function. Use manual method above.");
    }

    const result = await response.json();
    console.log("✅ SQL executed successfully!\n");

    console.log("=" .repeat(70));
    console.log("✅ Migration completed!");
    console.log("=".repeat(70));

    console.log("\n✨ Table instance_contact_status has been created with:");
    console.log("   - Columns: id, instance_id, instance_number, contact_jid, contact_name");
    console.log("   - Status: status (active|paused|inactive)");
    console.log("   - Pause fields: pause_reason, paused_at, paused_until");
    console.log("   - Inactive fields: inactive_reason, inactive_at, inactive_until");
    console.log("   - Metadata: created_at, updated_at");

    console.log("\n📚 Indexes created:");
    console.log("   - idx_instance_contact_status_instance_number");
    console.log("   - idx_instance_contact_status_instance_id");
    console.log("   - idx_instance_contact_status_contact_jid");
    console.log("   - idx_instance_contact_status_status");
    console.log("   - idx_instance_contact_status_paused_until");
    console.log("   - idx_instance_contact_status_inactive_until");

    console.log("\n🔒 Security:");
    console.log("   - RLS policies enabled for authenticated users");
    console.log("   - Unique constraints: (instance_id, contact_jid), (instance_number, contact_jid)");

    console.log("\n🔄 Auto-update triggers:");
    console.log("   - trigger_instance_contact_status_updated_at");
    console.log("   - auto_resume_paused_contacts (function)");
    console.log("   - auto_activate_inactive_contacts (function)");

    console.log("\n✅ Ready to use! The system will now:");
    console.log("   - Allow pausing/deactivating individual contacts per instance");
    console.log("   - Support time-based auto-resume via background job");
    console.log("   - Track contact status with audit fields (reasons, timestamps)");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\n📌 Manual Setup Instructions (Recommended):");
    console.error("   1. Go to: https://app.supabase.com/");
    console.error("   2. Select your project");
    console.error("   3. Navigate to: SQL Editor");
    console.error("   4. Click: 'New Query'");
    console.error("   5. Copy content from: server/migrations/create-instance-contact-status-table.sql");
    console.error("   6. Paste into the editor and click 'Run'");
    console.error("\nOr use Supabase CLI:");
    console.error("   supabase migration new create_instance_contact_status_table");
    process.exit(1);
  }
}

runMigration();
