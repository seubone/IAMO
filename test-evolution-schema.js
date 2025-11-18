import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: '31.97.255.54',
  port: 5432,
  database: 'evolution',
  user: 'postgres',
  password: '15190b6802844e6781b2',
});

async function testSchema() {
  try {
    console.log('📋 Estrutura da tabela "Instance":\n');

    const result = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'Instance'
      ORDER BY ordinal_position
    `);

    result.rows.forEach(col => {
      console.log(`- ${col.column_name}`);
      console.log(`  Tipo: ${col.data_type}`);
      console.log(`  Nullable: ${col.is_nullable}`);
      if (col.column_default) console.log(`  Default: ${col.column_default}`);
      console.log('');
    });

    console.log('\n📊 Primeiras instâncias:\n');
    const instances = await pool.query('SELECT * FROM "Instance" LIMIT 3');
    console.log(JSON.stringify(instances.rows, null, 2));

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testSchema();
