import { Pool } from "pg";

async function checkDatabases() {
  const config = {
    host: "31.97.255.54",
    port: 5432,
    user: "postgres",
    password: "15190b6802844e6781b2",
    database: "postgres",
  };

  const pool = new Pool(config);

  try {
    const result = await pool.query(`
      SELECT datname FROM pg_database
      WHERE datname NOT IN ('postgres', 'template0', 'template1')
      ORDER BY datname
    `);

    console.log("📊 Databases on server:");
    result.rows.forEach((row) => {
      console.log(`   - ${row.datname}`);
    });

    // Check for specific databases
    const dbs = result.rows.map(r => r.datname);
    console.log("\n✅ evolution exists:", dbs.includes("evolution"));
    console.log("✅ monitor_ia exists:", dbs.includes("monitor_ia"));

  } catch (error: any) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkDatabases();
