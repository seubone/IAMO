import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { dbStorage as storage } from "./db-storage";
import { authMiddleware, generateToken, type AuthRequest } from "./middleware/auth";
import { requirePermission, requireRole } from "./middleware/rbac";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { insertUserSchema, insertIASchema, insertTicketSchema, insertActionSchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { supabase } from "./supabase";
import { getUazapiTokenByInstanceNumber } from "./uazapi-supabase";
import { unifiedSender } from "./send-strategy";
import { evolutionPool } from "./evolution-db";
import { registerBotConfigRoutes } from "./routes/bot-config.routes";
import { registerIAConfigRoutes } from "./routes/ia-config.routes";
import { registerAIDataRoutes } from "./routes/ai-data.routes";

// Rate limiters
// In development, allow more attempts; in production, keep it strict
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === "production" ? 15 * 60 * 1000 : 60 * 1000, // 15 min (prod) or 1 min (dev)
  max: process.env.NODE_ENV === "production" ? 5 : 100, // 5 (prod) or 100 (dev) requests per window
  message: "Muitas tentativas de login. Tente novamente mais tarde.",
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

// Helper function to get all instance IDs that share the same WhatsApp number (ownerJid)
// This enables message synchronization across instances when a WhatsApp number is recreated
async function getRelatedInstanceIds(instanceId: string): Promise<string[]> {
  try {
    const result = await evolutionPool.query(`
      SELECT id FROM "Instance"
      WHERE "ownerJid" = (
        SELECT "ownerJid" FROM "Instance" WHERE id = $1
      )
      ORDER BY "createdAt" DESC
    `, [instanceId]);

    const ids = result.rows.map(row => row.id);

    if (ids.length > 1) {
      console.log(`🔗 Found ${ids.length} instances with same ownerJid for ${instanceId}`);
    }

    return ids;
  } catch (error) {
    console.error("Error getting related instances:", error);
    return [instanceId]; // Fallback to single instance if query fails
  }
}

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

      console.log(`✅ WebSocket client connected: ${decoded.email}`);
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
      let errorMsg: string;

      if (error.name === "TokenExpiredError") {
        errorMsg = "Token expired";
        console.warn(`⏰ WebSocket connection rejected: Token expired (${error.message})`);
      } else if (error.name === "JsonWebTokenError") {
        errorMsg = "Invalid token format";
        console.warn(`❌ WebSocket connection rejected: Invalid token signature (${error.message})`);
      } else {
        errorMsg = "Invalid token";
        console.warn(`⚠️ WebSocket connection rejected: Invalid token (${error.message})`);
      }

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

  async function resolveInstanceIdentifier(rawInstanceNumber: string | null | undefined) {
    const identifier = (rawInstanceNumber ?? "").trim();
    const digitsOnly = identifier.replace(/\D/g, "");

    const { evolutionPool } = await import("./evolution-db");
    const result = await evolutionPool.query(
      `
        SELECT
          id,
          name,
          "connectionStatus",
          number,
          "ownerJid",
          regexp_replace("ownerJid", '@.*$', '') AS owner_number,
          regexp_replace(regexp_replace(id, '@.*$', ''), '\\D', '', 'g') AS id_digits,
          regexp_replace(name, '\\D', '', 'g') AS name_digits
        FROM "Instance"
        WHERE number = $1
           OR regexp_replace("ownerJid", '@.*$', '') = $1
           OR regexp_replace(regexp_replace(id, '@.*$', ''), '\\D', '', 'g') = $1
           OR regexp_replace(name, '\\D', '', 'g') = $1
           OR id = $2
           OR name = $3
        ORDER BY "updatedAt" DESC NULLS LAST
        LIMIT 1
      `,
      [digitsOnly, identifier, identifier]
    );

    if (result.rows.length === 0) {
      return {
        normalizedNumber: /^\d{12,13}$/.test(digitsOnly) ? digitsOnly : null,
        ownerNumber: /^\d{12,13}$/.test(digitsOnly) ? digitsOnly : null,
        instance: null,
      };
    }

    const instance = result.rows[0] as any;
    const candidateNumbers = [
      instance.number,
      instance.owner_number,
      digitsOnly,
      instance.id_digits,
      instance.name_digits,
    ]
      .filter(Boolean)
      .map((value: string) => value.replace(/\D/g, ""))
      .filter(Boolean);

    const normalizedNumber =
      candidateNumbers.find((value) => /^55\d{10,11}$/.test(value)) ?? null;

    const ownerNumber = (instance.owner_number ? String(instance.owner_number) : null)?.replace(/\D/g, "");
    const normalizedOwner = ownerNumber && /^55\d{10,11}$/.test(ownerNumber) ? ownerNumber : normalizedNumber;

    return { normalizedNumber, ownerNumber: normalizedOwner, instance };
  }

  /**
   * Buscar configuração do bot da instância
   * Retorna a configuração para ser usada na substituição de pushName
   */
  async function getBotConfig(instanceId: string) {
    try {
      const { data: botConfig, error } = await supabase
        .from('bot_instances')
        .select('has_bot_enabled, consultant_name, use_prefix_for_consultant')
        .eq('instance_id', instanceId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️  Erro ao buscar config de bot: ${error.message}`);
        return null;
      }

      return botConfig;
    } catch (error: any) {
      console.error(`❌ Erro ao buscar configuração de bot: ${error?.message || error}`);
      return null;
    }
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
            for (const row of result.rows) {
              // Se a mensagem foi enviada pelo usuário (fromMe: true), aplicar prefixo do bot se habilitado
              let finalPushName = row.pushName;
              let finalMessage = row.message_text;

              if (row.fromMe) {
                // Buscar configuração do bot para aplicar prefixo
                const botConfig = await getBotConfig(instanceId);

                if (botConfig?.has_bot_enabled && botConfig?.use_prefix_for_consultant && botConfig?.consultant_name) {
                  // Usar nome do consultor ao invés do pushName
                  finalPushName = botConfig.consultant_name;
                }
              }

              broadcastToInstance(instanceId, {
                type: "whatsapp_message_received",
                data: {
                  instanceId,
                  remoteJid: row.keyRemoteJid,
                  messageId: row.messageId,
                  fromMe: row.fromMe,
                  pushName: finalPushName,
                  messageTimestamp: row.messageTimestamp,
                  messageType: row.messageType,
                  message: finalMessage
                }
              });
            }
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

  // OPTIMIZATION: Removed server-side polling
  // Why: Client-side polling (10s) is sufficient and more efficient
  // - Client only polls the active chat (not all instances)
  // - Server polling was creating duplicate work
  // - WebSocket + client polling is enough for real-time updates
  // - This reduces database queries by ~50%
  //
  // If real-time updates are critical, increase client polling frequency:
  // whatsapp.tsx:478 -> change refetchInterval from 10000 to 5000
  //
  // setInterval(pollNewMessages, 3000);
  console.log("📱 ℹ️ Server-side polling disabled (using WebSocket + client polling instead)");

  // ============ PUBLIC CONFIG ROUTES ============

  // Expose public configuration (Supabase credentials for client)
  app.get("/api/config/public", (_req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    });
  });

  // Debug JWT verification (development/troubleshooting only)
  app.post("/api/debug/jwt", async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    try {
      const { verifyToken, decodeTokenWithoutVerification } = await import(
        "./utils/jwt-debug"
      );

      const verificationResult = verifyToken(token);
      const decoded = decodeTokenWithoutVerification(token);

      return res.json({
        verification: verificationResult,
        decoded: decoded?.payload,
        structure: {
          hasThreeParts: token.split(".").length === 3,
          headerAlg: decoded?.header?.alg,
          headerType: decoded?.header?.typ,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        error: "Failed to verify token",
        message: error.message,
      });
    }
  });

  // ============ AUTH ROUTES ============

  // Register (Supabase + Local DB sync + Email Verification)
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
      }

      // Create user in Supabase Auth (with email verification enabled)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: `${process.env.FRONTEND_URL || "http://localhost:5000"}/auth/callback`,
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

      // Return success message - user needs to confirm email
      res.status(201).json({
        success: true,
        message: "Usuário registrado com sucesso! Verifique seu email para confirmar o cadastro.",
        user: {
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          role: localUser.role,
        },
        requiresEmailConfirmation: true,
      });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(400).json({ error: error.message || "Erro ao registrar" });
    }
  });

  // Login (Supabase + Local DB sync + Legacy support)
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      // Try Supabase first (new auth method)
      const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (sessionData?.session) {
        // Supabase auth successful
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

        return res.json({
          user: {
            id: localUser.id,
            name: localUser.name,
            email: localUser.email,
            role: localUser.role,
          },
          token: sessionData.session.access_token,
        });
      }

      // Fallback to legacy local DB auth (for existing users)
      const localUser = await storage.getUserByEmail(email);
      if (!localUser) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const validPassword = await bcrypt.compare(password, localUser.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      // Generate JWT token for legacy users
      const token = generateToken(localUser);

      res.json({
        user: {
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          role: localUser.role,
        },
        token,
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
      console.log("📱 Fetching WhatsApp instances...", {
        user: (req as any).user?.email,
        authenticated: !!(req as any).user,
      });

      const { evolutionPool } = await import("./evolution-db");

      // Show all instances regardless of connectionStatus
      // Users need access to all instances from Evolution DB to send messages
      const whereClause = "";

      const result = await evolutionPool.query(`
        SELECT
          id,
          name,
          COALESCE(
            NULLIF(number, ''),
            NULLIF(regexp_replace("ownerJid", '@.*$', ''), ''),
            NULLIF(regexp_replace(regexp_replace(id, '@.*$', ''), '\\D', '', 'g'), ''),
            NULLIF(regexp_replace(name, '\\D', '', 'g'), '')
          ) AS number,
          "profilePicUrl",
          "profileName",
          "connectionStatus"
        FROM "Instance"
        ${whereClause}
        ORDER BY "createdAt" DESC
      `);

      console.log(`✅ Found ${result.rows.length} instances`);
      res.json(result.rows);
    } catch (error: any) {
      console.error("❌ Error fetching instances:", error);
      res.status(500).json({ error: "Erro ao buscar instâncias" });
    }
  });

  // Get chats for a specific instance
  app.get("/api/whatsapp/instances/:instanceId/chats", authMiddleware, async (req, res) => {
    try {
      const { instanceId } = req.params;

      // Get all instance IDs that share the same WhatsApp number (ownerJid)
      // This enables cross-instance chat synchronization
      const relatedInstanceIds = await getRelatedInstanceIds(instanceId);

      // Query with last message preview
      // NOVO: Busca chats de TODAS as instâncias relacionadas (mesmo ownerJid)
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
          WHERE "instanceId" = ANY($1::text[])
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
        WHERE c."instanceId" = ANY($1::text[])
        ORDER BY COALESCE(lm.last_msg_timestamp, EXTRACT(EPOCH FROM c."updatedAt")::integer) DESC
        LIMIT 100
      `, [relatedInstanceIds]);

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
        console.warn(`⏰ Mídia expirada ou deletada para messageId ${req.params.messageId}`);
        console.warn(`   Razão: ${error.message}`);
        console.warn(`   As URLs de mídia do WhatsApp expiram após ~24 horas`);
        return res.status(410).json({
          error: "Mídia expirada ou deletada",
          message: "Esta mídia não está mais disponível. As URLs do WhatsApp expiram após aproximadamente 24 horas.",
          expired: true,
          type: "MEDIA_EXPIRED"
        });
      }

      // Erro de conectividade (DNS ou rede)
      if (error.code === 'ENOTFOUND' || error.message.includes('ENOTFOUND')) {
        console.warn(`🌐 Erro de conectividade ao baixar mídia para messageId ${req.params.messageId}`);
        console.warn(`   Erro: ${error.message}`);
        console.warn(`   Dica: Verifique a conexão com web.whatsapp.net ou tente novamente`);
        return res.status(503).json({
          error: "Indisponível",
          message: "Não foi possível conectar ao servidor de mídia do WhatsApp. Tente novamente mais tarde.",
          expired: false,
          type: "NETWORK_ERROR"
        });
      }

      // Erro HTTP 404 (arquivo não encontrado)
      if (error.message.includes('404') || error.statusCode === 404) {
        console.warn(`🗑️ Mídia não encontrada (deletada?) para messageId ${req.params.messageId}`);
        console.warn(`   A mídia pode ter sido deletada do servidor WhatsApp`);
        return res.status(410).json({
          error: "Mídia deletada",
          message: "Esta mídia foi deletada e não está mais disponível no servidor WhatsApp.",
          expired: true,
          type: "MEDIA_DELETED"
        });
      }

      // Outros erros
      console.error(`❌ Erro desconhecido ao descriptografar mídia para messageId ${req.params.messageId}`);
      console.error(`   Mensagem: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      res.status(500).json({
        error: "Erro ao descriptografar mídia",
        message: "Ocorreu um erro ao tentar descriptografar a mídia",
        details: error.message,
        type: "DECRYPTION_ERROR"
      });
    }
  });

  // Get messages for a specific chat
  app.get("/api/whatsapp/instances/:instanceId/chats/:remoteJid/messages", authMiddleware, async (req, res) => {
    try {
      const { instanceId, remoteJid } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      // Get all instance IDs that share the same WhatsApp number (ownerJid)
      // This enables cross-instance message synchronization
      const relatedInstanceIds = await getRelatedInstanceIds(instanceId);

      // CORRIGIDO: Usa DESC para pegar mensagens mais recentes primeiro
      // O frontend inverte o array para exibir corretamente (mais antiga → mais recente)
      // NOVO: Busca mensagens de TODAS as instâncias relacionadas (mesmo ownerJid)
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
          status,
          "instanceId",
          (key->>'fromMe')::boolean as "fromMe"
        FROM "Message"
        WHERE (key->>'remoteJid') = $1
          AND "instanceId" = ANY($2::text[])
        ORDER BY "messageTimestamp" DESC
        LIMIT $3 OFFSET $4
      `, [remoteJid, relatedInstanceIds, limit, offset]);

      // Aplicar prefixo de consultor para mensagens enviadas pelo usuário (fromMe: true)
      const processedRows = await Promise.all(
        result.rows.map(async (row: any) => {
          const fromMe = row.fromMe === true;

          if (fromMe) {
            // Buscar configuração do bot para a instância
            const botConfig = await getBotConfig(row.instanceId);

            if (botConfig?.has_bot_enabled && botConfig?.use_prefix_for_consultant && botConfig?.consultant_name) {
              // Substituir pushName pelo nome do consultor
              return {
                ...row,
                pushName: botConfig.consultant_name
              };
            }
          }

          return row;
        })
      );

      res.json(processedRows);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
  });

  // Mark messages as read via Uazapi
  app.post("/api/whatsapp/mark-read", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, messageIds } = req.body;

      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

      // Validação
      if (!normalizedInstanceNumber || !messageIds || !Array.isArray(messageIds)) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber (string), messageIds (array)" 
        });
      }

      // Buscar token da instância no storage
      const uazapiInstance = await storage.getUazapiInstance(normalizedInstanceNumber);
      
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

      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

      // Validação
      if (!normalizedInstanceNumber || !number || !text || !id) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, number, text (emoji), id (messageId)" 
        });
      }

      // Buscar token da instância
      const uazapiInstance = await storage.getUazapiInstance(normalizedInstanceNumber);
      
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

      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

      // Validação
      if (!normalizedInstanceNumber || !id) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, id (messageId)" 
        });
      }

      // Buscar token da instância
      const uazapiInstance = await storage.getUazapiInstance(normalizedInstanceNumber);
      
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
      if (!recipientNumber || !text) {
        return res.status(400).json({
          error: "Campos obrigatórios faltando: instanceNumber, recipientNumber, text"
        });
      }

      const { normalizedNumber, ownerNumber, instance } = await resolveInstanceIdentifier(instanceNumber);

      console.log("📨 send-message payload", {
        rawInstanceNumber: instanceNumber,
        normalizedInstanceNumber: normalizedNumber,
        instanceId: instance?.id,
        ownerJid: instance?.ownerJid,
        connectionStatus: instance?.connectionStatus,
        recipientNumber,
      });

      if (!instance) {
        return res.status(404).json({
          error: "Instância não encontrada no Evolution Database com o identificador fornecido"
        });
      }

      if (!normalizedNumber) {
        return res.status(400).json({
          error: "Não foi possível determinar o número da instância. Execute a sincronização ou atualize os dados da instância."
        });
      }

      // Validar formato do número da instância (55 + DDD + número)
      const brazilNumberPattern = /^55\d{10,11}$/;
      if (!brazilNumberPattern.test(normalizedNumber)) {
        return res.status(400).json({
          error: "Número da instância deve estar no formato brasileiro: 55 + DDD + número (ex: 5511999999999)"
        });
      }

      // Validar formato do número do destinatário (pode ser brasileiro ou internacional)
      const recipientNumberPattern = /^\d{8,15}$/;
      if (!recipientNumberPattern.test(recipientNumber)) {
        return res.status(400).json({
          error: "Número do destinatário inválido. Deve conter apenas dígitos (ex: 5511999999999)"
        });
      }

      // Verificar se a instância tem status válido
      // Evolution API pode enviar mesmo com status "close" (desconectado)
      // Validamos apenas se o campo existe
      if (!instance.connectionStatus) {
        return res.status(400).json({
          error: "Instância sem status de conexão registrado"
        });
      }

      console.log(`✅ Instância ${normalizedNumber} com status: ${instance.connectionStatus}. Prosseguindo com envio...`);

      // 🚀 OTIMIZAÇÃO #2: Envio assíncrono (não espera resposta da API)
      // Retorna resposta ao cliente imediatamente, envia em background
      // Economiza 200-300ms de latência (tempo de resposta da Evolution/UazAPI)

      // Retornar resposta ao cliente IMEDIATAMENTE
      res.json({
        success: true,
        message: "Mensagem sendo processada",
        messageId: `pending-${Date.now()}`,
        status: "pending"
      });

      // Enviar mensagem em background (NÃO espera)
      unifiedSender.sendMessage({
        instanceNumber: normalizedNumber,
        instanceRemoteJid: ownerNumber || normalizedNumber || undefined,
        recipientNumber,
        content: text,
      }).then(result => {
        if (result.success) {
          console.log(`✅ Mensagem enviada com sucesso via ${result.api} (${result.latency}ms)`);
        } else {
          console.error(`❌ Erro ao enviar mensagem: ${result.error}`);
        }
      }).catch(error => {
        console.error(`❌ Erro crítico ao enviar mensagem em background:`, error);
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Erro ao enviar mensagem" });
    }
  });

  // Send audio message
  app.post("/api/whatsapp/send-audio", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, recipientNumber, audio, waveformData, duration } = req.body;

      // Validação de campos obrigatórios
      if (!recipientNumber || !audio) {
        return res.status(400).json({
          error: "Campos obrigatórios faltando: instanceNumber, recipientNumber, audio"
        });
      }

      const { normalizedNumber, ownerNumber, instance } = await resolveInstanceIdentifier(instanceNumber);

      console.log("🎵 send-audio payload", {
        rawInstanceNumber: instanceNumber,
        normalizedInstanceNumber: normalizedNumber,
        instanceId: instance?.id,
        recipientNumber,
        audioSize: audio.length,
        duration,
      });

      if (!instance) {
        return res.status(404).json({
          error: "Instância não encontrada no Evolution Database com o identificador fornecido"
        });
      }

      if (!normalizedNumber) {
        return res.status(400).json({
          error: "Não foi possível determinar o número da instância. Execute a sincronização ou atualize os dados da instância."
        });
      }

      // Validar formato do número da instância (55 + DDD + número)
      const brazilNumberPattern = /^55\d{10,11}$/;
      if (!brazilNumberPattern.test(normalizedNumber)) {
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

      // Verificar se a instância tem status válido
      // Evolution API pode enviar mesmo com status "close" (desconectado)
      // Validamos apenas se o campo existe
      if (!instance.connectionStatus) {
        return res.status(400).json({
          error: "Instância sem status de conexão registrado"
        });
      }

      console.log(`✅ Instância ${normalizedNumber} com status: ${instance.connectionStatus}. Prosseguindo com envio de áudio...`);

      // Usar UnifiedSender para enviar áudio com fallback automático
      const result = await unifiedSender.sendMedia({
        instanceNumber: normalizedNumber,
        recipientNumber,
        file: audio,
        type: "audio",
      });

      if (!result.success) {
        console.error("Failed to send audio:", result.error);
        return res.status(400).json({
          error: result.error || "Erro ao enviar áudio"
        });
      }

      res.json({
        success: true,
        message: "Áudio enviado com sucesso",
        api: result.api,
        note: result.note,
        data: result
      });
    } catch (error: any) {
      console.error("Error sending audio:", error);
      res.status(500).json({ error: "Erro ao enviar áudio" });
    }
  });


  // Send media (image, video, audio, document) via Uazapi
  app.post("/api/whatsapp/send-media", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, recipientNumber, type, file, text, docName } = req.body;

      // Validação de campos obrigatórios
      if (!recipientNumber || !type || !file) {
        return res.status(400).json({ 
          error: "Campos obrigatórios faltando: instanceNumber, recipientNumber, type, file" 
        });
      }

      // Validar tipo de mídia
      const validTypes = ["image", "video", "document", "audio", "myaudio", "ptt", "sticker"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          error: "Tipo de mídia inválido. Use: " + validTypes.join(", ")
        });
      }

      const { normalizedNumber, instance } = await resolveInstanceIdentifier(instanceNumber);

      if (!instance) {
        return res.status(404).json({ 
          error: "Instância não encontrada no Evolution Database com o identificador fornecido" 
        });
      }

      if (!normalizedNumber) {
        return res.status(400).json({ 
          error: "Não foi possível determinar o número da instância. Execute a sincronização ou atualize os dados da instância." 
        });
      }

      // Validar formato brasileiro do número da instância (55 + 10-11 dígitos)
      const brazilNumberPattern = /^55\d{10,11}$/;
      if (!brazilNumberPattern.test(normalizedNumber)) {
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
      const uazapiInstance = await storage.getUazapiInstance(normalizedNumber);
      if (!uazapiInstance) {
        return res.status(404).json({ 
          error: "Instância não cadastrada no Uazapi. Configure o token nas configurações." 
        });
      }

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
        console.error("Uazapi media send error:", data);
        return res.status(response.status).json({ 
          error: "Erro ao enviar mídia",
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

      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

      // Validação
      if (!normalizedInstanceNumber || !number || !presence) {
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
      const uazapiInstance = await storage.getUazapiInstance(normalizedInstanceNumber);
      
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

      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

      // Validação
      if (!normalizedInstanceNumber || !number || typeof archive !== "boolean") {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, number, archive (boolean)" 
        });
      }

      // Buscar token da instância
      const uazapiInstance = await storage.getUazapiInstance(normalizedInstanceNumber);
      
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

      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

      // Validação
      if (!normalizedInstanceNumber || !number || typeof pin !== "boolean") {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, number, pin (boolean)" 
        });
      }

      // Buscar token da instância
      const uazapiInstance = await storage.getUazapiInstance(normalizedInstanceNumber);
      
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

      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

      // Validação
      if (!normalizedInstanceNumber || !number || typeof read !== "boolean") {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, number, read (boolean)" 
        });
      }

      // Buscar token da instância
      const uazapiInstance = await storage.getUazapiInstance(normalizedInstanceNumber);
      
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

      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

      // Validação
      if (!normalizedInstanceNumber || !numbers || !Array.isArray(numbers)) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: instanceNumber, numbers (array)" 
        });
      }

      // Buscar token da instância
      const uazapiInstance = await storage.getUazapiInstance(normalizedInstanceNumber);
      
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
      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

      // Validação
      if (!normalizedInstanceNumber) {
        return res.status(400).json({ 
          error: "Número da instância obrigatório" 
        });
      }

      // Buscar token da instância
      const uazapiInstance = await storage.getUazapiInstance(normalizedInstanceNumber);
      
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
      const normalizedNumber = (number || "").replace(/\D/g, "");
      if (!normalizedNumber) {
        return res.status(400).json({ error: "Número da instância não pode ser vazio" });
      }

      const record = await getUazapiTokenByInstanceNumber(normalizedNumber);
      
      if (!record) {
        return res.status(404).json({ error: "Instância não encontrada no Evolution" });
      }
      
      // Retornar sem expor o token completo (apenas indicar se existe)
      res.json({ 
        instanceNumber: record.instanceNumber,
        instanceId: record.instanceId,
        hasToken: !!record.apiToken,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      });
    } catch (error: any) {
      console.error("Error fetching uazapi instance:", error);
      res.status(500).json({ error: "Erro ao buscar instância" });
    }
  });

  // Create or update token for instance
  app.post("/api/uazapi/instances", authMiddleware, async (req, res) => {
    try {
      const payloadSchema = z.object({
        instanceNumber: z.string().min(3, "instanceNumber é obrigatório"),
        apiToken: z.string().min(1, "apiToken é obrigatório"),
      });
      const data = payloadSchema.parse(req.body);

      // Validação 1: Verificar se instanceNumber é válido (não vazio)
      const normalizedInstanceNumber = data.instanceNumber.replace(/\D/g, "");
      if (!normalizedInstanceNumber) {
        return res.status(400).json({ error: "Número da instância não pode ser vazio" });
      }

      // Validação 2: Verificar se a instância existe no Evolution DB
      const { evolutionPool } = await import("./evolution-db");
      const evolutionInstance = await evolutionPool.query(`
        SELECT
          id,
          COALESCE(
            NULLIF(number, ''),
            NULLIF(regexp_replace("ownerJid", '@.*$', ''), ''),
            NULLIF(regexp_replace(regexp_replace(id, '@.*$', ''), '\\D', '', 'g'), ''),
            NULLIF(regexp_replace(name, '\\D', '', 'g'), '')
          ) AS number,
          name,
          "connectionStatus"
        FROM "Instance"
        WHERE number = $1
           OR regexp_replace("ownerJid", '@.*$', '') = $1
           OR regexp_replace(regexp_replace(id, '@.*$', ''), '\\D', '', 'g') = $1
           OR regexp_replace(name, '\\D', '', 'g') = $1
        LIMIT 1
      `, [normalizedInstanceNumber]);

      if (evolutionInstance.rows.length === 0) {
        return res.status(404).json({
          error: `Instância ${normalizedInstanceNumber} não encontrada no Evolution. Verifique o número e tente novamente.`
        });
      }

      const existing = await storage.getUazapiInstance(normalizedInstanceNumber);

      if (existing) {
        await storage.updateUazapiInstance(normalizedInstanceNumber, { apiToken: data.apiToken });
      } else {
        await storage.createUazapiInstance({
          instanceNumber: normalizedInstanceNumber,
          apiToken: data.apiToken,
        });
      }

      const record = await getUazapiTokenByInstanceNumber(normalizedInstanceNumber);

      res.json({
        instanceNumber: normalizedInstanceNumber,
        instanceId: record?.instanceId ?? null,
        hasToken: true,
        createdAt: record?.createdAt ?? new Date().toISOString(),
        updatedAt: record?.updatedAt ?? new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error saving uazapi instance:", error);
      res.status(400).json({ error: error.message || "Erro ao salvar token" });
    }
  });

  // Delete token for instance
  app.delete("/api/uazapi/instances/:number", authMiddleware, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      const { number } = req.params;
      const normalizedNumber = (number || "").replace(/\D/g, "");
      
      if (!normalizedNumber) {
        return res.status(400).json({ error: "Número da instância não pode ser vazio" });
      }

      const deleted = await storage.deleteUazapiInstance(normalizedNumber);
      
      if (!deleted) {
        return res.status(404).json({ error: "Instância não encontrada" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting uazapi instance:", error);
      res.status(500).json({ error: "Erro ao deletar token" });
    }
  });

  // ============ SEND API CONFIGURATION ============

  // Get send API config for instance
  app.get("/api/send-config/:instanceNumber", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber } = req.params;
      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

      if (!normalizedInstanceNumber) {
        return res.status(400).json({ error: "Número da instância não pode ser vazio" });
      }

      const sendConfig = await unifiedSender.getSendConfig(normalizedInstanceNumber);

      res.json({
        instanceNumber: normalizedInstanceNumber,
        sendAPI: sendConfig,
      });
    } catch (error: any) {
      console.error("Error getting send config:", error);
      res.status(500).json({ error: "Erro ao obter configuração de envio" });
    }
  });

  // Update send API config for instance
  app.put("/api/send-config/:instanceNumber", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber } = req.params;
      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");
      const { sendAPI } = req.body;

      // Validar sendAPI
      if (!['evolution', 'uazapi'].includes(sendAPI)) {
        return res.status(400).json({ error: "sendAPI deve ser 'evolution' ou 'uazapi'" });
      }

      if (!normalizedInstanceNumber) {
        return res.status(400).json({ error: "Número da instância não pode ser vazio" });
      }

      await unifiedSender.setSendConfig(normalizedInstanceNumber, sendAPI);

      res.json({
        instanceNumber: normalizedInstanceNumber,
        sendAPI,
        message: "Configuração de envio atualizada com sucesso",
      });
    } catch (error: any) {
      console.error("Error updating send config:", error);
      res.status(500).json({ error: "Erro ao atualizar configuração de envio" });
    }
  });

  // ============ SYNC UAZAPI INSTANCE DATA ============
  // Sync instance_number from Evolution DB to Supabase uazapi_instances
  app.post("/api/sync/uazapi-instances", authMiddleware, async (req, res) => {
    try {
      console.log("🔄 Iniciando sincronização de instâncias Uazapi...");

      const { evolutionPool } = await import("./evolution-db");

      // Get all instances from Evolution DB (apenas com número válido)
      const instancesResult = await evolutionPool.query(`
        SELECT id, number, name, "connectionStatus"
        FROM "Instance"
        WHERE number IS NOT NULL AND number != ''
        ORDER BY number
      `);

      const instances = instancesResult.rows;
      console.log(`📊 Encontradas ${instances.length} instâncias válidas no Evolution DB`);

      let synced = 0;
      let errors = 0;

      // Sync each instance to Supabase
      for (const instance of instances) {
        try {
          const { error } = await supabase
            .from("uazapi_instances")
            .upsert(
              {
                instance_id: instance.id,
                instance_number: instance.number || null, // Handle null gracefully
                send_api: "evolution", // Default
                updated_at: new Date().toISOString(),
              },
              { onConflict: "instance_id" }
            );

          if (error) {
            console.warn(`⚠️  Erro ao sincronizar ${instance.number}: ${error.message}`);
            errors++;
          } else {
            console.log(`✅ Sincronizado: ${instance.number} (${instance.id})`);
            synced++;
          }
        } catch (err: any) {
          console.error(`❌ Erro crítico ao sincronizar ${instance.number}:`, err.message);
          errors++;
        }
      }

      res.json({
        message: "Sincronização concluída",
        total: instances.length,
        synced,
        errors,
        instances: instances.map((i) => ({
          id: i.id,
          number: i.number,
          name: i.name,
          status: i.connectionStatus,
        })),
      });
    } catch (error: any) {
      console.error("Error syncing uazapi instances:", error);
      res.status(500).json({ error: error.message || "Erro ao sincronizar instâncias" });
    }
  });

  // Test send with both APIs
  app.post("/api/whatsapp/test-send", authMiddleware, async (req, res) => {
    try {
      const { instanceNumber, recipientNumber, message = "Teste de envio" } = req.body;

      const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

      if (!normalizedInstanceNumber || !recipientNumber) {
        return res.status(400).json({ error: "instanceNumber e recipientNumber são obrigatórios" });
      }

      console.log(`🧪 Testando envio para ${recipientNumber} da instância ${normalizedInstanceNumber}`);

      const testResult = await unifiedSender.testSend(normalizedInstanceNumber, recipientNumber, message);

      res.json({
        instanceNumber: normalizedInstanceNumber,
        recipientNumber,
        ...testResult,
      });
    } catch (error: any) {
      console.error("Error testing send:", error);
      res.status(500).json({ error: error.message || "Erro ao testar envio" });
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

      // Extrair dados da mensagem
      const messageData = payload.data;
      const fromMe = messageData?.key?.fromMe || false;
      const instanceId = payload.instanceNumber || payload.instance;

      // Se for mensagem nossa (fromMe), aplicar configuração de bot
      let finalMessage = messageData;
      if (fromMe && instanceId) {
        const botConfig = await getBotConfig(instanceId);
        if (botConfig?.has_bot_enabled && botConfig?.use_prefix_for_consultant && botConfig?.consultant_name) {
          finalMessage = {
            ...messageData,
            pushName: botConfig.consultant_name,
          };
        }
      }

      // Broadcast para todos os clientes WebSocket conectados
      broadcast({
        type: "whatsapp_message_received",
        data: {
          instance: payload.instance,
          instanceNumber: payload.instanceNumber,
          remoteJid: payload.data?.key?.remoteJid,
          message: finalMessage,
          timestamp: payload.data?.messageTimestamp || Date.now(),
        }
      });

      res.status(200).json({ success: true, message: "Webhook processed" });
    } catch (error: any) {
      console.error("Error processing Evolution webhook:", error);
      res.status(500).json({ error: "Erro ao processar webhook" });
    }
  });

  // Register bot configuration routes
  registerBotConfigRoutes(app);

  // Register IA configuration routes
  registerIAConfigRoutes(app);

  // Register AI Data routes (para tabela ai_data)
  registerAIDataRoutes(app);

  return httpServer;
}
