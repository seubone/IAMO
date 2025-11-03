import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
  host: '31.97.255.54',
  port: 5432,
  database: 'chatwoot',
  user: 'postgres',
  password: 'd4b5507303632dbd23b1',
  ssl: false
});

async function executeMigration() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco Evolution\n');

    // Read the migration file
    const migrationPath = join(__dirname, 'server/migrations/add-owner-jid-index.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executando migração: add-owner-jid-index.sql\n');

    // Execute the migration
    await client.query(sql);

    console.log('✅ Migração executada com sucesso!\n');

    // Verify the index was created
    const indexCheck = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE indexname = 'idx_instance_owner_jid'
    `);

    if (indexCheck.rows.length > 0) {
      console.log('✅ Índice criado com sucesso:');
      indexCheck.rows.forEach(row => {
        console.log(`   - Índice: ${row.indexname}`);
        console.log(`   - Tabela: ${row.tablename}`);
      });
    } else {
      console.log('⚠️  Índice pode já existir ou não foi criado');
    }

    await client.end();
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

executeMigration();
