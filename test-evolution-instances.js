import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: '31.97.255.54',
  port: 5432,
  database: 'evolution',
  user: 'postgres',
  password: '15190b6802844e6781b2',
});

async function testInstances() {
  try {
    console.log('🔄 Verificando instâncias do Evolution...\n');

    const result = await pool.query(`
      SELECT
        id,
        name,
        number,
        owner_jid,
        connection_status,
        "createdAt",
        "updatedAt"
      FROM "Instance"
      ORDER BY "createdAt" DESC
    `);

    console.log(`📊 Total de instâncias: ${result.rows.length}\n`);

    result.rows.forEach((instance, index) => {
      console.log(`${index + 1}. ${instance.name}`);
      console.log(`   📱 Número: ${instance.number}`);
      console.log(`   👤 JID: ${instance.owner_jid}`);
      console.log(`   🔌 Status: ${instance.connection_status}`);
      console.log(`   📅 Criado: ${new Date(instance.createdAt).toLocaleString('pt-BR')}`);
      console.log(`   🔄 Atualizado: ${new Date(instance.updatedAt).toLocaleString('pt-BR')}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testInstances();
