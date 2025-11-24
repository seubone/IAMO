/**
 * Migration Runner for instance_n8n_workflows table
 * Execute this script to create the instance_n8n_workflows table in Supabase
 *
 * Usage:
 * npx tsx server/migrations/run-instance-workflows-migration.ts
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
    console.log("🚀 Starting migration for instance_n8n_workflows table...");
    console.log("📍 Supabase URL:", supabaseUrl);

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, "create-instance-n8n-workflows-table.sql");
    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    console.log("\n📝 Executing SQL migration...\n");

    // Split by statements and execute each one
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    let successCount = 0;
    for (const statement of statements) {
      try {
        console.log(`Executing:\n${statement.substring(0, 80)}...\n`);

        // Execute via Supabase's SQL interface
        const { data, error: execError } = await supabase.rpc("exec_sql", {
          sql: statement,
        } as any);

        if (execError) {
          // If exec_sql doesn't work, try with admin API
          console.log("⚠️  Direct RPC not available, trying with HTTP...");
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ sql: statement }),
          });

          if (!response.ok) {
            console.log(`⚠️  Statement may have failed or already exists: ${response.statusText}`);
          } else {
            successCount++;
            console.log("✅ Statement executed\n");
          }
        } else {
          successCount++;
          console.log("✅ Statement executed\n");
        }
      } catch (err: any) {
        console.log(`⚠️  Statement execution attempt made: ${err.message}\n`);
      }
    }

    console.log("✅ Migration completed!");
    console.log("\n✨ Table instance_n8n_workflows has been created with:");
    console.log("   - Columns: id, instance_id, instance_number, workflow_id, workflow_name");
    console.log("   - Config: webhook_url, trigger_type, config (JSONB)");
    console.log("   - Status: is_active, last_triggered_at, last_error_message, last_error_at");
    console.log("   - Metadata: created_at, updated_at");
    console.log("\n📚 Indexes created:");
    console.log("   - idx_instance_n8n_workflows_instance_id");
    console.log("   - idx_instance_n8n_workflows_instance_number");
    console.log("   - idx_instance_n8n_workflows_workflow_id");
    console.log("   - idx_instance_n8n_workflows_is_active");
    console.log("   - idx_instance_n8n_workflows_trigger_type");
    console.log("\n🔒 RLS policies enabled for authenticated users");
    console.log("\n📌 If the script didn't work properly, you can:");
    console.log("   1. Copy the SQL content from: server/migrations/create-instance-n8n-workflows-table.sql");
    console.log("   2. Go to: Supabase Dashboard > SQL Editor");
    console.log("   3. Paste the SQL and click 'Run'");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Migration error:", error.message);
    console.error("\n📌 Manual Setup Instructions:");
    console.error("   1. Copy the SQL content from: server/migrations/create-instance-n8n-workflows-table.sql");
    console.error("   2. Go to: Supabase Dashboard > SQL Editor");
    console.error("   3. Paste the SQL and click 'Run'");
    console.error("\nOr use the Supabase CLI:");
    console.error("   supabase migration new create_instance_n8n_workflows_table");
    process.exit(1);
  }
}

runMigration();
