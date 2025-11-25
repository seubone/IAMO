/**
 * MIDDLEWARE DE AUTO-SINCRONIZAÇÃO DE CHATS
 *
 * Este middleware intercepta requisições de chats e sincroniza automaticamente
 * qualquer chat faltando na tabela Chat com base nas mensagens
 */

import { evolutionPool } from "../config/evolution-db";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware que sincroniza automaticamente chats faltando
 * Executa antes de retornar dados de chats ao cliente
 */
export async function chatSyncMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const originalSend = res.send;

  // Interceptar apenas requisições de chats
  if (!req.path.includes("/chats")) {
    return next();
  }

  // Hook para antes de enviar a resposta
  res.send = function (data: any) {
    // Se é uma resposta de sucesso com chats
    if (res.statusCode === 200 && Array.isArray(data)) {
      // Executar sincronização em background (não bloqueia resposta)
      syncMissingChatsBackground(req.params.instanceId).catch(err => {
        console.warn("⚠️  Erro ao sincronizar chats em background:", err.message);
      });
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Sincroniza chats faltando para uma instância específica
 * Executa de forma assíncrona sem bloquear a resposta HTTP
 */
async function syncMissingChatsBackground(instanceId: string) {
  if (!instanceId) return;

  try {
    // Buscar remoteJid únicos nas mensagens que não têm chat registrado
    const missingChats = await evolutionPool.query(`
      SELECT DISTINCT (m.key->>'remoteJid') as remote_jid
      FROM "Message" m
      WHERE m."instanceId" = $1
      AND NOT EXISTS (
        SELECT 1 FROM "Chat" c
        WHERE c."instanceId" = m."instanceId"
        AND c."remoteJid" = (m.key->>'remoteJid')
      )
      LIMIT 10  -- Limitar para não sobrecarregar
    `, [instanceId]);

    if (missingChats.rows.length === 0) {
      return; // Nada para sincronizar
    }

    console.log(`🔄 [ChatSync] Sincronizando ${missingChats.rows.length} chats faltando para ${instanceId}`);

    // Batch fetch contact info for all missing chats (prevent N+1 query)
    const remoteJids = missingChats.rows.map(r => r.remote_jid);
    const contactsInfo = await evolutionPool.query(`
      SELECT "remoteJid", "pushName" FROM "Contact"
      WHERE "remoteJid" = ANY($1::text[])
    `, [remoteJids]);

    const contactsByJid = new Map(
      contactsInfo.rows.map(c => [c.remoteJid, c.pushName])
    );

    // Criar os chats faltando
    for (const missing of missingChats.rows) {
      try {
        const chatName = contactsByJid.get(missing.remote_jid) || missing.remote_jid;
        const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await evolutionPool.query(`
          INSERT INTO "Chat" ("id", "instanceId", "remoteJid", "name", "unreadMessages", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT DO NOTHING
        `, [chatId, instanceId, missing.remote_jid, chatName, 0]);

        console.log(`  ✅ Chat sincronizado: ${missing.remote_jid}`);
      } catch (error: any) {
        console.warn(`  ❌ Erro ao sincronizar ${missing.remote_jid}: ${error.message}`);
      }
    }
  } catch (error: any) {
    console.warn("⚠️  Erro ao sincronizar chats:", error.message);
  }
}
