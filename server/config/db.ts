import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

let poolInstance: InstanceType<typeof Pool> | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function initializeDatabase() {
  if (dbInstance) return { pool: poolInstance, db: dbInstance };

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
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
