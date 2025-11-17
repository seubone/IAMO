#!/usr/bin/env npx tsx

/**
 * CORRIGIR CHATS FALTANDO - Sincroniza chats com base em mensagens
 *
 * Problema: Algumas instâncias têm mensagens mas sem registros na tabela Chat
 * Solução: Cria registros de Chat automaticamente a partir das mensagens
 */

import { evolutionPool } from "../config/evolution-db";

async function fixMissingChats() {
  console.log("🔧 Iniciando correção de chats faltando...\n");

  try {
    // 1. Encontrar instâncias com mensagens mas sem chats
    console.log("1️⃣  Procurando instâncias com mensagens mas sem chats...\n");

    const problemInstances = await evolutionPool.query(`
      SELECT DISTINCT i.id, i.name, i."ownerJid"
      FROM "Instance" i
      WHERE EXISTS (
        SELECT 1 FROM "Message" m WHERE m."instanceId" = i.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM "Chat" c WHERE c."instanceId" = i.id
      )
    `);

    if (problemInstances.rows.length === 0) {
      console.log("✅ Nenhuma instância com problema encontrada!\n");
      return;
    }

    console.log(`⚠️  Encontradas ${problemInstances.rows.length} instâncias com problema:\n`);

    // 2. Para cada instância problemática, criar chats faltando
    for (const instance of problemInstances.rows) {
      console.log(`📌 Processando: ${instance.name} (${instance.id})`);

      // Encontrar todos os remoteJid únicos nesta instância
      const uniqueChats = await evolutionPool.query(`
        SELECT DISTINCT (key->>'remoteJid') as remote_jid,
               COUNT(*) as message_count,
               MAX("messageTimestamp") as last_msg_timestamp
        FROM "Message"
        WHERE "instanceId" = $1
        GROUP BY (key->>'remoteJid')
        ORDER BY MAX("messageTimestamp") DESC
      `, [instance.id]);

      console.log(`   Encontrados ${uniqueChats.rows.length} chats únicos\n`);

      // 3. Criar registros de Chat para cada remoteJid
      for (const chat of uniqueChats.rows) {
        try {
          // Buscar o último nome e unread count para este chat
          const chatInfo = await evolutionPool.query(`
            SELECT
              COALESCE(
                (SELECT "pushName" FROM "Contact" WHERE "remoteJid" = $1 LIMIT 1),
                $1
              ) as chat_name,
              0 as unread_count
          `, [chat.remote_jid]);

          const chatName = chatInfo.rows[0].chat_name;

          // Inserir chat
          await evolutionPool.query(`
            INSERT INTO "Chat" ("id", "instanceId", "remoteJid", "name", "unreadMessages", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT DO NOTHING
          `, [
            `chat_${Date.now()}_${Math.random()}`,
            instance.id,
            chat.remote_jid,
            chatName,
            0
          ]);

          console.log(`   ✅ Chat criado: ${chat.remote_jid} (${chat.message_count} mensagens)`);
        } catch (error: any) {
          console.log(`   ❌ Erro ao criar chat: ${error.message}`);
        }
      }

      console.log();
    }

    // 4. Verificar resultados
    console.log("\n2️⃣  Verificando resultados...\n");

    const verifyResult = await evolutionPool.query(`
      SELECT i.id, i.name,
             COUNT(DISTINCT c.id) as chat_count,
             COUNT(DISTINCT m.id) as message_count
      FROM "Instance" i
      LEFT JOIN "Chat" c ON c."instanceId" = i.id
      LEFT JOIN "Message" m ON m."instanceId" = i.id
      WHERE i.id = ANY($1::text[])
      GROUP BY i.id, i.name
    `, [problemInstances.rows.map(r => r.id)]);

    console.log("📊 Resultado após correção:\n");
    for (const result of verifyResult.rows) {
      console.log(`${result.name}:`);
      console.log(`  Chats: ${result.chat_count}`);
      console.log(`  Mensagens: ${result.message_count}\n`);
    }

    console.log("✅ Correção finalizada!");

  } catch (error: any) {
    console.error("\n❌ Erro durante correção:");
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Código: ${error.code}`);
    if (error.detail) {
      console.error(`   Detalhes: ${error.detail}`);
    }
  } finally {
    await evolutionPool.end();
    process.exit(0);
  }
}

fixMissingChats();
