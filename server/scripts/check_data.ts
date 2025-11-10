import { Client } from 'pg';

const client = new Client({
  host: '31.97.255.54',
  port: 5432,
  database: 'chatwoot',
  user: 'postgres',
  password: 'd4b5507303632dbd23b1',
  ssl: false
});

async function checkData() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco Evolution\n');

    // Check instances
    console.log('📋 INSTÂNCIAS DISPONÍVEIS:');
    const instanceQuery = `SELECT id, name FROM "Instance" LIMIT 10;`;
    const instances = await client.query(instanceQuery);
    console.log(`Total: ${instances.rows.length}`);
    instances.rows.forEach((row) => {
      console.log(`  - ${row.id}: ${row.name}`);
    });

    console.log('\n📋 CHATS DISPONÍVEIS:');
    const chatQuery = `
      SELECT id, "jid", "instanceId", "createdAt"
      FROM "Chat"
      LIMIT 10;
    `;
    const chats = await client.query(chatQuery);
    console.log(`Total: ${chats.rows.length}`);
    chats.rows.forEach((row) => {
      console.log(`  - ${row.jid} (Instância: ${row.instanceId})`);
    });

    console.log('\n📋 TOTAL DE MENSAGENS:');
    const msgQuery = `SELECT COUNT(*) as total FROM "Message";`;
    const msgCount = await client.query(msgQuery);
    console.log(`Total: ${msgCount.rows[0].total}`);

    console.log('\n📋 ÚLTIMAS 5 MENSAGENS:');
    const lastMsgQuery = `
      SELECT
        m.id,
        m."instanceId",
        m.key ->> 'remoteJid' as "remoteJid",
        m."messageType",
        to_timestamp(m."messageTimestamp") as criada_em
      FROM "Message" m
      ORDER BY m."messageTimestamp" DESC
      LIMIT 5;
    `;
    const lastMsgs = await client.query(lastMsgQuery);
    lastMsgs.rows.forEach((row) => {
      console.log(`  - ${row.remoteJid} (${row.messageType}) em ${row.criada_em}`);
    });

    await client.end();
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
  }
}

checkData();
