import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { dbStorage as storage } from "./db-storage";
import { authMiddleware, generateToken, type AuthRequest } from "./middleware/auth";
import { requirePermission, requireRole } from "./middleware/rbac";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertIASchema, insertTicketSchema, insertActionSchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { supabase } from "./supabase";

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

// WebSocket clients and active instances tracking
const wsClients = new Set<WebSocket>();
const activeInstances = new Map<string, Set<WebSocket>>(); // instanceId -> Set of WebSocket clients
const lastMessageTimestamps = new Map<string, number>(); // instanceId -> last message timestamp

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Health check endpoint (no auth required)
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

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
      const decoded = jwt.verify(token, JWT_SECRET) as { email: string; userId: string };

      console.log(`WebSocket client connected: ${decoded.email}`);
      wsClients.add(ws);

      // Handle messages from client
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === "register_instance") {
            const instanceId = message.instanceId;
            if (!activeInstances.has(instanceId)) {
              activeInstances.set(instanceId, new Set());
              console.log(`📱 Started monitoring instance: ${instanceId}`);
            }
            activeInstances.get(instanceId)!.add(ws);
            console.log(`📱 Client registered for instance ${instanceId}. Total monitoring: ${activeInstances.size} instances`);
          } else if (message.type === "unregister_instance") {
            const instanceId = message.instanceId;
            if (activeInstances.has(instanceId)) {
              activeInstances.get(instanceId)!.delete(ws);
              if (activeInstances.get(instanceId)!.size === 0) {
                activeInstances.delete(instanceId);
                lastMessageTimestamps.delete(instanceId);
                console.log(`📱 Stopped monitoring instance: ${instanceId}`);
              }
            }
            console.log(`📱 Client unregistered from instance ${instanceId}. Total monitoring: ${activeInstances.size} instances`);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        console.log("WebSocket client disconnected");
        wsClients.delete(ws);
        
        // Remove client from all active instances
        activeInstances.forEach((clients, instanceId) => {
          clients.delete(ws);
          if (clients.size === 0) {
            activeInstances.delete(instanceId);
            lastMessageTimestamps.delete(instanceId);
            console.log(`📱 Stopped monitoring instance: ${instanceId} (no more clients)`);
          }
        });
      });
    } catch (error: any) {
      const errorMsg = error.name === "TokenExpiredError"
        ? "Token expired"
        : error.name === "JsonWebTokenError"
        ? "Invalid token format"
        : "Invalid token";

      console.log(`WebSocket connection rejected: ${errorMsg}`, error.message);
      ws.close(1008, errorMsg);
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

  // Helper to broadcast to clients monitoring a specific instance
  function broadcastToInstance(instanceId: string, data: any) {
    const clients = activeInstances.get(instanceId);
    if (!clients || clients.size === 0) return;
    
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Polling loop to check for new messages in Evolution DB - otimizado
  async function pollNewMessages() {
    // Skip se não há instâncias sendo monitoradas
    if (activeInstances.size === 0) return;

    try {
      const { evolutionPool } = await import("./evolution-db");
      
      for (const [instanceId, clients] of Array.from(activeInstances.entries())) {
        // Skip instâncias sem clientes conectados
        if (clients.size === 0) continue;

        try {
          const lastTimestamp = lastMessageTimestamps.get(instanceId) || Date.now() - 10000;
          
          // Query otimizada para novas mensagens
          const result = await evolutionPool.query(`
            SELECT
              (key->>'remoteJid') as "keyRemoteJid",
              (key->>'id') as "messageId",
              (key->>'fromMe')::boolean as "fromMe",
              "pushName",
              "messageTimestamp",
              "messageType",
              COALESCE(message->>'conversation',
                       message->'extendedTextMessage'->>'text',
                       '[Mídia]') as message_text
            FROM "Message"
            WHERE "instanceId" = $1
              AND "messageTimestamp" > $2::bigint
            ORDER BY "messageTimestamp" ASC
            LIMIT 50
          `, [instanceId, lastTimestamp]);

          if (result.rows.length > 0) {
            console.log(`📱 Found ${result.rows.length} new messages for instance ${instanceId}`);
            
            const latestTimestamp = Math.max(...result.rows.map((row: any) => parseInt(row.messageTimestamp)));
            lastMessageTimestamps.set(instanceId, latestTimestamp);

            // Broadcast mensagens
            result.rows.forEach((row: any) => {
              broadcastToInstance(instanceId, {
                type: "whatsapp_message_received",
                data: {
                  instanceId,
                  remoteJid: row.keyRemoteJid,
                  messageId: row.messageId,
                  fromMe: row.fromMe,
                  pushName: row.pushName,
                  messageTimestamp: row.messageTimestamp,
                  messageType: row.messageType,
                  message: row.message_text
                }
              });
            });
          }
        } catch (instanceError) {
          // Log erro mas continua com outras instâncias
          console.error(`Error polling messages for instance ${instanceId}:`, instanceError);
        }
      }
    } catch (error) {
      console.error("Error in pollNewMessages:", error);
    }
  }

  // Polling loop otimizado (3s ao invés de 2s)
  setInterval(pollNewMessages, 3000);
  console.log("📱 WhatsApp message polling started (3s interval)");

  // ============ AUTH ROUTES ============

  // Register (Supabase + Local DB sync)
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (authError || !authData.user) {
        return res.status(400).json({ error: authError?.message || "Erro ao registrar usuário" });
      }

      // Create user in local DB for role management
      const existingLocalUser = await storage.getUserByEmail(email);
      let localUser;
      if (!existingLocalUser) {
        localUser = await storage.createUser({
          id: authData.user.id,
          name,
          email,
          password: "", // Don't store password locally - use Supabase
          role: "viewer", // Default role
        });
      } else {
        localUser = existingLocalUser;
      }

      // Get access token
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (sessionError || !sessionData.session) {
        return res.status(400).json({ error: "Erro ao gerar token" });
      }

      res.json({
        user: {
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          role: localUser.role,
        },
        token: sessionData.session.access_token,
      });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(400).json({ error: error.message || "Erro ao registrar" });
    }
  });

  // Login (Supabase + Local DB sync)
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      // Authenticate with Supabase
      const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !sessionData.session) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      // Get or sync user in local DB
      let localUser = await storage.getUserByEmail(email);
      if (!localUser) {
        // Create user in local DB if doesn't exist
        const supabaseUser = sessionData.session.user;
        localUser = await storage.createUser({
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || email.split("@")[0],
          email,
          password: "", // Don't store password locally
          role: "viewer", // Default role
        });
      }

      res.json({
        user: {
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          role: localUser.role,
        },
        token: sessionData.session.access_token,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message || "Erro ao fazer login" });
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

      if (newPassword.length < 12) {
        return res.status(400).json({ error: "A nova senha deve ter no mínimo 12 caracteres" });
      }

      // Validar complexidade da senha (pelo menos uma letra maiúscula, uma minúscula e um número)
      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasLowerCase = /[a-z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);

      if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        return res.status(400).json({
          error: "A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número"
        });
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
      
      // Query with last message preview - CORRIGIDO: filtra mensagens por instância
      // IMPORTANTE: DISTINCT ON requer que os campos estejam no início do ORDER BY
      const result = await evolutionPool.query(`
        WITH LastMessages AS (
          SELECT DISTINCT ON ((key->>'remoteJid'))
            (key->>'remoteJid') as remote_jid,
            COALESCE(
              message->>'conversation',
              message->'extendedTextMessage'->>'text',
              CASE
                WHEN message->'stickerMessage' IS NOT NULL THEN '🎨 Sticker'
                WHEN message->'imageMessage' IS NOT NULL THEN '📷 Imagem'
                WHEN message->'audioMessage' IS NOT NULL THEN '🎵 Áudio'
                WHEN message->'documentMessage' IS NOT NULL THEN '📄 ' || COALESCE(message->'documentMessage'->>'fileName', 'Documento')
                WHEN message->'videoMessage' IS NOT NULL THEN '🎥 Vídeo'
                WHEN message->'contactMessage' IS NOT NULL THEN '👤 Contato'
                WHEN message->'locationMessage' IS NOT NULL THEN '📍 Localização'
                ELSE '(mensagem não suportada)'
              END
            ) as last_message_text,
            "messageTimestamp" as last_msg_timestamp
          FROM "Message"
          WHERE "instanceId" = $1
          ORDER BY (key->>'remoteJid') ASC, "messageTimestamp" DESC
        )
        SELECT
          c.id,
          c."remoteJid",
          c.name,
          c."unreadMessages",
          c."createdAt",
          c."updatedAt",
          ct."profilePicUrl",
          ct."pushName",
          COALESCE(lm.last_message_text, 'Sem mensagens') as last_message,
          lm.last_msg_timestamp as last_message_timestamp
        FROM "Chat" c
        LEFT JOIN "Contact" ct ON ct."remoteJid" = c."remoteJid" AND ct."instanceId" = c."instanceId"
        LEFT JOIN LastMessages lm ON lm.remote_jid = c."remoteJid"
        WHERE c."instanceId" = $1
        ORDER BY COALESCE(lm.last_msg_timestamp, EXTRACT(EPOCH FROM c."updatedAt")::integer) DESC
        LIMIT 100
      `, [instanceId]);
      
      res.json(result.rows);
    } catch (error: any) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ error: "Erro ao buscar conversas" });
    }
  });

  // Get unread count for a specific chat (for polling after mark-read)
  app.get("/api/whatsapp/instances/:instanceId/chats/:remoteJid/unread-count", authMiddleware, async (req, res) => {
    try {
      const { instanceId, remoteJid } = req.params;
      const { evolutionPool } = await import("./evolution-db");
      
      const result = await evolutionPool.query(`
        SELECT "unreadMessages"
        FROM "Chat"
        WHERE "instanceId" = $1 AND "remoteJid" = $2
      `, [instanceId, remoteJid]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Chat não encontrado" });
      }
      
      res.json({ 
        unreadMessages: result.rows[0].unreadMessages || 0 
      });
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Erro ao buscar contador de não lidas" });
    }
  });

  // Get decrypted media (stickers, images, documents)
  app.get("/api/whatsapp/media/decrypt/:messageId", authMiddleware, async (req, res) => {
    try {
      const { messageId } = req.params;
      const { evolutionPool } = await import("./evolution-db");
      const { decryptWhatsAppMedia, bufferToDataUrl, MediaExpiredError } = await import("./whatsapp-media-decrypt");

      // Buscar mensagem com informações de mídia
      const result = await evolutionPool.query(`
        SELECT
          "messageType",
          message
        FROM "Message"
        WHERE id = $1
      `, [messageId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Mensagem não encontrada" });
      }

      const msg = result.rows[0];
      const messageType = msg.messageType;
      const messageData = msg.message;

      // Determinar tipo de mídia e extrair dados
      let mediaInfo: any;
      let mediaTypeKey: 'image' | 'video' | 'audio' | 'document' = 'document';

      if (messageType === 'stickerMessage' && messageData.stickerMessage) {
        mediaInfo = messageData.stickerMessage;
        mediaTypeKey = 'image'; // Stickers são tratados como imagem
      } else if (messageType === 'imageMessage' && messageData.imageMessage) {
        mediaInfo = messageData.imageMessage;
        mediaTypeKey = 'image';
      } else if (messageType === 'documentMessage' && messageData.documentMessage) {
        mediaInfo = messageData.documentMessage;
        mediaTypeKey = 'document';
      } else if (messageType === 'audioMessage' && messageData.audioMessage) {
        mediaInfo = messageData.audioMessage;
        mediaTypeKey = 'audio';
      } else if (messageType === 'videoMessage' && messageData.videoMessage) {
        mediaInfo = messageData.videoMessage;
        mediaTypeKey = 'video';
      } else {
        return res.status(400).json({ error: "Tipo de mídia não suportado" });
      }

      let { url, mediaKey, mimetype, fileName } = mediaInfo;

      if (!url || !mediaKey) {
        return res.status(400).json({ error: "URL ou mediaKey não encontrada" });
      }

      // Se mediaKey for um objeto Buffer vindo do PostgreSQL, converter para base64
      if (typeof mediaKey === 'object' && !Buffer.isBuffer(mediaKey)) {
        // PostgreSQL retorna Buffer como objeto com propriedades numéricas
        const buffer = Buffer.from(Object.values(mediaKey) as number[]);
        mediaKey = buffer.toString('base64');
      } else if (Buffer.isBuffer(mediaKey)) {
        mediaKey = mediaKey.toString('base64');
      }

      // Descriptografar mídia
      const decryptedBuffer = await decryptWhatsAppMedia(url, mediaKey, mediaTypeKey);

      // Para documentos, retornar como download (manter comportamento de download)
      if (messageType === 'documentMessage') {
        res.setHeader('Content-Type', mimetype || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName || 'download'}"`);
        return res.send(decryptedBuffer);
      }

      // Para todas as outras mídias (stickers, imagens, vídeos, áudios), retornar como dataUrl
      const dataUrl = bufferToDataUrl(decryptedBuffer, mimetype || 'application/octet-stream');
      return res.json({ dataUrl, mimetype: mimetype || 'application/octet-stream' });

    } catch (error: any) {
      // Importar MediaExpiredError para verificação
      const { MediaExpiredError } = await import("./whatsapp-media-decrypt");

      // Tratar erro de mídia expirada com HTTP 410 (Gone)
      if (error instanceof MediaExpiredError || error.name === 'MediaExpiredError') {
        console.log(`⏰ Mídia expirada para messageId ${req.params.messageId}: ${error.message}`);
        return res.status(410).json({
          error: "Mídia expirada",
          message: "Esta mídia não está mais disponível. As URLs de mídia do WhatsApp expiram após alguns dias.",
          expired: true
        });
      }

      // Outros erros
      console.error("❌ Erro ao descriptografar mídia:", error.message);
      res.status(500).json({ error: "Erro ao descriptografar mídia", details: error.message });
    }
  });

  // Get messages for a specific chat
  app.get("/api/whatsapp/instances/:instanceId/chats/:remoteJid/messages", authMiddleware, async (req, res) => {
    try {
      const { instanceId, remoteJid } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;
      const { evolutionPool } = await import("./evolution-db");
      
      // CORRIGIDO: Usa DESC para pegar mensagens mais recentes primeiro
      // O frontend inverte o array para exibir corretamente (mais antiga → mais recente)
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
        ORDER BY "messageTimestamp" DESC
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

  // Send media (image, video, audio, document) via Uazapi
  app.post("/api/whatsapp/send-media", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, recipientNumber, type, file, text, docName } = req.body;

      // Validação de campos obrigatórios
      if (!instanceNumber || !recipientNumber || !type || !file) {
        return res.status(400).json({ 
          error: "Campos obrigatórios faltando: instanceNumber, recipientNumber, type, file" 
        });
      }

      // Validar tipo de mídia
      const validTypes = ["image", "video", "document", "audio", "myaudio", "ptt", "sticker"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          error: `Tipo de mídia inválido. Use: ${validTypes.join(", ")}` 
        });
      }

      // Validar formato brasileiro do número da instância (55 + 10-11 dígitos)
      const brazilNumberPattern = /^55\d{10,11}$/;
      if (!brazilNumberPattern.test(instanceNumber)) {
        return res.status(400).json({ 
          error: "Número da instância deve estar no formato brasileiro: 55 + DDD + número (ex: 5511999999999)" 
        });
      }

      // Validar formato do número do destinatário
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

      // Chamar API do Uazapi para enviar mídia usando token específico da instância
      const UAZAPI_BASE_URL = "https://quatro-cinco.uazapi.com";

      // Preparar o body da requisição
      const requestBody: any = {
        number: recipientNumber,
        type: type,
        file: file,
      };

      // Adicionar campos opcionais
      if (text) {
        requestBody.text = text;
      }

      if (docName && type === "document") {
        requestBody.docName = docName;
      }

      const response = await fetch(`${UAZAPI_BASE_URL}/send/media`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": uazapiInstance.apiToken,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Uazapi media error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao enviar mídia via Uazapi",
          details: data
        });
      }

      res.json({ 
        success: true, 
        message: "Mídia enviada com sucesso",
        data 
      });
    } catch (error: any) {
      console.error("Error sending media:", error);
      res.status(500).json({ error: "Erro ao enviar mídia" });
    }
  });

  // Show typing or recording presence via Uazapi
  app.post("/api/whatsapp/presence", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, number, presence, delay } = req.body;

      // Validação
      if (!instanceNumber || !number || !presence) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, number, presence (composing/recording/paused)" 
        });
      }

      // Validar tipo de presença
      const validPresences = ["composing", "recording", "paused"];
      if (!validPresences.includes(presence)) {
        return res.status(400).json({ 
          error: `Presença inválida. Use: ${validPresences.join(", ")}` 
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
      const requestBody: any = { number, presence };
      if (delay) requestBody.delay = delay;

      const response = await fetch(`${baseUrl}/message/presence`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": uazapiInstance.apiToken,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Uazapi presence error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao atualizar presença",
          details: data
        });
      }

      res.json({ 
        success: true, 
        message: "Presença atualizada",
        data 
      });
    } catch (error: any) {
      console.error("Error updating presence:", error);
      res.status(500).json({ error: "Erro ao atualizar presença" });
    }
  });

  // Archive or unarchive chat via Uazapi
  app.post("/api/whatsapp/chat/archive", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, number, archive } = req.body;

      // Validação
      if (!instanceNumber || !number || typeof archive !== "boolean") {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, number, archive (boolean)" 
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
      const response = await fetch(`${baseUrl}/chat/archive`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": uazapiInstance.apiToken,
        },
        body: JSON.stringify({ number, archive }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Uazapi archive error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao arquivar/desarquivar chat",
          details: data
        });
      }

      res.json({ 
        success: true, 
        message: archive ? "Chat arquivado" : "Chat desarquivado",
        data 
      });
    } catch (error: any) {
      console.error("Error archiving chat:", error);
      res.status(500).json({ error: "Erro ao arquivar chat" });
    }
  });

  // Pin or unpin chat via Uazapi
  app.post("/api/whatsapp/chat/pin", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, number, pin } = req.body;

      // Validação
      if (!instanceNumber || !number || typeof pin !== "boolean") {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, number, pin (boolean)" 
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
      const response = await fetch(`${baseUrl}/chat/pin`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": uazapiInstance.apiToken,
        },
        body: JSON.stringify({ number, pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Uazapi pin error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao fixar/desafixar chat",
          details: data
        });
      }

      res.json({ 
        success: true, 
        message: pin ? "Chat fixado" : "Chat desfixado",
        data 
      });
    } catch (error: any) {
      console.error("Error pinning chat:", error);
      res.status(500).json({ error: "Erro ao fixar chat" });
    }
  });

  // Mark chat as read or unread via Uazapi
  app.post("/api/whatsapp/chat/read", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, number, read } = req.body;

      // Validação
      if (!instanceNumber || !number || typeof read !== "boolean") {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, number, read (boolean)" 
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
      const response = await fetch(`${baseUrl}/chat/read`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": uazapiInstance.apiToken,
        },
        body: JSON.stringify({ number, read }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Uazapi chat read error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao marcar chat como lido/não lido",
          details: data
        });
      }

      res.json({ 
        success: true, 
        message: read ? "Chat marcado como lido" : "Chat marcado como não lido",
        data 
      });
    } catch (error: any) {
      console.error("Error marking chat as read:", error);
      res.status(500).json({ error: "Erro ao marcar chat como lido" });
    }
  });

  // Check if numbers are registered on WhatsApp via Uazapi
  app.post("/api/whatsapp/chat/check", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, numbers } = req.body;

      // Validação
      if (!instanceNumber || !numbers || !Array.isArray(numbers)) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, numbers (array)" 
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
      const response = await fetch(`${baseUrl}/chat/check`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": uazapiInstance.apiToken,
        },
        body: JSON.stringify({ numbers }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Uazapi check error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao verificar números",
          details: data
        });
      }

      res.json({ 
        success: true, 
        message: "Números verificados",
        data 
      });
    } catch (error: any) {
      console.error("Error checking numbers:", error);
      res.status(500).json({ error: "Erro ao verificar números" });
    }
  });

  // Get instance status and QR code via Uazapi
  app.get("/api/whatsapp/instance/status/:instanceNumber", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber } = req.params;

      // Validação
      if (!instanceNumber) {
        return res.status(400).json({ 
          error: "Número da instância obrigatório" 
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
      const response = await fetch(`${baseUrl}/instance/status`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "token": uazapiInstance.apiToken,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Uazapi status error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao buscar status da instância",
          details: data
        });
      }

      res.json({ 
        success: true, 
        message: "Status obtido com sucesso",
        data 
      });
    } catch (error: any) {
      console.error("Error getting instance status:", error);
      res.status(500).json({ error: "Erro ao buscar status" });
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

  // ============ CONTACT METADATA (Tags & Custom Fields) ============
  
  // Get contact metadata
  app.get("/api/contact-metadata/:instanceId/:remoteJid", authMiddleware, async (req, res) => {
    try {
      const { instanceId, remoteJid } = req.params;
      const metadata = await storage.getContactMetadata(instanceId, remoteJid);
      
      if (!metadata) {
        return res.json({ 
          instanceId, 
          remoteJid, 
          tags: [], 
          customFields: {}, 
          notes: null 
        });
      }
      
      res.json(metadata);
    } catch (error: any) {
      console.error("Error fetching contact metadata:", error);
      res.status(500).json({ error: "Erro ao buscar metadados do contato" });
    }
  });

  // Create or update contact metadata
  app.post("/api/contact-metadata", authMiddleware, async (req, res) => {
    try {
      const { insertContactMetadataSchema } = await import("@shared/schema");
      const data = insertContactMetadataSchema.parse(req.body);
      
      // Check if metadata already exists
      const existing = await storage.getContactMetadata(data.instanceId, data.remoteJid);
      
      if (existing) {
        // Update existing
        const updated = await storage.updateContactMetadata(data.instanceId, data.remoteJid, data);
        res.json(updated);
      } else {
        // Create new
        const created = await storage.createContactMetadata(data);
        res.json(created);
      }
    } catch (error: any) {
      console.error("Error saving contact metadata:", error);
      res.status(400).json({ error: error.message || "Erro ao salvar metadados" });
    }
  });

  // Delete contact metadata
  app.delete("/api/contact-metadata/:instanceId/:remoteJid", authMiddleware, async (req, res) => {
    try {
      const { instanceId, remoteJid } = req.params;
      const deleted = await storage.deleteContactMetadata(instanceId, remoteJid);
      
      if (!deleted) {
        return res.status(404).json({ error: "Metadados não encontrados" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting contact metadata:", error);
      res.status(500).json({ error: "Erro ao deletar metadados" });
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
