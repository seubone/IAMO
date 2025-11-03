import { Client } from 'pg';

const client = new Client({
  host: '31.97.255.54',
  port: 5432,
  database: 'chatwoot',
  user: 'postgres',
  password: 'd4b5507303632dbd23b1',
  ssl: false
});

async function queryLatestMessage() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco Evolution\n');

    // Query para buscar a última mensagem enviada
    const query = `
      SELECT
        m.id,
        m."instanceId",
        m.key ->> 'remoteJid' as "remoteJid",
        m."messageType",
        m.message ->> 'conversation' as texto,
        m."messageTimestamp",
        to_timestamp(m."messageTimestamp") as criada_em,
        m.participant,
        m.status
      FROM "Message" m
      WHERE m."instanceId" = '558487168184'
        AND (m.key ->> 'remoteJid') = '558498973484@s.whatsapp.net'
        AND m.participant IS NULL
      ORDER BY m."messageTimestamp" DESC
      LIMIT 1;
    `;

    const result = await client.query(query);

    if (result.rows.length === 0) {
      console.log('❌ Nenhuma mensagem encontrada para esta instância e contato');
      console.log('\nTentando buscar todas as mensagens da instância...\n');

      const allQuery = `
        SELECT
          m.id,
          m."instanceId",
          m.key ->> 'remoteJid' as "remoteJid",
          m."messageType",
          m."messageTimestamp",
          to_timestamp(m."messageTimestamp") as criada_em
        FROM "Message" m
        WHERE m."instanceId" = '558487168184'
        ORDER BY m."messageTimestamp" DESC
        LIMIT 5;
      `;

      const allResult = await client.query(allQuery);
      console.log('📋 Últimas 5 mensagens da instância 558487168184:\n');
      allResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.remoteJid} - ${row.messageType} - ${row.criada_em}`);
      });
    } else {
      console.log('📝 Última mensagem encontrada:\n');
      const msg = result.rows[0];
      console.log(`ID: ${msg.id}`);
      console.log(`Instância: ${msg.instanceId}`);
      console.log(`Contato: ${msg.remoteJid}`);
      console.log(`Tipo: ${msg.messageType}`);
      console.log(`Status: ${msg.status}`);
      console.log(`Texto: ${msg.texto || '(sem texto)'}`);
      console.log(`Timestamp: ${msg.messageTimestamp}`);
      console.log(`Criada em: ${msg.criada_em}`);
      console.log(`Participante: ${msg.participant || '(sistema)'}`);
    }

    await client.end();
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
  }
}

queryLatestMessage();
