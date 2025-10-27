import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '31.97.255.54',
  port: 5432,
  database: 'monitor_ia',
  user: 'postgres',
  password: 'd4b5507303632dbd23b1',
  ssl: false
});

async function runMigration() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    await client.connect();

    console.log('📝 Adicionando coluna send_api à tabela uazapi_instances...');

    // Adicionar coluna
    await client.query(`
      ALTER TABLE uazapi_instances
      ADD COLUMN IF NOT EXISTS send_api VARCHAR(20) DEFAULT 'evolution'
    `);

    console.log('✅ Coluna send_api adicionada');

    // Adicionar constraint se não existir
    try {
      await client.query(`
        ALTER TABLE uazapi_instances
        ADD CONSTRAINT check_send_api CHECK (send_api IN ('evolution', 'uazapi', 'both'))
      `);
      console.log('✅ Constraint adicionada');
    } catch (e) {
      if (e.code === '42710') {
        console.log('ℹ️  Constraint já existe');
      } else {
        throw e;
      }
    }

    // Verificar resultado
    console.log('\n📊 Verificando estrutura da tabela:');
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'uazapi_instances'
      ORDER BY ordinal_position
    `);

    result.rows.forEach((row) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'nenhum'})`);
    });

    console.log('\n✅ Migration concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
