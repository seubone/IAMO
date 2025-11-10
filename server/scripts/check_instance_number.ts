import { Client } from 'pg';

const client = new Client({
  host: '31.97.255.54',
  port: 5432,
  database: 'chatwoot',
  user: 'postgres',
  password: 'd4b5507303632dbd23b1',
  ssl: false
});

async function checkInstanceNumber() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco Evolution\n');

    // Verificar instância que contém as mensagens
    const instanceId = 'f1e3b1ec-b55e-495a-96f4-15f118d1ce8f';

    const query = `
      SELECT
        id,
        name,
        number,
        "ownerJid",
        "connectionStatus",
        "createdAt"
      FROM "Instance"
      WHERE id = $1;
    `;

    const result = await client.query(query, [instanceId]);

    if (result.rows.length === 0) {
      console.log('❌ Instância não encontrada');
    } else {
      const inst = result.rows[0];
      console.log('📱 INSTÂNCIA ATUAL:\n');
      console.log(`ID: ${inst.id}`);
      console.log(`Nome: ${inst.name}`);
      console.log(`Número (number): ${inst.number || '(VAZIO)'}`);
      console.log(`OwnerJid: ${inst.ownerJid}`);
      console.log(`Status: ${inst.connectionStatus}`);
      console.log(`Criada: ${inst.createdAt}\n`);

      // Extrair número do ownerJid
      if (inst.ownerJid) {
        const phoneFromOwnerJid = inst.ownerJid.split('@')[0];
        console.log(`📱 NÚMERO EXTRAÍDO DO ownerJid: ${phoneFromOwnerJid}\n`);

        if (!inst.number) {
          console.log('⚠️  Campo "number" está VAZIO!');
          console.log('✅ Vou preencher com o número extraído do ownerJid...\n');

          // Update the number field
          const updateQuery = `
            UPDATE "Instance"
            SET number = $1
            WHERE id = $2;
          `;

          await client.query(updateQuery, [phoneFromOwnerJid, instanceId]);
          console.log(`✅ Campo "number" atualizado para: ${phoneFromOwnerJid}`);
        }
      }
    }

    await client.end();
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
  }
}

checkInstanceNumber();
