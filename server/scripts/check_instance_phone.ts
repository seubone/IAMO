import { Client } from 'pg';

const client = new Client({
  host: '31.97.255.54',
  port: 5432,
  database: 'chatwoot',
  user: 'postgres',
  password: 'd4b5507303632dbd23b1',
  ssl: false
});

async function checkInstancePhone() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco Evolution\n');

    // Buscar detalhes da instância que contém as mensagens
    const instanceId = 'f1e3b1ec-b55e-495a-96f4-15f118d1ce8f';

    const query = `
      SELECT
        id,
        name,
        number,
        "connectionStatus",
        "ownerJid",
        "profileName"
      FROM "Instance"
      WHERE id = $1;
    `;

    const result = await client.query(query, [instanceId]);

    if (result.rows.length === 0) {
      console.log('❌ Instância não encontrada!');
    } else {
      const instance = result.rows[0];
      console.log('📱 DETALHES DA INSTÂNCIA:\n');
      console.log(`ID: ${instance.id}`);
      console.log(`Nome: ${instance.name}`);
      console.log(`Número de Telefone: ${instance.number || '(não registrado)'}`);
      console.log(`Jid do Proprietário: ${instance.ownerJid || '(não registrado)'}`);
      console.log(`Nome do Perfil: ${instance.profileName || '(não registrado)'}`);
      console.log(`Status: ${instance.connectionStatus}`);
    }

    // Agora vou buscar TODAS as instâncias e listar seus números de telefone
    console.log('\n\n📋 TODAS AS INSTÂNCIAS E SEUS NÚMEROS:\n');
    const allInstancesQuery = `
      SELECT
        id,
        name,
        number
      FROM "Instance"
      ORDER BY name;
    `;

    const allInstances = await client.query(allInstancesQuery);

    allInstances.rows.forEach((row) => {
      console.log(`Nome: ${row.name}`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Número WhatsApp: ${row.number || '(não registrado)'}`);
      console.log();
    });

    await client.end();
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
  }
}

checkInstancePhone();
