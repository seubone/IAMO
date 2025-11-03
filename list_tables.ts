import { Client } from 'pg';

const client = new Client({
  host: '31.97.255.54',
  port: 5432,
  database: 'chatwoot',
  user: 'postgres',
  password: 'd4b5507303632dbd23b1',
  ssl: false
});

async function listTables() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco Evolution (chatwoot)');

    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const result = await client.query(query);
    console.log('\n📋 Tabelas disponíveis:');
    result.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

    await client.end();
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
  }
}

listTables();
