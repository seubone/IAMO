import { Client } from 'pg';

const client = new Client({
  host: '31.97.255.54',
  port: 5432,
  database: 'chatwoot',
  user: 'postgres',
  password: 'd4b5507303632dbd23b1',
  ssl: false
});

async function findMessage() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco Evolution\n');

    // Primeiro, buscar a instância com o número específico
    const instanceQuery = `
      SELECT id, name FROM "Instance"
      WHERE name LIKE '%558487168184%' OR name LIKE '%5584987168184%'
      LIMIT 1;
    `;

    const instanceResult = await client.query(instanceQuery);

    if (instanceResult.rows.length === 0) {
      console.log('❌ Instância 558487168184 não encontrada!');
      console.log('\n📋 Procurando mensagens para o contato 558498973484...\n');

      // Procurar por qualquer mensagem para este contato
      const msgQuery = `
        SELECT
          m.id,
          m."instanceId",
          m.key ->> 'remoteJid' as "remoteJid",
          m."messageType",
          m.message -> 'conversation' as texto,
          m."messageTimestamp",
          to_timestamp(m."messageTimestamp") as criada_em
        FROM "Message" m
        WHERE m.key ->> 'remoteJid' LIKE '%558498973484%'
        ORDER BY m."messageTimestamp" DESC
        LIMIT 5;
      `;

      const msgResult = await client.query(msgQuery);

      if (msgResult.rows.length === 0) {
        console.log('❌ Nenhuma mensagem encontrada para este contato!');
      } else {
        console.log(`📝 Encontradas ${msgResult.rows.length} mensagens para o contato:\n`);
        msgResult.rows.forEach((msg, idx) => {
          console.log(`${idx + 1}. ID: ${msg.id}`);
          console.log(`   Instância: ${msg.instanceId}`);
          console.log(`   Contato: ${msg.remoteJid}`);
          console.log(`   Tipo: ${msg.messageType}`);
          console.log(`   Criada: ${msg.criada_em}`);
          console.log();
        });
      }
    } else {
      const instanceId = instanceResult.rows[0].id;
      console.log(`✅ Instância encontrada: ${instanceResult.rows[0].name}`);
      console.log(`   ID: ${instanceId}\n`);

      // Buscar a última mensagem para este contato
      const msgQuery = `
        SELECT
          m.id,
          m."instanceId",
          m.key ->> 'remoteJid' as "remoteJid",
          m."messageType",
          m.message -> 'conversation' as texto,
          m."messageTimestamp",
          to_timestamp(m."messageTimestamp") as criada_em,
          m.participant,
          m.status
        FROM "Message" m
        WHERE m."instanceId" = $1
          AND (m.key ->> 'remoteJid') = '558498973484@s.whatsapp.net'
        ORDER BY m."messageTimestamp" DESC
        LIMIT 1;
      `;

      const msgResult = await client.query(msgQuery, [instanceId]);

      if (msgResult.rows.length === 0) {
        console.log('❌ Nenhuma mensagem encontrada para este contato nesta instância!');
      } else {
        const msg = msgResult.rows[0];
        console.log('📝 ÚLTIMA MENSAGEM:\n');
        console.log(`ID: ${msg.id}`);
        console.log(`Instância: ${msg.instanceId}`);
        console.log(`Contato: ${msg.remoteJid}`);
        console.log(`Tipo: ${msg.messageType}`);
        console.log(`Status: ${msg.status}`);
        console.log(`Texto: ${JSON.stringify(msg.texto) || '(sem texto)'}`);
        console.log(`Timestamp: ${msg.messageTimestamp}`);
        console.log(`Criada em: ${msg.criada_em}`);
        console.log(`Participante: ${msg.participant || '(sistema)'}`);
      }
    }

    await client.end();
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
  }
}

findMessage();
