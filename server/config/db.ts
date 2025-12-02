import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

let poolInstance: InstanceType<typeof Pool> | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function initializeDatabase() {
  if (dbInstance) return { pool: poolInstance, db: dbInstance };

  // Use DATABASE_URL if provided, otherwise build from EVOLUTION_DB_* variables
  let connectionString = process.env.DATABASE_URL;

  if (!connectionString || connectionString.includes('/simonia')) {
    // If DATABASE_URL is not set or points to non-existent "simonia" database,
    // use Evolution DB credentials instead
    const host = process.env.EVOLUTION_DB_HOST;
    const port = process.env.EVOLUTION_DB_PORT || '5432';
    const database = process.env.EVOLUTION_DB_NAME || 'evolution';
    const user = process.env.EVOLUTION_DB_USER;
    const password = process.env.EVOLUTION_DB_PASSWORD;

    if (!host || !user || !password) {
      throw new Error(
        "Database configuration missing. Either set DATABASE_URL or provide EVOLUTION_DB_* variables",
      );
    }

    connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=disable`;
    console.log(`[db] Using Evolution DB as primary database: ${host}:${port}/${database}`);
  }

  poolInstance = new Pool({ connectionString });
  dbInstance = drizzle(poolInstance, { schema });
  return { pool: poolInstance, db: dbInstance };
}

export const getDb = () => {
  if (!dbInstance) {
    const { db } = initializeDatabase();
    return db;
  }
  return dbInstance;
};

export const getPool = () => {
  if (!poolInstance) {
    const { pool } = initializeDatabase();
    return pool;
  }
  return poolInstance;
};

// For backward compatibility with direct imports
let initialized = false;
export const pool = new Proxy({} as any, {
  get() {
    if (!initialized) {
      initializeDatabase();
      initialized = true;
    }
    return poolInstance;
  }
});

export const db = new Proxy({} as any, {
  get(target, prop) {
    if (!initialized) {
      initializeDatabase();
      initialized = true;
    }
    return (dbInstance as any)[prop];
  }
});
