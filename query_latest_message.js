const { Client } = require('pg');

const client = new Client({
  host: '31.97.255.54',
  port: 5432,
  database: 'chatwoot',
  user: 'postgres',
  password: 'd4b5507303632dbd23b1',
  ssl: false
});

client.connect().then(() => {
  console.log('✅ Conectado ao banco Evolution');
  
  // Query para buscar a última mensagem enviada
  const query = `
    SELECT 
      id,
      instance_number,
      remote_jid,
      message_text,
      message_type,
      created_at,
      updated_at
    FROM messages
    WHERE instance_number = '558487168184'
      AND remote_jid = '558498973484@s.whatsapp.net'
      AND message_direction = 'sent'
    ORDER BY created_at DESC
    LIMIT 1;
  `;
  
  client.query(query, (err, result) => {
    if (err) {
      console.error('❌ Erro na query:', err);
    } else {
      console.log('\n📝 Última mensagem encontrada:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    client.end();
  });
}).catch(err => {
  console.error('❌ Erro ao conectar:', err);
});
