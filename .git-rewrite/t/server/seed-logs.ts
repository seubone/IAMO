import { db } from "./db";
import { systemLogs } from "@shared/schema";

/**
 * Seed logs de exemplo para testar a página de logs
 */
export async function seedLogs() {
  try {
    console.log("📝 Seeding example logs...");

    const exampleLogs = [
      {
        level: "info",
        source: "auth",
        message: "Usuário fez login com sucesso",
        details: { email: "admin@monitor.ia", ip: "192.168.1.100" },
      },
      {
        level: "info",
        source: "whatsapp",
        message: "Nova mensagem recebida da instância 5511941616098",
        details: { instanceId: "5511941616098", messageCount: 1 },
      },
      {
        level: "warning",
        source: "api",
        message: "Rate limit aproximando do limite",
        details: { endpoint: "/api/whatsapp/messages", remaining: 10 },
      },
      {
        level: "error",
        source: "database",
        message: "Falha ao conectar ao banco de dados Evolution",
        details: { error: "Connection timeout", retryAttempt: 1 },
      },
      {
        level: "debug",
        source: "webhook",
        message: "Webhook recebido do Evolution API",
        details: { payload: { instance: "test", event: "message.received" } },
      },
      {
        level: "info",
        source: "api",
        message: "Nova instância conectada",
        details: { instanceNumber: "5584936180572", status: "open" },
      },
      {
        level: "error",
        source: "whatsapp",
        message: "Erro ao descriptografar mídia",
        details: { messageId: "ABC123", error: "Invalid media key" },
      },
      {
        level: "warning",
        source: "auth",
        message: "Tentativa de login com senha incorreta",
        details: { email: "test@example.com", attempts: 3 },
      },
      {
        level: "info",
        source: "system",
        message: "Servidor iniciado com sucesso",
        details: { port: 5050, environment: "development" },
      },
      {
        level: "debug",
        source: "api",
        message: "Query de logs executada",
        details: { filters: { level: "error" }, resultCount: 5 },
      },
    ];

    for (const log of exampleLogs) {
      await db.insert(systemLogs).values({
        level: log.level,
        source: log.source,
        message: log.message,
        details: log.details,
        userId: null,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      });
    }

    console.log("✅ Example logs seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding logs:", error);
  }
}
