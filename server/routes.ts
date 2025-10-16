import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { dbStorage as storage } from "./db-storage";
import { authMiddleware, generateToken, type AuthRequest } from "./middleware/auth";
import { requirePermission, requireRole } from "./middleware/rbac";
import bcrypt from "bcryptjs";
import { insertUserSchema, insertIASchema, insertTicketSchema, insertActionSchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Limite de requisições excedido",
});

// WebSocket clients
const wsClients = new Set<WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket setup with authentication
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws"
  });

  wss.on("connection", (ws, req) => {
    // Extract token from query string or header
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token") || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      console.log("WebSocket connection rejected: No token provided");
      ws.close(1008, "Authentication required");
      return;
    }

    try {
      // Verify JWT token
      const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";
      const decoded = require("jsonwebtoken").verify(token, JWT_SECRET);
      
      console.log(`WebSocket client connected: ${decoded.email}`);
      wsClients.add(ws);

      ws.on("close", () => {
        console.log("WebSocket client disconnected");
        wsClients.delete(ws);
      });
    } catch (error) {
      console.log("WebSocket connection rejected: Invalid token");
      ws.close(1008, "Invalid token");
    }
  });

  // Helper to broadcast to all connected clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    wsClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // ============ AUTH ROUTES ============
  
  // Register
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      const token = generateToken(user);
      
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Login
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const token = generateToken(user);
      
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get current user
  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferences: user.preferences,
      avatar: user.avatar,
      personalIntegrations: user.personalIntegrations,
    });
  });

  // Update user profile
  app.patch("/api/auth/profile", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { name, avatar, preferences, personalIntegrations } = req.body;
      
      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Nome inválido" });
      }

      const user = await storage.updateUser(req.user!.id, {
        name,
        avatar,
        preferences,
        personalIntegrations,
      });

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        preferences: user.preferences,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update password
  app.patch("/api/auth/password", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Campos obrigatórios faltando" });
      }

      if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
        return res.status(400).json({ error: "Senhas inválidas" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres" });
      }
      
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Senha atual incorreta" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updateUser(req.user!.id, { password: hashedPassword });

      if (!updated) {
        return res.status(500).json({ error: "Erro ao atualizar senha" });
      }

      res.json({ message: "Senha atualizada com sucesso" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ IA ROUTES ============
  
  // Get all IAs
  app.get("/api/ias", authMiddleware, requirePermission("ias:read"), async (req, res) => {
    const ias = await storage.getAllIAs();
    res.json(ias);
  });

  // Get single IA
  app.get("/api/ias/:id", authMiddleware, requirePermission("ias:read"), async (req, res) => {
    const ia = await storage.getIA(req.params.id);
    if (!ia) {
      return res.status(404).json({ error: "IA não encontrada" });
    }
    res.json(ia);
  });

  // Create IA
  app.post("/api/ias", authMiddleware, requireRole("admin"), async (req, res) => {
    try {
      const data = insertIASchema.parse(req.body);
      const ia = await storage.createIA(data);
      
      broadcast({ type: "ia_created", data: ia });
      res.status(201).json(ia);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update IA status
  app.patch("/api/ias/:id", authMiddleware, requirePermission("ias:update"), async (req: AuthRequest, res) => {
    try {
      const { status, reason } = req.body;
      
      const ia = await storage.updateIA(req.params.id, { status });
      if (!ia) {
        return res.status(404).json({ error: "IA não encontrada" });
      }

      // Create audit action
      let actionName = "";
      if (status === "active") actionName = "IA Ativada";
      else if (status === "paused") actionName = "IA Pausada";
      else if (status === "inactive") actionName = "IA Inativada";

      if (actionName && reason) {
        await storage.createAction({
          iaId: ia.id,
          userId: req.user!.id,
          action: actionName,
          reason,
        });
      }

      broadcast({ type: "ia_updated", data: ia });
      res.json(ia);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete IA
  app.delete("/api/ias/:id", authMiddleware, requireRole("admin"), async (req, res) => {
    try {
      const deleted = await storage.deleteIA(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "IA não encontrada" });
      }
      
      broadcast({ type: "ia_deleted", data: { id: req.params.id } });
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ TICKET ROUTES ============
  
  // Get all tickets
  app.get("/api/tickets", authMiddleware, requirePermission("tickets:read"), async (req, res) => {
    const tickets = await storage.getAllTickets();
    res.json(tickets);
  });

  // Get tickets by IA
  app.get("/api/tickets/ia/:iaId", authMiddleware, requirePermission("tickets:read"), async (req, res) => {
    const tickets = await storage.getTicketsByIA(req.params.iaId);
    res.json(tickets);
  });

  // Create ticket
  app.post("/api/tickets", authMiddleware, requirePermission("tickets:create"), async (req, res) => {
    try {
      const data = insertTicketSchema.parse(req.body);
      const ticket = await storage.createTicket(data);
      
      broadcast({ type: "ticket_created", data: ticket });
      res.status(201).json(ticket);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update ticket status
  app.patch("/api/tickets/:id", authMiddleware, requirePermission("tickets:update"), async (req, res) => {
    try {
      const ticket = await storage.updateTicket(req.params.id, req.body);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket não encontrado" });
      }

      broadcast({ type: "ticket_updated", data: ticket });
      res.json(ticket);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ ACTIONS (AUDIT) ROUTES ============
  
  // Get all actions
  app.get("/api/actions", authMiddleware, requirePermission("actions:read"), async (req, res) => {
    const actions = await storage.getAllActions();
    res.json(actions);
  });

  // Get actions by IA
  app.get("/api/actions/ia/:iaId", authMiddleware, requirePermission("actions:read"), async (req, res) => {
    const actions = await storage.getActionsByIA(req.params.iaId);
    res.json(actions);
  });

  // ============ CONVERSATION ROUTES ============
  
  // Get all conversations
  app.get("/api/conversations", authMiddleware, requirePermission("conversations:read"), async (req, res) => {
    const conversations = await storage.getAllConversations();
    res.json(conversations);
  });

  // Get conversation by attendance ID
  app.get("/api/conversations/attendance/:attendanceId", authMiddleware, requirePermission("conversations:read"), async (req, res) => {
    const conversation = await storage.getConversationByAttendanceId(req.params.attendanceId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }
    res.json(conversation);
  });

  // Create conversation
  app.post("/api/conversations", authMiddleware, requirePermission("conversations:update"), async (req, res) => {
    try {
      const data = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(data);
      res.status(201).json(conversation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update conversation
  app.patch("/api/conversations/:id", authMiddleware, requirePermission("conversations:update"), async (req, res) => {
    try {
      const conversation = await storage.updateConversation(req.params.id, req.body);
      if (!conversation) {
        return res.status(404).json({ error: "Conversa não encontrada" });
      }
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ MESSAGE ROUTES ============
  
  // Get messages by conversation
  app.get("/api/messages/conversation/:conversationId", authMiddleware, requirePermission("messages:read"), async (req, res) => {
    const messages = await storage.getMessagesByConversation(req.params.conversationId);
    res.json(messages);
  });

  // Create message
  app.post("/api/messages", authMiddleware, requirePermission("messages:create"), async (req, res) => {
    try {
      const data = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(data);
      
      broadcast({ type: "message_created", data: message });
      res.status(201).json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ METRICS ROUTES ============
  
  // Get metrics by IA
  app.get("/api/metrics/ia/:iaId", authMiddleware, requirePermission("metrics:read"), async (req, res) => {
    const metrics = await storage.getMetricsByIA(req.params.iaId);
    res.json(metrics);
  });

  // ============ WEBHOOKS ============
  
  // N8N Webhook for error logging
  app.post("/webhooks/n8n/log", webhookLimiter, async (req, res) => {
    try {
      const { iaId, attendanceId, errorType, severity, message, suggestion, origin } = req.body;
      
      // Validate required fields
      if (!iaId || !attendanceId || !errorType || !severity || !message || !origin) {
        return res.status(400).json({ error: "Campos obrigatórios faltando" });
      }

      // Create ticket
      const ticket = await storage.createTicket({
        iaId,
        attendanceId,
        errorType,
        severity,
        message,
        suggestion,
        origin,
      });

      // Broadcast to connected clients
      broadcast({ type: "ticket_created", data: ticket });

      res.status(201).json({ success: true, ticket });
    } catch (error: any) {
      console.error("N8N Webhook error:", error);
      res.status(500).json({ error: "Erro ao processar webhook" });
    }
  });

  // Evolution API Webhook for WhatsApp messages
  app.post("/webhooks/evolution/message", webhookLimiter, async (req, res) => {
    try {
      console.log("📱 Webhook Evolution - Nova mensagem recebida:", JSON.stringify(req.body, null, 2));
      
      const { event, instance, data } = req.body;
      
      // Eventos possíveis: messages.upsert, messages.update, etc
      if (event === "messages.upsert" || event === "messages.update") {
        const messageData = data || req.body;
        
        // Broadcast para todos os clientes conectados
        broadcast({ 
          type: "whatsapp_message_received", 
          data: {
            instance: instance || messageData.instance,
            remoteJid: messageData.key?.remoteJid || messageData.remoteJid,
            messageId: messageData.key?.id || messageData.id,
            fromMe: messageData.key?.fromMe || messageData.fromMe,
            message: messageData.message,
            pushName: messageData.pushName,
            timestamp: messageData.messageTimestamp || Date.now(),
          }
        });
        
        console.log("✅ Evento WebSocket emitido: whatsapp_message_received");
      }
      
      res.status(200).json({ success: true, message: "Webhook processado" });
    } catch (error: any) {
      console.error("Evolution Webhook error:", error);
      res.status(500).json({ error: "Erro ao processar webhook" });
    }
  });

  // ============ WHATSAPP/EVOLUTION ROUTES ============
  
  // Get all instances (números/contas do WhatsApp)
  app.get("/api/whatsapp/instances", authMiddleware, async (req, res) => {
    try {
      const { evolutionPool } = await import("./evolution-db");
      const result = await evolutionPool.query(`
        SELECT 
          id,
          name,
          number,
          "profilePicUrl",
          "profileName",
          "connectionStatus"
        FROM "Instance"
        ORDER BY "createdAt" DESC
      `);
      
      res.json(result.rows);
    } catch (error: any) {
      console.error("Error fetching instances:", error);
      res.status(500).json({ error: "Erro ao buscar instâncias" });
    }
  });

  // Get chats for a specific instance
  app.get("/api/whatsapp/instances/:instanceId/chats", authMiddleware, async (req, res) => {
    try {
      const { instanceId } = req.params;
      const { evolutionPool } = await import("./evolution-db");
      
      // Simplified query without heavy subqueries - much faster!
      const result = await evolutionPool.query(`
        SELECT 
          c.id,
          c."remoteJid",
          c.name,
          c."unreadMessages",
          c."createdAt",
          c."updatedAt",
          ct."profilePicUrl",
          ct."pushName",
          NULL::text as last_message,
          NULL::integer as last_message_timestamp
        FROM "Chat" c
        LEFT JOIN "Contact" ct ON ct."remoteJid" = c."remoteJid" AND ct."instanceId" = c."instanceId"
        WHERE c."instanceId" = $1
        ORDER BY c."updatedAt" DESC
        LIMIT 100
      `, [instanceId]);
      
      res.json(result.rows);
    } catch (error: any) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ error: "Erro ao buscar conversas" });
    }
  });

  // Get messages for a specific chat
  app.get("/api/whatsapp/instances/:instanceId/chats/:remoteJid/messages", authMiddleware, async (req, res) => {
    try {
      const { instanceId, remoteJid } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;
      const { evolutionPool } = await import("./evolution-db");
      
      const result = await evolutionPool.query(`
        SELECT 
          id,
          key,
          "pushName",
          participant,
          "messageType",
          message,
          "contextInfo",
          "messageTimestamp",
          status
        FROM "Message"
        WHERE (key->>'remoteJid') = $1
          AND "instanceId" = $2
        ORDER BY "messageTimestamp" ASC
        LIMIT $3 OFFSET $4
      `, [remoteJid, instanceId, limit, offset]);
      
      res.json(result.rows);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
  });

  // Mark messages as read via Uazapi
  app.post("/api/whatsapp/mark-read", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, messageIds } = req.body;

      // Validação
      if (!instanceNumber || !messageIds || !Array.isArray(messageIds)) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber (string), messageIds (array)" 
        });
      }

      // Buscar token da instância no storage
      const uazapiInstance = await storage.getUazapiInstance(instanceNumber);
      
      if (!uazapiInstance || !uazapiInstance.apiToken) {
        return res.status(404).json({ 
          error: "Token não configurado para esta instância. Configure na página de Configurações." 
        });
      }

      const baseUrl = process.env.UAZAPI_BASE_URL || "https://quatro-cinco.uazapi.com";
      const response = await fetch(`${baseUrl}/message/markread`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": uazapiInstance.apiToken,
        },
        body: JSON.stringify({ id: messageIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Uazapi mark-read error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao marcar mensagens como lidas",
          details: data
        });
      }

      res.json({ 
        success: true, 
        message: "Mensagens marcadas como lidas",
        data 
      });
    } catch (error: any) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Erro ao marcar mensagens como lidas" });
    }
  });

  // React to message via Uazapi
  app.post("/api/whatsapp/react", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, number, text, id } = req.body;

      // Validação
      if (!instanceNumber || !number || !text || !id) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, number, text (emoji), id (messageId)" 
        });
      }

      // Buscar token da instância
      const uazapiInstance = await storage.getUazapiInstance(instanceNumber);
      
      if (!uazapiInstance || !uazapiInstance.apiToken) {
        return res.status(404).json({ 
          error: "Token não configurado para esta instância" 
        });
      }

      const baseUrl = process.env.UAZAPI_BASE_URL || "https://quatro-cinco.uazapi.com";
      const response = await fetch(`${baseUrl}/message/react`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": uazapiInstance.apiToken,
        },
        body: JSON.stringify({ number, text, id }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Uazapi react error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao adicionar reação",
          details: data
        });
      }

      res.json({ 
        success: true, 
        message: "Reação adicionada com sucesso",
        data 
      });
    } catch (error: any) {
      console.error("Error reacting to message:", error);
      res.status(500).json({ error: "Erro ao adicionar reação" });
    }
  });

  // Delete message via Uazapi
  app.post("/api/whatsapp/delete", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, id } = req.body;

      // Validação
      if (!instanceNumber || !id) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, id (messageId)" 
        });
      }

      // Buscar token da instância
      const uazapiInstance = await storage.getUazapiInstance(instanceNumber);
      
      if (!uazapiInstance || !uazapiInstance.apiToken) {
        return res.status(404).json({ 
          error: "Token não configurado para esta instância" 
        });
      }

      const baseUrl = process.env.UAZAPI_BASE_URL || "https://quatro-cinco.uazapi.com";
      const response = await fetch(`${baseUrl}/message/delete`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": uazapiInstance.apiToken,
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Uazapi delete error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao deletar mensagem",
          details: data
        });
      }

      res.json({ 
        success: true, 
        message: "Mensagem deletada com sucesso",
        data 
      });
    } catch (error: any) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Erro ao deletar mensagem" });
    }
  });

  // Send text message via Uazapi
  app.post("/api/whatsapp/send-message", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, recipientNumber, text } = req.body;

      // Validação de campos obrigatórios
      if (!instanceNumber || !recipientNumber || !text) {
        return res.status(400).json({ 
          error: "Campos obrigatórios faltando: instanceNumber, recipientNumber, text" 
        });
      }

      // Validar formato brasileiro do número da instância (55 + 10-11 dígitos)
      const brazilNumberPattern = /^55\d{10,11}$/;
      if (!brazilNumberPattern.test(instanceNumber)) {
        return res.status(400).json({ 
          error: "Número da instância deve estar no formato brasileiro: 55 + DDD + número (ex: 5511999999999)" 
        });
      }

      // Validar formato do número do destinatário (pode ser brasileiro ou internacional)
      // Aceita números com 8-15 dígitos (flexível para formato internacional)
      const recipientNumberPattern = /^\d{8,15}$/;
      if (!recipientNumberPattern.test(recipientNumber)) {
        return res.status(400).json({ 
          error: "Número do destinatário inválido. Deve conter apenas dígitos (ex: 5511999999999)" 
        });
      }

      // Buscar token da instância no banco
      const uazapiInstance = await storage.getUazapiInstance(instanceNumber);
      if (!uazapiInstance) {
        return res.status(404).json({ 
          error: "Instância não cadastrada no Uazapi. Configure o token nas configurações." 
        });
      }

      // Verificar se a instância existe no Evolution DB pelo número
      const { evolutionPool } = await import("./evolution-db");
      const instanceResult = await evolutionPool.query(`
        SELECT id, name, number as instance_number, "connectionStatus"
        FROM "Instance"
        WHERE number = $1
      `, [instanceNumber]);

      if (instanceResult.rows.length === 0) {
        return res.status(404).json({ 
          error: "Instância não encontrada no Evolution Database com o número fornecido" 
        });
      }

      const instance = instanceResult.rows[0];

      // Verificar se a instância está ativa
      if (instance.connectionStatus !== "open") {
        return res.status(400).json({ 
          error: "Instância não está conectada. Status: " + instance.connectionStatus 
        });
      }

      // Chamar API do Uazapi para enviar mensagem usando token específico da instância
      const UAZAPI_BASE_URL = "https://quatro-cinco.uazapi.com";

      const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": uazapiInstance.apiToken, // Token específico da instância
        },
        body: JSON.stringify({
          number: recipientNumber,
          text: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Uazapi error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao enviar mensagem via Uazapi",
          details: data
        });
      }

      res.json({ 
        success: true, 
        message: "Mensagem enviada com sucesso",
        data 
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Erro ao enviar mensagem" });
    }
  });

  // Uazapi Instances - Token Management
  // Get token for specific instance
  app.get("/api/uazapi/instances/:number", authMiddleware, async (req, res) => {
    try {
      const { number } = req.params;
      const instance = await storage.getUazapiInstance(number);
      
      if (!instance) {
        return res.status(404).json({ error: "Instância não encontrada" });
      }
      
      // Retornar sem expor o token completo (apenas indicar se existe)
      res.json({ 
        instanceNumber: instance.instanceNumber,
        hasToken: !!instance.apiToken,
        createdAt: instance.createdAt
      });
    } catch (error: any) {
      console.error("Error fetching uazapi instance:", error);
      res.status(500).json({ error: "Erro ao buscar instância" });
    }
  });

  // Create or update token for instance
  app.post("/api/uazapi/instances", authMiddleware, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      const { insertUazapiInstanceSchema } = await import("@shared/schema");
      const data = insertUazapiInstanceSchema.parse(req.body);
      
      // Verificar se já existe
      const existing = await storage.getUazapiInstance(data.instanceNumber);
      
      if (existing) {
        // Atualizar
        const updated = await storage.updateUazapiInstance(data.instanceNumber, { apiToken: data.apiToken });
        res.json(updated);
      } else {
        // Criar novo
        const created = await storage.createUazapiInstance(data);
        res.json(created);
      }
    } catch (error: any) {
      console.error("Error saving uazapi instance:", error);
      res.status(400).json({ error: error.message || "Erro ao salvar token" });
    }
  });

  // Delete token for instance
  app.delete("/api/uazapi/instances/:number", authMiddleware, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      const { number } = req.params;
      const deleted = await storage.deleteUazapiInstance(number);
      
      if (!deleted) {
        return res.status(404).json({ error: "Instância não encontrada" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting uazapi instance:", error);
      res.status(500).json({ error: "Erro ao deletar token" });
    }
  });

  // ============ WEBHOOKS ============
  
  // Evolution API webhook for new messages
  app.post("/webhooks/evolution/message", webhookLimiter, async (req, res) => {
    try {
      const payload = req.body;
      
      console.log("📨 Evolution webhook received:", JSON.stringify(payload, null, 2));

      // Estrutura esperada do webhook do Evolution:
      // {
      //   "instance": "instance_name",
      //   "data": {
      //     "key": { "remoteJid": "5511999999999@s.whatsapp.net", "fromMe": false, ... },
      //     "message": { ... },
      //     "messageTimestamp": "1234567890",
      //     ...
      //   }
      // }

      // Broadcast para todos os clientes WebSocket conectados
      broadcast({
        type: "whatsapp_message_received",
        data: {
          instance: payload.instance,
          instanceNumber: payload.instanceNumber,
          remoteJid: payload.data?.key?.remoteJid,
          message: payload.data,
          timestamp: payload.data?.messageTimestamp || Date.now(),
        }
      });

      res.status(200).json({ success: true, message: "Webhook processed" });
    } catch (error: any) {
      console.error("Error processing Evolution webhook:", error);
      res.status(500).json({ error: "Erro ao processar webhook" });
    }
  });

  return httpServer;
}
