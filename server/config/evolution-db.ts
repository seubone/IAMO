import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as evolutionSchema from "@shared/evolution-schema";

let evolutionPoolInstance: InstanceType<typeof Pool> | null = null;
let evolutionDbInstance: ReturnType<typeof drizzle> | null = null;
let initialized = false;

function initializeEvolutionDb() {
  if (evolutionDbInstance) return { pool: evolutionPoolInstance, db: evolutionDbInstance };

  // Configurar conexão com banco Evolution (PostgreSQL padrão, não Neon)
  const evolutionDbUrl = `postgresql://${process.env.EVOLUTION_DB_USER}:${process.env.EVOLUTION_DB_PASSWORD}@${process.env.EVOLUTION_DB_HOST}:${process.env.EVOLUTION_DB_PORT}/${process.env.EVOLUTION_DB_NAME}`;

  if (!process.env.EVOLUTION_DB_HOST || !process.env.EVOLUTION_DB_USER || !process.env.EVOLUTION_DB_PASSWORD) {
    throw new Error(
      "EVOLUTION_DB credentials must be set. Check EVOLUTION_DB_HOST, EVOLUTION_DB_USER, EVOLUTION_DB_PASSWORD environment variables.",
    );
  }

  // Pool de conexão para o banco Evolution (read-only queries)
  evolutionPoolInstance = new Pool({
    connectionString: evolutionDbUrl,
    // Read-only connection settings - otimizado para leitura
    max: 10, // Aumentado para 10 para melhor paralelismo
    min: 2, // Manter 2 conexões aquecidas
    idleTimeoutMillis: 60000, // 1 minuto
    connectionTimeoutMillis: 30000, // 30s timeout para conexões
    statement_timeout: 15000, // 15s timeout para queries (falha rápido se houver problema)
  });

  evolutionDbInstance = drizzle(evolutionPoolInstance, { schema: evolutionSchema });

  // Testar conexão na inicialização (async, não bloqueia startup)
  // Isso é feito de forma assíncrona para não impedir o início da aplicação
  setImmediate(() => {
    evolutionPoolInstance?.connect((err, client, release) => {
      if (err) {
        console.error('❌ Erro ao conectar no banco Evolution (WhatsApp):');
        console.error(`   Host: ${process.env.EVOLUTION_DB_HOST}:${process.env.EVOLUTION_DB_PORT}`);
        console.error(`   Error: ${err.message}`);
        console.error(`   Code: ${(err as any)?.code || 'N/A'}`);
        console.error(`   Timeout: ${process.env.EVOLUTION_DB_TIMEOUT || '30000'}ms`);
        console.error('   💡 Dica: Verifique se o servidor PostgreSQL está acessível e firewall não está bloqueando.');
        return;
      }
      console.log('✅ Conectado ao banco Evolution (WhatsApp)');
      release?.();
    });
  });

  return { pool: evolutionPoolInstance, db: evolutionDbInstance };
}

// Pool de conexão para o banco Evolution (lazy loaded)
export const evolutionPool = new Proxy({} as any, {
  get(target, prop) {
    if (!initialized) {
      initializeEvolutionDb();
      initialized = true;
    }
    return (evolutionPoolInstance as any)[prop];
  }
});

// Drizzle ORM instance for Evolution (lazy loaded)
export const evolutionDb = new Proxy({} as any, {
  get(target, prop) {
    if (!initialized) {
      initializeEvolutionDb();
      initialized = true;
    }
    return (evolutionDbInstance as any)[prop];
  }
});
