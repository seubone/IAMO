/**
 * Script de Diagnóstico para "mariaianova"
 * Descobre por que as mensagens não estão carregando
 */

import { evolutionPool } from "../config/evolution-db";

async function diagnose() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           DIAGNÓSTICO DE INSTÂNCIA - MARIAIANOVA                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  try {
    // 1. Procurar pela instância "mariaianova"
    console.log(`\n📱 [STEP 1] Procurando instância 'mariaianova'...`);
    const instanceResult = await evolutionPool.query(`
      SELECT
        id,
        name,
        number,
        "ownerJid",
        "connectionStatus",
        "createdAt",
        "updatedAt"
      FROM "Instance"
      WHERE name ILIKE '%mariaianova%'
        OR id ILIKE '%mariaianova%'
      ORDER BY "updatedAt" DESC
      LIMIT 5
    `);

    if (instanceResult.rows.length === 0) {
      console.error(`❌ ERRO: Nenhuma instância encontrada com nome 'mariaianova'`);
      console.log(`\n💡 SUGESTÃO: Verifique se o nome está correto`);
      return;
    }

    const instance = instanceResult.rows[0];
    console.log(`✅ Instância encontrada:`, {
      id: instance.id,
      name: instance.name,
      number: instance.number || "❌ VAZIO",
      ownerJid: instance.ownerJid,
      connectionStatus: instance.connectionStatus,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt
    });

    // 2. Verificar se há chats para esta instância
    console.log(`\n💬 [STEP 2] Procurando chats para instância '${instance.id}'...`);
    const chatsResult = await evolutionPool.query(`
      SELECT
        id,
        "remoteJid",
        name,
        "unreadMessages",
        "createdAt",
        "updatedAt"
      FROM "Chat"
      WHERE "instanceId" = $1
      LIMIT 10
    `, [instance.id]);

    if (chatsResult.rows.length === 0) {
      console.warn(`⚠️ Nenhum chat encontrado para esta instância`);
    } else {
      console.log(`✅ ${chatsResult.rows.length} chat(s) encontrado(s):`);
      chatsResult.rows.forEach((chat, idx) => {
        console.log(`   ${idx + 1}. ${chat.remoteJid} - ${chat.name || 'Sem nome'} (${chat.unreadMessages || 0} não lido)`);
      });
    }

    // 3. Verificar se há mensagens para esta instância
    console.log(`\n📨 [STEP 3] Procurando mensagens para instância '${instance.id}'...`);
    const messagesResult = await evolutionPool.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT (key->>'remoteJid')) as unique_chats,
             MAX("messageTimestamp") as last_timestamp
      FROM "Message"
      WHERE "instanceId" = $1
    `, [instance.id]);

    const msgStats = messagesResult.rows[0];
    console.log(`✅ Estatísticas de mensagens:`, {
      totalMessages: msgStats.total,
      uniqueChats: msgStats.unique_chats,
      lastMessageTime: msgStats.last_timestamp ? new Date(parseInt(msgStats.last_timestamp)).toISOString() : 'N/A'
    });

    if (msgStats.total === 0) {
      console.warn(`⚠️ Nenhuma mensagem encontrada para esta instância`);
      console.log(`\n💡 POSSÍVEIS CAUSAS:`);
      console.log(`   1. Nenhuma mensagem foi recebida/enviada ainda`);
      console.log(`   2. As mensagens foram deletadas`);
      console.log(`   3. Problema na sincronização com Evolution DB`);
    }

    // 4. Verificar Related Instances (mesma ownerJid)
    console.log(`\n🔗 [STEP 4] Procurando instâncias relacionadas (mesmo ownerJid)...`);
    const relatedResult = await evolutionPool.query(`
      SELECT id, name, "ownerJid"
      FROM "Instance"
      WHERE "ownerJid" = $1
      ORDER BY "createdAt" DESC
    `, [instance.ownerJid]);

    console.log(`✅ ${relatedResult.rows.length} instância(s) com ownerJid '${instance.ownerJid}':`);
    relatedResult.rows.forEach((rel, idx) => {
      console.log(`   ${idx + 1}. ${rel.name} (${rel.id})`);
    });

    // 5. Testar query que o endpoint usa
    console.log(`\n⚙️ [STEP 5] Testando query de chats (como o endpoint faz)...`);
    const testChatsQuery = await evolutionPool.query(`
      WITH LastMessages AS (
        SELECT DISTINCT ON ((key->>'remoteJid'))
          (key->>'remoteJid') as remote_jid,
          "messageTimestamp" as last_msg_timestamp
        FROM "Message"
        WHERE "instanceId" = ANY($1::text[])
        ORDER BY (key->>'remoteJid') ASC, "messageTimestamp" DESC
      )
      SELECT COUNT(*) as total_chats
      FROM "Chat" c
      WHERE c."instanceId" = ANY($1::text[])
    `, [relatedResult.rows.map(r => r.id)]);

    console.log(`✅ Query de chats retornou:`, {
      totalChats: testChatsQuery.rows[0].total_chats
    });

    // 6. Resumo final
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                      RESUMO DO DIAGNÓSTICO                      ║
╚════════════════════════════════════════════════════════════════╝
    `);

    const hasChats = chatsResult.rows.length > 0;
    const hasMessages = msgStats.total > 0;
    const hasNumber = !!instance.number;

    console.log(`Instância: ${instance.name}`);
    console.log(`ID: ${instance.id}`);
    console.log(`Número: ${hasNumber ? instance.number : '❌ VAZIO'}`);
    console.log(`OwnerJid: ${instance.ownerJid}`);
    console.log(`Status: ${instance.connectionStatus}`);
    console.log(``);
    console.log(`Chats: ${hasChats ? `✅ ${chatsResult.rows.length} encontrado(s)` : '❌ NENHUM'}`);
    console.log(`Mensagens: ${hasMessages ? `✅ ${msgStats.total} encontrada(s)` : '❌ NENHUMA'}`);
    console.log(``);

    if (!hasChats && !hasMessages) {
      console.log(`❌ PROBLEMA IDENTIFICADO:`);
      console.log(`   - Instância existe, mas não tem chats nem mensagens`);
      console.log(`\n💡 POSSÍVEIS SOLUÇÕES:`);
      console.log(`   1. Reconectar a instância WhatsApp`);
      console.log(`   2. Verificar logs da Evolution API`);
      console.log(`   3. Validar credenciais do WhatsApp`);
    } else if (!hasMessages) {
      console.log(`⚠️ AVISO:`);
      console.log(`   - Instância tem chats, mas nenhuma mensagem`);
      console.log(`\n💡 AÇÃO: Aguarde ou force sincronização com Evolution API`);
    } else {
      console.log(`✅ TUDO OK:`);
      console.log(`   - Instância, chats e mensagens carregando normalmente`);
      console.log(`\n💡 Se não está aparecendo no frontend, problema é:`);
      console.log(`   - Query parameters incorretos (instanceId ou remoteJid)`);
      console.log(`   - Cache do navegador`);
      console.log(`   - WebSocket não conectado`);
    }

  } catch (error: any) {
    console.error(`\n❌ ERRO ao conectar no banco:`, {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    console.log(`\n⚠️ Certifique-se que:`);
    console.log(`   1. Evolution DB está rodando`);
    console.log(`   2. Credenciais em .env estão corretas`);
    console.log(`   3. Banco 'evolution' existe`);
  }

  process.exit(0);
}

diagnose();
