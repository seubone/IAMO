import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: '31.97.255.54',
  port: 5432,
  database: 'evolution',
  user: 'postgres',
  password: '15190b6802844e6781b2',
});

async function testConnection() {
  try {
    console.log('🔄 Testando conexão com Evolution DB...');
    const result = await pool.query('SELECT version()');
    console.log('✅ Conexão bem-sucedida!');
    console.log('📌 Versão do PostgreSQL:', result.rows[0].version);
    
    // Check for tables
    console.log('\n🔍 Procurando tabelas...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public'
      LIMIT 10
    `);
    console.log('📊 Tabelas encontradas:', tables.rows.length);
    tables.rows.forEach(row => {
      console.log('  - ' + row.table_name);
    });

    // Check Instance table specifically
    console.log('\n🔍 Procurando tabela "Instance"...');
    const instanceTable = await pool.query(`
      SELECT COUNT(*) FROM "Instance"
    `);
    console.log('✅ Tabela "Instance" existe e contém', instanceTable.rows[0].count, 'registros');

  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testConnection();
