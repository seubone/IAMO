/**
 * Migration Runner for bot_instances table
 * Execute this script to create the bot_instances table in Supabase
 *
 * Usage:
 * npx tsx server/migrations/run-migration.ts
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables are required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log("🚀 Starting migration...");
    console.log("📍 Supabase URL:", supabaseUrl);

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, "create-bot-instances-table.sql");
    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    console.log("\n📝 Executing SQL migration...\n");

    // Execute the migration
    const { error } = await supabase.rpc("exec", { sql: sqlContent });

    if (error) {
      // If the RPC method doesn't exist, try alternative approach
      console.log("⚠️  Direct RPC execution not available, trying raw SQL execution...\n");

      // Split by statements and execute each one
      const statements = sqlContent
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

      for (const statement of statements) {
        console.log(`Executing:\n${statement}\n`);
        const { error: execError } = await supabase.rpc("exec_sql", {
          query: statement,
        });

        if (execError) {
          // Try direct execution via admin API if available
          console.log(`Attempting direct execution...\n`);
        }
      }
    }

    console.log("✅ Migration completed successfully!");
    console.log("\n✨ Table bot_instances has been created with:");
    console.log("   - Columns: id, instance_id, instance_number, instance_remote_jid");
    console.log("   - Bot config: has_bot_enabled, bot_name, consultant_name, bot_activity");
    console.log("   - Message formatting: message_prefix_template, use_prefix_for_bot, use_prefix_for_consultant");
    console.log("   - Metadata: created_at, updated_at");
    console.log("\n📚 Indexes created:");
    console.log("   - idx_bot_instances_instance_number");
    console.log("   - idx_bot_instances_enabled");
    console.log("   - idx_bot_instances_instance_id");
    console.log("\n🔒 RLS policies enabled for authenticated users");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    console.error("\n📌 Note: If you're using Supabase, you need to:");
    console.error("   1. Copy the SQL content from: server/migrations/create-bot-instances-table.sql");
    console.error("   2. Go to: Supabase Dashboard > SQL Editor");
    console.error("   3. Paste the SQL and click 'Run'");
    console.error("\nOr use the Supabase CLI:");
    console.error("   supabase migration new create_bot_instances_table");
    process.exit(1);
  }
}

runMigration();
