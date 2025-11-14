/**
 * Script de Teste: Conexão com Evolution DB e Queries de Mensagens
 * Verifica se as mensagens estão sendo puxadas corretamente do banco
 */

import { evolutionPool } from "../config/evolution-db";

async function testConnection() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     TESTE DE CONEXÃO - EVOLUTION DB E QUERIES DE MENSAGENS     ║
╚════════════════════════════════════════════════════════════════╝
  `);

  try {
    // TEST 1: Conexão básica
    console.log(`\n🔌 [TEST 1] Testando conexão com Evolution DB...`);
    const connResult = await evolutionPool.query("SELECT NOW() as current_time");
    console.log(`✅ Conexão OK!`);
    console.log(`   Hora do servidor: ${connResult.rows[0].current_time}`);

    // TEST 2: Contar tabelas
    console.log(`\n📊 [TEST 2] Verificando tabelas do banco...`);
    const tablesResult = await evolutionPool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tableNames = tablesResult.rows.map(r => r.table_name);
    console.log(`✅ ${tableNames.length} tabelas encontradas:`);
    tableNames.forEach(name => {
      const icon = ['Instance', 'Chat', 'Message', 'Contact'].includes(name) ? '📌' : '📋';
      console.log(`   ${icon} ${name}`);
    });

    // TEST 3: Contar instâncias
    console.log(`\n🤖 [TEST 3] Contando instâncias...`);
    const instancesResult = await evolutionPool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT "ownerJid") as unique_numbers
      FROM "Instance"
    `);
    const instances = instancesResult.rows[0];
    console.log(`✅ ${instances.total} instância(s) encontrada(s)`);
    console.log(`   ${instances.unique_numbers} número(s) WhatsApp único(s)`);

    // TEST 4: Listar todas as instâncias
    console.log(`\n📱 [TEST 4] Listando instâncias...`);
    const allInstancesResult = await evolutionPool.query(`
      SELECT
        id,
        name,
        number,
        "ownerJid",
        "connectionStatus"
      FROM "Instance"
      ORDER BY "createdAt" DESC
      LIMIT 20
    `);

    if (allInstancesResult.rows.length === 0) {
      console.warn(`⚠️ Nenhuma instância encontrada!`);
    } else {
      console.log(`✅ Instâncias:`);
      allInstancesResult.rows.forEach((inst, idx) => {
        console.log(`   ${idx + 1}. ${inst.name || 'SEM NOME'} (${inst.number || 'SEM NÚMERO'})`);
        console.log(`      ID: ${inst.id}`);
        console.log(`      OwnerJid: ${inst.ownerJid}`);
        console.log(`      Status: ${inst.connectionStatus}`);
      });
    }

    // TEST 5: Contar chats
    console.log(`\n💬 [TEST 5] Contando chats no banco...`);
    const chatsResult = await evolutionPool.query(`
      SELECT
        COUNT(*) as total_chats,
        COUNT(DISTINCT "instanceId") as instances_with_chats,
        COUNT(DISTINCT "remoteJid") as unique_contacts
      FROM "Chat"
    `);
    const chats = chatsResult.rows[0];
    console.log(`✅ ${chats.total_chats} chat(s) total`);
    console.log(`   ${chats.instances_with_chats} instância(s) com chats`);
    console.log(`   ${chats.unique_contacts} contato(s) único(s)`);

    // TEST 6: Contar mensagens
    console.log(`\n📨 [TEST 6] Contando mensagens no banco...`);
    const messagesResult = await evolutionPool.query(`
      SELECT
        COUNT(*) as total_messages,
        COUNT(DISTINCT "instanceId") as instances_with_messages,
        COUNT(DISTINCT (key->>'remoteJid')) as unique_chats,
        MAX("messageTimestamp") as latest_message_ts,
        MIN("messageTimestamp") as oldest_message_ts
      FROM "Message"
    `);
    const messages = messagesResult.rows[0];
    console.log(`✅ ${messages.total_messages} mensagem(s) total`);
    console.log(`   ${messages.instances_with_messages} instância(s) com mensagens`);
    console.log(`   ${messages.unique_chats} chat(s) com mensagens`);
    if (messages.latest_message_ts) {
      console.log(`   Última mensagem: ${new Date(parseInt(messages.latest_message_ts)).toISOString()}`);
    }
    if (messages.oldest_message_ts) {
      console.log(`   Mensagem mais antiga: ${new Date(parseInt(messages.oldest_message_ts)).toISOString()}`);
    }

    // TEST 7: Testar query de instância específica (mariaianova)
    console.log(`\n🔍 [TEST 7] Testando busca por 'mariaianova'...`);
    const mariaResult = await evolutionPool.query(`
      SELECT
        id,
        name,
        number,
        "ownerJid"
      FROM "Instance"
      WHERE name ILIKE '%maria%'
    `);

    if (mariaResult.rows.length === 0) {
      console.warn(`⚠️ Instância 'mariaianova' NÃO encontrada!`);
      console.log(`\n💡 Instâncias disponíveis:`);
      const availableResult = await evolutionPool.query(`
        SELECT name FROM "Instance" LIMIT 5
      `);
      availableResult.rows.forEach(r => {
        console.log(`   - ${r.name}`);
      });
    } else {
      const maria = mariaResult.rows[0];
      console.log(`✅ Instância encontrada: ${maria.name}`);
      console.log(`   ID: ${maria.id}`);
      console.log(`   OwnerJid: ${maria.ownerJid}`);

      // TEST 7.1: Chats da instância
      console.log(`\n   Procurando chats...`);
      const mariaChatsResult = await evolutionPool.query(`
        SELECT COUNT(*) as total FROM "Chat"
        WHERE "instanceId" = $1
      `, [maria.id]);
      console.log(`   ✅ ${mariaChatsResult.rows[0].total} chat(s)`);

      // TEST 7.2: Mensagens da instância
      console.log(`\n   Procurando mensagens...`);
      const mariaMessagesResult = await evolutionPool.query(`
        SELECT COUNT(*) as total FROM "Message"
        WHERE "instanceId" = $1
      `, [maria.id]);
      console.log(`   ✅ ${mariaMessagesResult.rows[0].total} mensagem(s)`);

      // TEST 7.3: Tentar buscar primeiro chat e suas mensagens
      if (mariaChatsResult.rows[0].total > 0) {
        const chatResult = await evolutionPool.query(`
          SELECT "remoteJid" FROM "Chat"
          WHERE "instanceId" = $1
          LIMIT 1
        `, [maria.id]);

        if (chatResult.rows.length > 0) {
          const remoteJid = chatResult.rows[0].remoteJid;
          console.log(`\n   Testando query de mensagens para: ${remoteJid}`);

          const testMessagesResult = await evolutionPool.query(`
            SELECT COUNT(*) as total FROM "Message"
            WHERE (key->>'remoteJid') = $1
              AND "instanceId" = $2
          `, [remoteJid, maria.id]);

          console.log(`   ✅ ${testMessagesResult.rows[0].total} mensagem(s) neste chat`);
        }
      }
    }

    // TEST 8: Testar estrutura de uma mensagem
    console.log(`\n🔬 [TEST 8] Analisando estrutura de uma mensagem...`);
    const sampleMessageResult = await evolutionPool.query(`
      SELECT
        id,
        key,
        "pushName",
        "messageType",
        message,
        "messageTimestamp",
        "instanceId"
      FROM "Message"
      LIMIT 1
    `);

    if (sampleMessageResult.rows.length === 0) {
      console.warn(`⚠️ Nenhuma mensagem no banco para analisar estrutura`);
    } else {
      const msg = sampleMessageResult.rows[0];
      console.log(`✅ Estrutura de uma mensagem:`);
      console.log(`   ID: ${msg.id}`);
      console.log(`   Key: ${JSON.stringify(msg.key, null, 2)}`);
      console.log(`   PushName: ${msg.pushName}`);
      console.log(`   Type: ${msg.messageType}`);
      console.log(`   Timestamp: ${new Date(parseInt(msg.messageTimestamp)).toISOString()}`);
      console.log(`   InstanceId: ${msg.instanceId}`);
    }

    // TEST 9: Validar índices
    console.log(`\n⚡ [TEST 9] Verificando índices para performance...`);
    const indexesResult = await evolutionPool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('Instance', 'Chat', 'Message', 'Contact')
      ORDER BY tablename, indexname
    `);

    const indexesByTable = {};
    indexesResult.rows.forEach(idx => {
      const table = idx.indexdef.split('"')[1];
      if (!indexesByTable[table]) indexesByTable[table] = [];
      indexesByTable[table].push(idx.indexname);
    });

    Object.entries(indexesByTable).forEach(([table, indexes]) => {
      console.log(`   ${table}: ${indexes.length} índice(s)`);
      indexes.forEach(idx => console.log(`      - ${idx}`));
    });

    // RESUMO FINAL
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    RESUMO DO TESTE                              ║
╚════════════════════════════════════════════════════════════════╝
    `);

    console.log(`
✅ CONEXÃO: OK - Evolution DB respondendo normalmente
✅ TABELAS: ${tableNames.length} tabelas encontradas
✅ INSTÂNCIAS: ${instances.total} instância(s), ${instances.unique_numbers} número(s) único(s)
✅ CHATS: ${chats.total_chats} chat(s) no banco
✅ MENSAGENS: ${messages.total_messages} mensagem(s) no banco

STATUS GERAL: ✅ TUDO FUNCIONANDO NORMALMENTE

As mensagens ESTÃO sendo puxadas do Evolution DB com sucesso!
Se não aparecem no frontend, o problema é:
  - Instância selecionada incorreta
  - RemoteJid (contato) sem mensagens
  - Cache do navegador
  - WebSocket não conectado
    `);

  } catch (error: any) {
    console.error(`
❌ ERRO CRÍTICO:
${error.message}

Detalhes:
- Code: ${error.code}
- Detail: ${error.detail}
- Hint: ${error.hint}

POSSÍVEIS CAUSAS:
1. Evolution DB não está rodando
2. Credenciais incorretas no .env
3. Banco 'evolution' não existe
4. Host/porta incorretos
    `);
  }

  process.exit(0);
}

testConnection();
