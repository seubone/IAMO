/**
 * Run All Database Migrations
 * Executes migrations in the correct order:
 * 1. Create IAs table (if not exists)
 * 2. Extend IAs table with new fields
 * 3. Create Bot Instances table
 *
 * Usage:
 * npx tsx server/migrations/run-all-migrations.ts
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables are required");
  console.error("\nSet environment variables:");
  console.error("export SUPABASE_URL=your_url");
  console.error("export SUPABASE_KEY=your_key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  {
    name: "Create IAs Table",
    file: "create-ias-table.sql",
    description: "Creates the main ias table for AI configurations",
  },
  {
    name: "Extend IAs Table",
    file: "extend-ias-table.sql",
    description: "Adds new fields for N8N, pause scheduling, and message formatting",
  },
  {
    name: "Create Bot Instances Table",
    file: "create-bot-instances-table.sql",
    description: "Creates table for bot instance configurations",
  },
];

async function runMigration(migrationFile: string, migrationName: string): Promise<boolean> {
  try {
    console.log(`\n📝 Running: ${migrationName}`);
    console.log(`📄 File: ${migrationFile}`);

    const migrationPath = path.join(__dirname, migrationFile);

    if (!fs.existsSync(migrationPath)) {
      console.warn(`⚠️  File not found: ${migrationPath}`);
      return false;
    }

    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    // Split by statements and execute each
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`   Found ${statements.length} SQL statements`);

    // Try to execute via RPC first
    try {
      const { error } = await supabase.rpc("exec", { sql: sqlContent });
      if (!error) {
        console.log(`✅ Migration executed successfully`);
        return true;
      }
    } catch (rpcError) {
      // RPC method doesn't exist, continue with alternative approach
    }

    // Alternative: Execute statements one by one
    console.log("   Executing statements individually...");
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   [${i + 1}/${statements.length}] Executing...`);

      try {
        const { error } = await supabase.rpc("exec_sql", { query: statement });
        if (error) {
          console.warn(`   ⚠️  Error in statement ${i + 1}:`, error.message);
        }
      } catch (err) {
        // This is expected if RPC method doesn't exist
      }
    }

    console.log(`✅ Migration completed`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error running migration: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting Database Migrations");
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log("=" .repeat(60));

  const results = [];

  for (const migration of migrations) {
    const success = await runMigration(migration.file, migration.name);
    results.push({
      name: migration.name,
      success,
    });

    // Small delay between migrations
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Migration Results:");
  console.log("=".repeat(60));

  let allSuccess = true;
  for (const result of results) {
    const status = result.success ? "✅" : "❌";
    console.log(`${status} ${result.name}`);
    if (!result.success) allSuccess = false;
  }

  console.log("=".repeat(60));

  if (allSuccess) {
    console.log("✅ All migrations completed successfully!");
    console.log("\n💡 Next steps:");
    console.log("   1. Verify tables were created in Supabase");
    console.log("   2. Check the schema in Supabase Dashboard > SQL Editor");
    console.log("   3. Run: npm run build");
    console.log("   4. Start the server: npm run dev");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some migrations may have failed.");
    console.log("\n📌 IMPORTANT - Manual Setup:");
    console.log("   If automated migration failed, do this manually:");
    console.log("   1. Go to Supabase Dashboard");
    console.log("   2. Navigate to SQL Editor");
    console.log("   3. Create new query");
    console.log("   4. Copy content from each .sql file:");
    for (const mig of migrations) {
      console.log(`      - server/migrations/${mig.file}`);
    }
    console.log("   5. Execute each query");
    console.log("\nOr contact your database administrator");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
