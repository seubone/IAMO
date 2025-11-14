async function debugEnv() {
  console.log("Environment Variables:");
  console.log("EVOLUTION_DB_HOST:", process.env.EVOLUTION_DB_HOST);
  console.log("EVOLUTION_DB_PORT:", process.env.EVOLUTION_DB_PORT);
  console.log("EVOLUTION_DB_NAME:", process.env.EVOLUTION_DB_NAME);
  console.log("EVOLUTION_DB_USER:", process.env.EVOLUTION_DB_USER);
  console.log("EVOLUTION_DB_PASSWORD:", process.env.EVOLUTION_DB_PASSWORD ? "***" : "UNDEFINED");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + "..." : "UNDEFINED");

  // Test connection
  const { Pool } = await import("pg");
  const config = {
    host: process.env.EVOLUTION_DB_HOST,
    port: parseInt(process.env.EVOLUTION_DB_PORT || "5432"),
    user: process.env.EVOLUTION_DB_USER,
    password: process.env.EVOLUTION_DB_PASSWORD,
    database: process.env.EVOLUTION_DB_NAME,
    connectionTimeoutMillis: 5000,
  };
  
  console.log("\nConnection config:");
  console.log(JSON.stringify({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password ? "***" : "UNDEFINED",
    database: config.database,
  }, null, 2));

  const pool = new Pool(config);
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("\n✅ Connected successfully!");
    console.log("Server time:", result.rows[0].now);
  } catch (error: any) {
    console.error("\n❌ Connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

debugEnv();
