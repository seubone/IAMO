#!/usr/bin/env npx tsx

/**
 * DIAGNÓSTICO DE CONVERSAS - Identifica instâncias sem mensagens
 *
 * Este script ajuda a diagnosticar por que algumas conversas não carregam
 * Verificando:
 * 1. Conexão com banco Evolution
 * 2. Instâncias e seus ownerJid
 * 3. Quantidade de chats e mensagens por instância
 * 4. Possíveis problemas de sincronização
 */

import { evolutionPool } from "../config/evolution-db";

interface InstanceInfo {
  id: string;
  name: string;
  number: string;
  ownerJid: string;
  connectionStatus: string;
  chatCount: number;
  messageCount: number;
  lastMessageTime: string | null;
}

async function diagnoseChats() {
  console.log("🔍 Iniciando diagnóstico de conversas...\n");

  try {
    // 1. Testar conexão
    console.log("1️⃣  Testando conexão com banco Evolution...");
    const connTest = await evolutionPool.query("SELECT NOW() as time");
    console.log(`✅ Banco Evolution conectado! Hora do servidor: ${connTest.rows[0].time}\n`);

    // 2. Listar todas as instâncias
    console.log("2️⃣  Buscando todas as instâncias...");
    const instancesResult = await evolutionPool.query(`
      SELECT
        id,
        name,
        number,
        "ownerJid",
        "connectionStatus",
        "createdAt"
      FROM "Instance"
      ORDER BY "createdAt" DESC
    `);

    const instances = instancesResult.rows;
    console.log(`📱 Total de instâncias: ${instances.length}\n`);

    if (instances.length === 0) {
      console.log("⚠️  Nenhuma instância encontrada no banco!");
      return;
    }

    // 3. Para cada instância, buscar chats e mensagens
    console.log("3️⃣  Analisando cada instância...\n");
    console.log("═".repeat(100));

    const instancesInfo: InstanceInfo[] = [];

    for (const instance of instances) {
      console.log(`\n📌 Instância: ${instance.name}`);
      console.log(`   ID: ${instance.id}`);
      console.log(`   Número: ${instance.number}`);
      console.log(`   ownerJid: ${instance.ownerJid}`);
      console.log(`   Status: ${instance.connectionStatus}`);

      // Buscar chats desta instância
      const chatsResult = await evolutionPool.query(`
        SELECT COUNT(*) as count FROM "Chat"
        WHERE "instanceId" = $1
      `, [instance.id]);

      const chatCount = parseInt(chatsResult.rows[0].count);
      console.log(`   Chats: ${chatCount}`);

      // Buscar mensagens desta instância
      const messagesResult = await evolutionPool.query(`
        SELECT
          COUNT(*) as total,
          MAX("messageTimestamp") as last_msg_time
        FROM "Message"
        WHERE "instanceId" = $1
      `, [instance.id]);

      const messageCount = parseInt(messagesResult.rows[0].total);
      const lastMessageTime = messagesResult.rows[0].last_msg_time
        ? new Date(messagesResult.rows[0].last_msg_time * 1000).toLocaleString('pt-BR')
        : null;

      console.log(`   Mensagens: ${messageCount}`);
      if (lastMessageTime) {
        console.log(`   Última mensagem: ${lastMessageTime}`);
      }

      // Se não tem mensagens, mostrar aviso
      if (messageCount === 0) {
        console.log(`   ⚠️  ATENÇÃO: Esta instância não tem mensagens!`);
      }

      if (chatCount === 0) {
        console.log(`   ⚠️  ATENÇÃO: Esta instância não tem chats sincronizados!`);
      }

      instancesInfo.push({
        id: instance.id,
        name: instance.name,
        number: instance.number,
        ownerJid: instance.ownerJid,
        connectionStatus: instance.connectionStatus,
        chatCount,
        messageCount,
        lastMessageTime
      });
    }

    // 4. Verificar instâncias com mesmo ownerJid (cross-sync)
    console.log("\n" + "═".repeat(100));
    console.log("\n4️⃣  Verificando sincronização cross-instância (mesmo ownerJid)...\n");

    const uniqueOwnerJids = [...new Set(instances.map(i => i.ownerJid))];

    for (const ownerJid of uniqueOwnerJids) {
      const relatedInstances = instances.filter(i => i.ownerJid === ownerJid);

      if (relatedInstances.length > 1) {
        console.log(`🔗 ownerJid: ${ownerJid}`);
        console.log(`   Instâncias: ${relatedInstances.length}`);
        relatedInstances.forEach(i => {
          const info = instancesInfo.find(ii => ii.id === i.id);
          console.log(`   - ${i.name} (${i.number}): ${info?.messageCount} mensagens`);
        });
        console.log();
      }
    }

    // 5. Resumo e recomendações
    console.log("═".repeat(100));
    console.log("\n📊 RESUMO:\n");

    const totalChats = instancesInfo.reduce((sum, i) => sum + i.chatCount, 0);
    const totalMessages = instancesInfo.reduce((sum, i) => sum + i.messageCount, 0);
    const emptyInstances = instancesInfo.filter(i => i.messageCount === 0);

    console.log(`✅ Total de instâncias: ${instancesInfo.length}`);
    console.log(`✅ Total de chats: ${totalChats}`);
    console.log(`✅ Total de mensagens: ${totalMessages}`);

    if (emptyInstances.length > 0) {
      console.log(`\n⚠️  INSTÂNCIAS SEM MENSAGENS: ${emptyInstances.length}`);
      emptyInstances.forEach(i => {
        console.log(`   - ${i.name} (${i.number})`);
      });
    }

    console.log("\n💡 RECOMENDAÇÕES:\n");

    if (emptyInstances.length > 0) {
      console.log("1. Instâncias sem mensagens podem estar:");
      console.log("   - Desconectadas (status !== 'open')");
      console.log("   - Sem sincronização com Evolution API");
      console.log("   - Com problema na coleta de mensagens");
      console.log("\n   Ação: Verifique o status de conexão no Evolution API");
      console.log("   Ação: Tente reconectar a instância");
    }

    if (totalMessages === 0) {
      console.log("1. Nenhuma mensagem no banco Evolution!");
      console.log("   Ação: Verifique se o Evolution API está capturando mensagens");
      console.log("   Ação: Verifique a configuração de webhooks no Evolution API");
    }

    console.log("\n2. Para forçar sincronização:");
    console.log("   - Reconecte a instância no Evolution API");
    console.log("   - Aguarde a sincronização de mensagens históricas");
    console.log("   - Verifique os logs do servidor para erros");

    console.log("\n3. Para instâncias com chats mas sem mensagens:");
    console.log("   - O chat está vazio (ninguém enviou mensagens ainda)");
    console.log("   - Ou as mensagens foram deletadas/sincronizadas parcialmente");

  } catch (error: any) {
    console.error("\n❌ Erro durante diagnóstico:");
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Código: ${error.code}`);
    if (error.detail) {
      console.error(`   Detalhes: ${error.detail}`);
    }
  } finally {
    await evolutionPool.end();
    console.log("\n✅ Diagnóstico finalizado");
    process.exit(0);
  }
}

diagnoseChats();
