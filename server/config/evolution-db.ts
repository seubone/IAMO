import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as evolutionSchema from "@shared/evolution-schema";

// Configurar conexão com banco Evolution (PostgreSQL padrão, não Neon)
const evolutionDbUrl = `postgresql://${process.env.EVOLUTION_DB_USER}:${process.env.EVOLUTION_DB_PASSWORD}@${process.env.EVOLUTION_DB_HOST}:${process.env.EVOLUTION_DB_PORT}/${process.env.EVOLUTION_DB_NAME}`;

if (!process.env.EVOLUTION_DB_HOST || !process.env.EVOLUTION_DB_USER || !process.env.EVOLUTION_DB_PASSWORD) {
  throw new Error(
    "EVOLUTION_DB credentials must be set. Check EVOLUTION_DB_HOST, EVOLUTION_DB_USER, EVOLUTION_DB_PASSWORD environment variables.",
  );
}

// Pool de conexão para o banco Evolution (read-only queries)
export const evolutionPool = new Pool({ 
  connectionString: evolutionDbUrl,
  // Read-only connection settings
  max: 10, // Máximo de conexões simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const evolutionDb = drizzle(evolutionPool, { schema: evolutionSchema });

// Testar conexão na inicialização
evolutionPool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro ao conectar no banco Evolution:', err.message);
    return;
  }
  console.log('✅ Conectado ao banco Evolution (WhatsApp)');
  release();
});
