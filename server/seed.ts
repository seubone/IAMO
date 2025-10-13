import { storage } from "./storage";
import bcrypt from "bcryptjs";

export async function seedData() {
  console.log("🌱 Iniciando seed de dados...");

  // Create users
  const adminUser = await storage.createUser({
    name: "Admin User",
    email: "admin@monitor.ia",
    password: await bcrypt.hash("admin123", 10),
    role: "admin",
  });

  const operatorUser = await storage.createUser({
    name: "Operador Silva",
    email: "operador@monitor.ia",
    password: await bcrypt.hash("operator123", 10),
    role: "operator",
  });

  const viewerUser = await storage.createUser({
    name: "Viewer Santos",
    email: "viewer@monitor.ia",
    password: await bcrypt.hash("viewer123", 10),
    role: "viewer",
  });

  console.log("✅ Usuários criados");

  // Create IAs
  const ia1 = await storage.createIA({
    name: "IA Vendas WhatsApp",
    status: "active",
    tags: ["vendas", "whatsapp"],
  });

  const ia2 = await storage.createIA({
    name: "IA Suporte Email",
    status: "paused",
    tags: ["suporte", "email"],
  });

  const ia3 = await storage.createIA({
    name: "IA Marketing",
    status: "active",
    tags: ["marketing", "automação"],
  });

  const ia4 = await storage.createIA({
    name: "IA Cobrança",
    status: "inactive",
    tags: ["cobrança", "financeiro"],
  });

  const ia5 = await storage.createIA({
    name: "IA Onboarding",
    status: "active",
    tags: ["onboarding", "novos-clientes"],
  });

  console.log("✅ IAs criadas");

  // Create tickets
  await storage.createTicket({
    iaId: ia1.id,
    attendanceId: "ATD-12345",
    errorType: "prompt",
    severity: "high",
    message: "IA não está respondendo corretamente às objeções de preço. Cliente mencionou 'muito caro' e a IA não ofereceu desconto configurado.",
    suggestion: "Verificar se o prompt inclui instruções sobre política de descontos para objeções de preço.",
    origin: "N8N Webhook",
    status: "new",
  });

  await storage.createTicket({
    iaId: ia2.id,
    attendanceId: "ATD-12346",
    errorType: "automation",
    severity: "critical",
    message: "Falha ao enviar email automático de confirmação de pedido.",
    suggestion: "Verificar configuração do servidor SMTP no N8N.",
    origin: "N8N Webhook",
    status: "in_progress",
  });

  await storage.createTicket({
    iaId: ia3.id,
    attendanceId: "ATD-12347",
    errorType: "negotiation",
    severity: "medium",
    message: "Cliente não recebeu proposta de upgrade solicitada.",
    origin: "N8N Webhook",
    status: "new",
  });

  await storage.createTicket({
    iaId: ia1.id,
    attendanceId: "ATD-12348",
    errorType: "automation",
    severity: "low",
    message: "Atraso no envio de mensagens agendadas.",
    suggestion: "Revisar configuração de timezone no N8N.",
    origin: "N8N Webhook",
    status: "resolved",
  });

  console.log("✅ Tickets criados");

  // Create actions (audit log)
  await storage.createAction({
    iaId: ia2.id,
    userId: operatorUser.id,
    action: "IA Pausada",
    reason: "Taxa de conversão abaixo de 20% nas últimas 24h",
  });

  await storage.createAction({
    iaId: ia1.id,
    userId: adminUser.id,
    action: "IA Ativada",
    reason: "Prompt atualizado com novas objeções de preço",
  });

  await storage.createAction({
    iaId: ia4.id,
    userId: adminUser.id,
    action: "IA Inativada",
    reason: "Campanha de cobrança finalizada, IA não será mais utilizada",
  });

  console.log("✅ Ações de auditoria criadas");

  // Create conversation
  const conversation = await storage.createConversation({
    iaId: ia1.id,
    attendanceId: "ATD-12345",
    leadName: "João Silva",
    iaEnabled: 1,
    notes: "Cliente demonstrou interesse em upgrade, agendar follow-up.",
  });

  // Create messages
  await storage.createMessage({
    conversationId: conversation.id,
    sender: "ia",
    content: "Olá! Como posso ajudar você hoje?",
  });

  await storage.createMessage({
    conversationId: conversation.id,
    sender: "user",
    content: "Quero saber mais sobre o produto premium",
    tags: ["engaged"],
  });

  await storage.createMessage({
    conversationId: conversation.id,
    sender: "ia",
    content: "Claro! Nosso plano premium oferece recursos exclusivos...",
  });

  await storage.createMessage({
    conversationId: conversation.id,
    sender: "user",
    content: "Quanto custa?",
  });

  await storage.createMessage({
    conversationId: conversation.id,
    sender: "ia",
    content: "O investimento é R$ 297/mês. Aqui está o link para pagamento: link.com/pagar",
    tags: ["payment_link"],
  });

  console.log("✅ Conversas e mensagens criadas");

  // Create metrics
  await storage.createMetric({
    iaId: ia1.id,
    date: new Date(),
    firstResponseRate: "94.2%",
    salesConversion: "23.8%",
    quoteConversion: "42.1%",
    paymentLinkConversion: "57.1%",
    iaMessagePercentage: "87.3%",
    totalMessages: 456,
  });

  await storage.createMetric({
    iaId: ia2.id,
    date: new Date(),
    firstResponseRate: "89.5%",
    salesConversion: "18.7%",
    quoteConversion: "35.2%",
    paymentLinkConversion: "48.3%",
    iaMessagePercentage: "82.1%",
    totalMessages: 892,
  });

  console.log("✅ Métricas criadas");

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("\n📝 Credenciais de acesso:");
  console.log("Admin: admin@monitor.ia / admin123");
  console.log("Operador: operador@monitor.ia / operator123");
  console.log("Visualizador: viewer@monitor.ia / viewer123");
}
