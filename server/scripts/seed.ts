import { dbStorage as storage } from "../config/db-storage";
import bcrypt from "bcryptjs";

export async function seedData() {
  try {
    // Check if data already exists (to avoid duplicates)
    const existingUsers = await storage.getUsers();
    if (existingUsers.length > 0) {
      console.log("✅ Dados já existem no banco, pulando seed");
      return;
    }

    console.log("🌱 Iniciando seed de dados...");

    // Create users
    const adminUser = await storage.createUser({
      name: "Admin User",
      email: "admin@simonia.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
    });

    const operatorUser = await storage.createUser({
      name: "Operador Silva",
      email: "operador@simonia.com",
      password: await bcrypt.hash("operator123", 10),
      role: "operator",
    });

    await storage.createUser({
      name: "Viewer Santos",
      email: "viewer@simonia.com",
      password: await bcrypt.hash("viewer123", 10),
      role: "viewer",
    });

    console.log("✅ Usuários criados");

    // Create sample tickets
    await storage.createTicket({
      iaId: "ia-sample-1",
      attendanceId: "ATD-12345",
      errorType: "prompt",
      severity: "high",
      message: "IA não está respondendo corretamente às objeções de preço.",
      suggestion: "Verificar se o prompt inclui instruções sobre política de descontos.",
      origin: "N8N Webhook",
      status: "new",
    });

    console.log("✅ Tickets criados");

    // Create sample action
    await storage.createAction({
      iaId: "ia-sample-1",
      userId: operatorUser.id,
      action: "IA Pausada",
      reason: "Taxa de conversão abaixo de 20% nas últimas 24h",
    });

    console.log("✅ Ações de auditoria criadas");

    // Create sample conversation
    const conversation = await storage.createConversation({
      iaId: "ia-sample-1",
      attendanceId: "ATD-12345",
      leadName: "João Silva",
      iaEnabled: 1,
      channel: "whatsapp",
      notes: "Cliente demonstrou interesse em upgrade.",
    });

    await storage.createMessage({
      conversationId: conversation.id,
      sender: "ia",
      content: "Olá! Como posso ajudar você hoje?",
    });

    console.log("✅ Conversas e mensagens criadas");

    // Create sample metric
    await storage.createMetric({
      iaId: "ia-sample-1",
      date: new Date(),
      firstResponseRate: "94.2%",
      salesConversion: "23.8%",
      quoteConversion: "42.1%",
      paymentLinkConversion: "57.1%",
      iaMessagePercentage: "87.3%",
      totalMessages: 456,
    });

    console.log("✅ Métricas criadas");

    console.log("\n🎉 Seed concluído com sucesso!");
    console.log("\n📝 Credenciais de acesso:");
    console.log("Admin: admin@simonia.com / admin123");
    console.log("Operador: operador@simonia.com / operator123");
    console.log("Visualizador: viewer@simonia.com / viewer123");
  } catch (error) {
    // Silently fail if tables don't exist - database may not be initialized
    if (error instanceof Error && error.message.includes("relation") && error.message.includes("does not exist")) {
      // This is expected when database is not fully initialized
      return;
    }

    // For other errors, log a warning but continue
    console.warn("⚠️ Seed parcialmente executado:", error instanceof Error ? error.message : error);
  }
}
