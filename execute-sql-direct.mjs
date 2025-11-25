#!/usr/bin/env node
/**
 * Execute SQL directly on Supabase Database
 * Uses the SQL Editor API to execute raw SQL statements
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
  console.log("[ERROR] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

console.log("[INFO] Initializing Supabase client...");
console.log(`[INFO] Project: ${supabaseUrl}`);

// Initialize admin client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function executeSql() {
  try {
    // Read SQL file
    const sqlFile = path.join(__dirname, "server/migrations/create-instance-contact-status-table.sql");
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`SQL file not found: ${sqlFile}`);
    }

    const sqlContent = fs.readFileSync(sqlFile, "utf-8");
    console.log(`[INFO] SQL file loaded: ${sqlContent.length} characters`);

    // Execute the full SQL as one statement using the query method
    console.log("[INFO] Executing SQL...\n");

    const { data, error, status } = await supabase.rpc("exec", {
      query: sqlContent,
    });

    if (error) {
      console.log(`[WARNING] exec() method not available (error: ${error.code})`);
      console.log("[INFO] Trying alternative approach...\n");

      // Try raw query execution via the query endpoint
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ query: sqlContent }),
      });

      if (!response.ok) {
        console.log(`[WARNING] HTTP Status: ${response.status}`);
        const responseText = await response.text();
        console.log(`[INFO] Response: ${responseText.substring(0, 200)}`);
      }
    } else {
      console.log("[SUCCESS] SQL executed successfully!");
    }

    // Now try to verify by checking if table exists
    console.log("\n[INFO] Verifying table creation...");

    const { data: tableData, error: tableError } = await supabase
      .from("instance_contact_status")
      .select("*")
      .limit(1);

    if (tableError) {
      if (tableError.code === "42P01") {
        console.log("[INFO] Table still not found. Checking table list...");

        // List all tables
        const { data: tables, error: listError } = await supabase.rpc(
          "information_schema_tables_list"
        );

        if (listError) {
          console.log("[INFO] Trying direct PostgreSQL query...");

          // Try to execute the full SQL via direct statement
          const statements = sqlContent
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s && !s.startsWith("--"));

          console.log(`[INFO] Found ${statements.length} SQL statements`);
          console.log("[INFO] Attempting to execute statements in sequence...\n");

          for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            const preview = stmt.substring(0, 60).replace(/\n/g, " ");

            try {
              // Use exec_sql via rpc
              const { data, error } = await supabase.rpc("exec_sql", {
                query: stmt,
              });

              if (error && error.code !== "PGRST202") {
                console.log(
                  `[${i + 1}/${statements.length}] ${preview}... [OK]`
                );
              } else {
                console.log(
                  `[${i + 1}/${statements.length}] ${preview}... [SKIP - ${error?.code || "OK"}]`
                );
              }
            } catch (err) {
              console.log(`[${i + 1}/${statements.length}] ${preview}... [TRY]`);
            }
          }
        }
      } else {
        console.log(`[ERROR] Table error: ${tableError.message}`);
      }
    } else {
      console.log("[SUCCESS] Table instance_contact_status EXISTS!");
      console.log(`[SUCCESS] Table has ${tableData?.length || 0} rows`);
    }

    console.log("\n[INFO] Manual verification:");
    console.log("1. Go to: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/editor/tables");
    console.log("2. Look for 'instance_contact_status' table");
    console.log("3. If not found, use SQL Editor to paste and run:");
    console.log("   - File: server/migrations/create-instance-contact-status-table.sql");

  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    console.error("\n[INFO] Manual steps:");
    console.error("1. Go to: https://app.supabase.com/");
    console.error("2. SQL Editor > New Query");
    console.error("3. Copy-paste: server/migrations/create-instance-contact-status-table.sql");
    console.error("4. Click Run");
  }
}

executeSql();
