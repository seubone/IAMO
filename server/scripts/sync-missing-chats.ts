#!/usr/bin/env npx tsx

/**
 * SINCRONIZAÇÃO AUTOMÁTICA DE CHATS
 *
 * Este script sincroniza automaticamente chats faltando da tabela Message
 * Pode ser executado periodicamente (cron job) para manter os chats sempre em sync
 *
 * Uso: npx tsx server/scripts/sync-missing-chats.ts
 */

import { evolutionPool } from "../config/evolution-db";

async function syncMissingChats() {
  console.log("🔄 Iniciando sincronização de chats faltando...\n");

  let fixedCount = 0;

  try {
    // 1. Encontrar remoteJid únicos nas mensagens que não têm chat registrado
    console.log("1️⃣  Procurando chats que faltam na tabela Chat...\n");

    const missingChats = await evolutionPool.query(`
      SELECT DISTINCT
        m."instanceId",
        (m.key->>'remoteJid') as remote_jid,
        COUNT(*) as message_count,
        MAX(m."messageTimestamp") as last_msg_timestamp
      FROM "Message" m
      WHERE NOT EXISTS (
        SELECT 1 FROM "Chat" c
        WHERE c."instanceId" = m."instanceId"
        AND c."remoteJid" = (m.key->>'remoteJid')
      )
      GROUP BY m."instanceId", (m.key->>'remoteJid')
      ORDER BY MAX(m."messageTimestamp") DESC
    `);

    if (missingChats.rows.length === 0) {
      console.log("✅ Nenhum chat faltando encontrado!\n");
      return;
    }

    console.log(`⚠️  Encontrados ${missingChats.rows.length} chats faltando:\n`);

    // 2. Criar os chats faltando
    for (const missing of missingChats.rows) {
      try {
        // Buscar informações do contato
        const contactInfo = await evolutionPool.query(`
          SELECT "pushName" FROM "Contact"
          WHERE "remoteJid" = $1
          LIMIT 1
        `, [missing.remote_jid]);

        const chatName = contactInfo.rows[0]?.pushName || missing.remote_jid;

        // Inserir chat
        const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await evolutionPool.query(`
          INSERT INTO "Chat" ("id", "instanceId", "remoteJid", "name", "unreadMessages", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT DO NOTHING
        `, [
          chatId,
          missing.instanceId,
          missing.remote_jid,
          chatName,
          0
        ]);

        console.log(`✅ Chat sincronizado: ${missing.remote_jid} (${missing.message_count} msgs)`);
        fixedCount++;

      } catch (error: any) {
        console.log(`❌ Erro ao sincronizar: ${missing.remote_jid} - ${error.message}`);
      }
    }

    console.log(`\n✅ Sincronização concluída! ${fixedCount} chats criados.\n`);

  } catch (error: any) {
    console.error("❌ Erro durante sincronização:");
    console.error(`   ${error.message}`);
  } finally {
    await evolutionPool.end();
    process.exit(fixedCount > 0 ? 0 : 1);
  }
}

// Executar
syncMissingChats();
