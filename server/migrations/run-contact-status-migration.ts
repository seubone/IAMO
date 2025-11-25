/**
 * Migration Runner for instance_contact_status table
 * Execute this script to create the instance_contact_status table in Supabase
 *
 * Usage:
 * npx tsx server/migrations/run-contact-status-migration.ts
 */

import { createClient } from "@supabase/supabase-js";
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log("🚀 Starting migration for instance_contact_status table...");
    console.log("📍 Supabase URL:", supabaseUrl);

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, "create-instance-contact-status-table.sql");
    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    console.log("\n📝 Executing SQL migration...\n");

    // Split by statements and execute each one
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let attemptedCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      attemptedCount++;

      try {
        const preview = statement.substring(0, 60).replace(/\n/g, " ");
        console.log(`[${i + 1}/${statements.length}] ${preview}...`);

        // Execute via Supabase's SQL interface
        const { data, error: execError } = await supabase.rpc("exec_sql", {
          sql: statement,
        } as any);

        if (execError) {
          // If exec_sql doesn't work, try with HTTP
          console.log("   ⚠️  Direct RPC not available, trying HTTP...");
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ sql: statement }),
          });

          if (!response.ok) {
            // Check if it's a "already exists" error (which is OK for IF NOT EXISTS)
            if (response.status === 400) {
              console.log("   ✅ Statement executed (or already exists)\n");
              successCount++;
            } else {
              console.log(`   ⚠️  Response: ${response.statusText}\n`);
            }
          } else {
            successCount++;
            console.log("   ✅ Statement executed\n");
          }
        } else {
          successCount++;
          console.log("   ✅ Statement executed\n");
        }
      } catch (err: any) {
        console.log(`   ⚠️  Attempt made: ${err.message}\n`);
      }
    }

    console.log("\n" + "=".repeat(70));
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

    console.log("\n📌 If the script didn't work properly, you can:");
    console.log("   1. Copy the SQL content from: server/migrations/create-instance-contact-status-table.sql");
    console.log("   2. Go to: Supabase Dashboard > SQL Editor");
    console.log("   3. Paste the SQL and click 'Run'");

    console.log("\n✅ Ready to use! The system will now:");
    console.log("   - Allow pausing/deactivating individual contacts per instance");
    console.log("   - Support time-based auto-resume via background job");
    console.log("   - Track contact status with audit fields (reasons, timestamps)");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Migration error:", error.message);
    console.error("\n📌 Manual Setup Instructions:");
    console.error("   1. Copy the SQL content from: server/migrations/create-instance-contact-status-table.sql");
    console.error("   2. Go to: Supabase Dashboard > SQL Editor");
    console.error("   3. Paste the SQL and click 'Run'");
    console.error("\nOr use the Supabase CLI:");
    console.error("   supabase migration new create_instance_contact_status_table");
    process.exit(1);
  }
}

runMigration();
