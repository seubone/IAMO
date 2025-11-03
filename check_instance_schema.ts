import { Client } from 'pg';

const client = new Client({
  host: '31.97.255.54',
  port: 5432,
  database: 'chatwoot',
  user: 'postgres',
  password: 'd4b5507303632dbd23b1',
  ssl: false
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco Evolution\n');

    const query = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Instance'
      ORDER BY ordinal_position;
    `;

    const result = await client.query(query);
    console.log('📋 Colunas da tabela Instance:\n');
    result.rows.forEach((row) => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    await client.end();
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
  }
}

checkSchema();
