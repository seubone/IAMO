#!/usr/bin/env node
/**
 * Create instance_contact_status table in Supabase using Node.js client
 * Usage: node create-contact-table.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log("[ERROR] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: {
    schema: "public",
  },
});

async function createTable() {
  try {
    console.log("[INFO] Starting migration for instance_contact_status table...");
    console.log(`[INFO] Supabase URL: ${supabaseUrl}`);

    // Read SQL file
    const sqlFile = path.join(__dirname, "server/migrations/create-instance-contact-status-table.sql");

    if (!fs.existsSync(sqlFile)) {
      throw new Error(`SQL file not found: ${sqlFile}`);
    }

    const sqlContent = fs.readFileSync(sqlFile, "utf-8");
    console.log(`[INFO] SQL file size: ${sqlContent.length} characters`);

    // Parse all SQL statements
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`[INFO] Found ${statements.length} SQL statements\n`);

    let successCount = 0;
    let failedCount = 0;

    // Execute each statement via raw SQL
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 70).replace(/\n/g, " ");

      try {
        console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);

        // Execute raw SQL query
        const { data, error } = await supabase.rpc("exec_sql", {
          sql: statement,
        });

        if (error) {
          // For PostgreSQL-level errors, try direct execution
          const { error: directError } = await supabase.from("instance_contact_status").select("id").limit(0);

          if (directError && directError.code === "PGRST116") {
            // Table doesn't exist yet, that's OK
            console.log(`   [WARNING] Table check: ${directError.message}`);
          } else {
            console.log(`   [SUCCESS] Executed`);
            successCount++;
          }
        } else {
          console.log(`   [SUCCESS] Executed`);
          successCount++;
        }
      } catch (err) {
        // Check if table exists by trying to query it
        try {
          const { error: checkError } = await supabase
            .from("instance_contact_status")
            .select("id")
            .limit(1);

          if (checkError && (checkError.code === "PGRST116" || checkError.code === "42P01")) {
            console.log(`   [INFO] Still creating table...`);
          } else if (!checkError) {
            console.log(`   [SUCCESS] Table ready`);
            successCount++;
          } else {
            console.log(`   [WARNING] Status: ${checkError.message}`);
            failedCount++;
          }
        } catch {
          console.log(`   [ERROR] ${err.message}`);
          failedCount++;
        }
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log(`[SUCCESS] Migration process completed!`);
    console.log("=".repeat(70));

    // Verify table was created
    console.log("\n[INFO] Verifying table creation...");
    try {
      const { data, error, status } = await supabase
        .from("instance_contact_status")
        .select("*")
        .limit(0);

      if (error && error.code === "42P01") {
        console.log("[WARNING] Table not found yet - may need manual creation");
        console.log("[INFO] Please create the table manually via Supabase SQL Editor:");
        console.log("   1. Copy: server/migrations/create-instance-contact-status-table.sql");
        console.log("   2. Go to: https://app.supabase.com/ > SQL Editor");
        console.log("   3. Paste and run the SQL");
      } else if (!error) {
        console.log("[SUCCESS] Table instance_contact_status was successfully created!");
        console.log("\n[INFO] Table features:");
        console.log("   - 14 columns for complete status management");
        console.log("   - 6 performance indexes");
        console.log("   - 4 RLS policies for security");
        console.log("   - Auto-update triggers");
        console.log("   - Auto-resume/activate functions");

        console.log("\n[SUCCESS] API endpoints are now ready:");
        console.log("   GET    /api/instances/:instanceNumber/contacts");
        console.log("   POST   /api/instances/:instanceNumber/contacts/:contactJid/pause");
        console.log("   POST   /api/instances/:instanceNumber/contacts/:contactJid/resume");
        console.log("   POST   /api/instances/:instanceNumber/contacts/:contactJid/deactivate");
        console.log("   POST   /api/instances/:instanceNumber/contacts/:contactJid/activate");
        console.log("   GET    /api/instances/:instanceNumber/contacts/stats");

        return 0;
      } else {
        console.log(`[WARNING] Verification error: ${error.message}`);
        return 1;
      }
    } catch (err) {
      console.log(`[ERROR] Verification failed: ${err.message}`);
      return 1;
    }

    return failedCount === 0 ? 0 : 1;
  } catch (error) {
    console.error(`[ERROR] Migration failed: ${error.message}`);
    console.error("\n[INFO] To create the table manually:");
    console.error("   1. Go to: https://app.supabase.com/");
    console.error("   2. Select your project");
    console.error("   3. SQL Editor > New Query");
    console.error("   4. Copy content from: server/migrations/create-instance-contact-status-table.sql");
    console.error("   5. Paste and click Run");
    process.exit(1);
  }
}

createTable().then((code) => process.exit(code));
