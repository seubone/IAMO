import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { dbStorage as storage } from "./config/db-storage";
import { authMiddleware, generateToken, type AuthRequest } from "./middleware/auth";
import { requirePermission, requireRole } from "./middleware/rbac";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { insertUserSchema, insertTicketSchema, insertActionSchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { supabase } from "./config/supabase";
import { getUazapiTokenByInstanceNumber } from "./services/uazapi-supabase";
import { unifiedSender } from "./utils/send-strategy";
import { evolutionPool } from "./config/evolution-db";
import {
  fetchInstances as fetchEvolutionInstances,
  isEvolutionApiConfigured,
  type EvolutionInstance
} from "./services/evolution-instances";
import { registerBotConfigRoutes } from "./routes/bot-config.routes";
import { registerIAConfigRoutes } from "./routes/ia-config.routes";
import { registerAIDataRoutes } from "./routes/ai-data.routes";
import { registerInstanceRoutes } from "./routes/instances.routes";
import instanceWorkflowsRouter from "./routes/instance-workflows.routes";
import instanceBotStatusRouter from "./routes/instance-bot-status.routes";

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

    const { evolutionPool } = await import("./config/evolution-db");
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
  async function getBotConfig(instanceIdOrNumber: string) {
    try {
      // Tentar buscar primeiro pelo instance_id (UUID), depois por instance_number (número WhatsApp)
      const { data: botConfig, error } = await supabase
        .from('bot_instances')
        .select('has_bot_enabled, consultant_name, bot_name, use_prefix_for_consultant, use_prefix_for_bot, message_prefix_template')
        .or(`instance_id.eq.${instanceIdOrNumber},instance_number.eq.${instanceIdOrNumber}`)
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

  type SenderType = 'consultant' | 'bot';

  function extractPrimaryMessageText(message: any): string {
    if (!message) return '';
    if (typeof message === 'string') {
      return message;
    }

    const candidates = [
      message?.conversation,
      message?.extendedTextMessage?.text,
      message?.editedMessage?.message?.conversation,
      message?.editedMessage?.message?.extendedTextMessage?.text,
      message?.imageMessage?.caption,
      message?.videoMessage?.caption,
      message?.documentMessage?.caption,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }

    return '';
  }

  function resolveSenderIdentity(options: {
    messageText?: string | null;
    pushName?: string | null;
    botConfig: any;
  }): { pushName?: string | null; senderType?: SenderType } {
    const { messageText, pushName, botConfig } = options;

    if (!botConfig || !botConfig.has_bot_enabled) {
      return { pushName };
    }

    const template: string = botConfig.message_prefix_template || '*{name}:*\n';
    const consultantName: string | null =
      typeof botConfig.consultant_name === 'string' ? botConfig.consultant_name.trim() : null;
    const botName: string | null =
      typeof botConfig.bot_name === 'string' ? botConfig.bot_name.trim() : null;

    const messageBody = (messageText ?? '').trimStart();

    const matchesTemplate = (name: string | null | undefined): boolean => {
      if (!name) return false;
      const prefix = template.replace('{name}', name);
      return messageBody.startsWith(prefix);
    };

    if (matchesTemplate(consultantName)) {
      return { pushName: consultantName, senderType: 'consultant' };
    }

    if (matchesTemplate(botName)) {
      return { pushName: botName, senderType: 'bot' };
    }

    const normalizedPush = (pushName ?? '').trim();

    if (consultantName && normalizedPush === consultantName) {
      return { pushName: consultantName, senderType: 'consultant' };
    }

    if (botName && normalizedPush === botName) {
      return { pushName: botName, senderType: 'bot' };
    }

    return { pushName };
  }

  // Polling loop to check for new messages in Evolution DB - otimizado
  async function pollNewMessages() {
    // Skip se não há instâncias sendo monitoradas
    if (activeInstances.size === 0) return;

    try {
      const { evolutionPool } = await import("./config/evolution-db");
      
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
              message,
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
              let finalPushName = row.pushName;
              const finalMessage = row.message_text;
              let senderType: SenderType | undefined;

              if (row.fromMe) {
                const botConfig = await getBotConfig(instanceId);
                if (botConfig) {
                  const identity = resolveSenderIdentity({
                    messageText: extractPrimaryMessageText(row.message),
                    pushName: row.pushName,
                    botConfig,
                  });

                  if (identity.pushName) {
                    finalPushName = identity.pushName;
                  }
                  senderType = identity.senderType;
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
                  message: finalMessage,
                  senderType,
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

  // CRITICAL FIX: Re-enabled server-side polling for real-time updates
  // Why: WebSocket alone is not reliable enough for instant message updates
  // - Server polling ensures messages are caught even if WebSocket fails
  // - Poll interval: 2000ms (2s) for near-instant updates
  // - Deduplication by timestamp prevents duplicate messages
  // - This is essential for user experience
  //
  // The server polls only active instances (those with connected clients)
  // so the performance impact is minimal
  // Self-rescheduling polling to prevent queue buildup
  // If polling takes longer than 2s, intervals don't queue up
  async function scheduleNextPoll() {
    try {
      await pollNewMessages();
    } catch (error) {
      // Silently catch polling errors to prevent crashing
      // Errors are already logged inside pollNewMessages
    } finally {
      // Schedule next poll regardless of success/failure
      setTimeout(scheduleNextPoll, 2000);
    }
  }

  // Start polling
  scheduleNextPoll();
  console.log("📱 ✅ Server-side polling enabled (2s interval) for real-time message updates");

  // ============ INSTANCE POLLING ============
  // Poll for instance changes and broadcast to clients
  // This ensures new instances are visible to all connected clients
  let lastInstancePollTime = 0;
  let cachedInstanceCount = 0;

  async function pollInstanceChanges() {
    try {
      const { data, error } = await supabase
        .from("Instance")
        .select("id, name, connectionStatus, createdAt")
        .order("createdAt", { ascending: false })
        .limit(1000);

      if (error) {
        console.warn("⚠️ Instance polling error:", error.message);
        return;
      }

      const currentInstanceCount = data?.length || 0;

      // If instance count changed, broadcast to all connected clients
      if (currentInstanceCount !== cachedInstanceCount) {
        console.log(
          `🔄 Instance count changed: ${cachedInstanceCount} → ${currentInstanceCount}`
        );
        cachedInstanceCount = currentInstanceCount;

        // Broadcast invalidation to all WebSocket clients
        wsClients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(
              JSON.stringify({
                type: "instances_changed",
                data: {
                  count: currentInstanceCount,
                  timestamp: Date.now(),
                },
              })
            );
          }
        });
      }

      lastInstancePollTime = Date.now();
    } catch (error: any) {
      console.warn("❌ Instance polling exception:", error.message);
    }
  }

  // Self-rescheduling instance polling (every 30 seconds)
  async function scheduleInstancePoll() {
    try {
      await pollInstanceChanges();
    } catch (error) {
      // Error already logged in pollInstanceChanges
    } finally {
      setTimeout(scheduleInstancePoll, 30000); // 30 seconds
    }
  }

  scheduleInstancePoll();
  console.log("🔄 ✅ Instance polling enabled (30s interval) for automatic reload");

  // ============ PUBLIC CONFIG ROUTES ============

  // Expose public configuration (Supabase credentials for client)
  app.get("/api/config/public", (_req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    });
  });

  // Get Evolution Database Configuration
  app.get("/api/config/evolution-db", authMiddleware, requireRole("admin"), (_req, res) => {
    res.json({
      host: process.env.EVOLUTION_DB_HOST || "",
      port: process.env.EVOLUTION_DB_PORT || "5432",
      name: process.env.EVOLUTION_DB_NAME || "",
      user: process.env.EVOLUTION_DB_USER || "postgres",
      password: process.env.EVOLUTION_DB_PASSWORD || "",
    });
  });

  // Update Evolution Database Configuration
  app.post("/api/config/evolution-db", authMiddleware, requireRole("admin"), async (req, res) => {
    try {
      const { host, port, name, user, password } = req.body;

      // Validate required fields
      if (!host || !port || !name || !user || !password) {
        return res.status(400).json({
          error: "Todos os campos são obrigatórios (host, port, name, user, password)"
        });
      }

      // Update environment variables (in-memory)
      process.env.EVOLUTION_DB_HOST = host;
      process.env.EVOLUTION_DB_PORT = port;
      process.env.EVOLUTION_DB_NAME = name;
      process.env.EVOLUTION_DB_USER = user;
      process.env.EVOLUTION_DB_PASSWORD = password;

      // Update .env file
      const fs = await import("fs");
      const path = await import("path");
      const envPath = path.join(process.cwd(), ".env");

      let envContent = fs.readFileSync(envPath, "utf-8");

      // Update or add each variable
      const updateEnvVar = (content: string, key: string, value: string) => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${value}`);
        } else {
          return content + `\n${key}=${value}`;
        }
      };

      envContent = updateEnvVar(envContent, "EVOLUTION_DB_HOST", host);
      envContent = updateEnvVar(envContent, "EVOLUTION_DB_PORT", port);
      envContent = updateEnvVar(envContent, "EVOLUTION_DB_NAME", name);
      envContent = updateEnvVar(envContent, "EVOLUTION_DB_USER", user);
      envContent = updateEnvVar(envContent, "EVOLUTION_DB_PASSWORD", password);

      fs.writeFileSync(envPath, envContent, "utf-8");

      // Try to reconnect to the database with new credentials
      const connectionString = `postgresql://${user}:${password}@${host}:${port}/${name}`;
      console.log("🔄 Tentando reconectar ao banco Evolution com novas credenciais...");

      try {
        const testPool = require("pg").Pool;
        const pool = new testPool({ connectionString, connectionTimeoutMillis: 5000 });
        await pool.query("SELECT 1");
        await pool.end();
        console.log("✅ Conexão com banco Evolution bem-sucedida!");
      } catch (dbError: any) {
        console.error("❌ Erro ao conectar com novo banco:", dbError.message);
        return res.status(400).json({
          error: `Não foi possível conectar ao banco com as credenciais fornecidas: ${dbError.message}`
        });
      }

      res.json({
        success: true,
        message: "Configurações do Evolution DB atualizadas com sucesso!",
        config: { host, port, name, user },
      });
    } catch (error: any) {
      console.error("Erro ao atualizar configurações:", error);
      res.status(500).json({
        error: "Erro ao atualizar configurações do Evolution DB",
        details: error.message
      });
    }
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

      // Create user in local DB for role management (optional - will be created on first login if not exists)
      try {
        const existingLocalUser = await storage.getUserByEmail(email);
        if (!existingLocalUser) {
          await storage.createUser({
            id: authData.user.id,
            name,
            email,
            password: "", // Don't store password locally - use Supabase
            role: "viewer", // Default role
          });
        }
      } catch (dbError) {
        // Log but don't fail registration if local DB is not available
        console.warn("⚠️ Could not create user in local DB (will be created on first login):", dbError);
      }

      // Return success message - user needs to confirm email
      res.status(201).json({
        success: true,
        message: "Usuário registrado com sucesso! Verifique seu email para confirmar o cadastro.",
        user: {
          id: authData.user.id,
          name: authData.user.user_metadata?.name || name,
          email: authData.user.email,
          role: "viewer", // Default role
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
        // Supabase auth successful - return user data directly from Supabase
        const supabaseUser = sessionData.session.user;
        return res.json({
          user: {
            id: supabaseUser.id,
            name: supabaseUser.user_metadata?.name || email.split("@")[0],
            email: supabaseUser.email,
            role: "viewer", // Default role (can be updated later when local DB is available)
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

  // Google OAuth callback (receives access token from Supabase OAuth flow)
  app.post("/api/auth/google-callback", async (req, res) => {
    try {
      const { accessToken, email, name } = req.body;

      if (!accessToken || !email) {
        return res.status(400).json({ error: "Token e email são obrigatórios" });
      }

      // User already exists in Supabase (from OAuth flow)
      // Sync or create user in local DB
      let localUser = await storage.getUserByEmail(email);
      if (!localUser) {
        // Create new user in local DB with data from Google
        localUser = await storage.createUser({
          id: `google_${email.replace(/[@.]/g, "_")}`, // Generate unique ID from email
          name: name || email.split("@")[0],
          email,
          password: "", // No password for OAuth users
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
        token: accessToken,
        success: true,
      });
    } catch (error: any) {
      console.error("Google callback error:", error);
      res.status(400).json({ error: error.message || "Erro ao processar callback do Google" });
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

      // Update profile in Supabase user_profiles_simonia table
      const { error: dbError } = await supabase
        .from('user_profiles_simonia')
        .upsert({
          user_id: req.user!.id,
          name: name.trim(),
          avatar_url: avatar || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (dbError) {
        console.error("❌ Error updating profile:", dbError.message);
        return res.status(400).json({ error: `Erro ao atualizar perfil: ${dbError.message}` });
      }

      res.json({
        id: req.user!.id,
        name: name.trim(),
        email: req.user!.email,
        role: req.user!.role,
        avatar: avatar || null,
        preferences: preferences || {},
      });
    } catch (error: any) {
      console.error("Error in profile update:", error);
      res.status(400).json({ error: error.message || "Erro ao atualizar perfil" });
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

  

  // ============ TICKET ROUTES ============
  
  // Get all tickets
  app.get("/api/tickets", authMiddleware, requirePermission("tickets:read"), async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.json(tickets);
    } catch (error: any) {
      console.error("Error fetching tickets:", error);
      // Return empty array if local database is unavailable
      res.json([]);
    }
  });

  // Get tickets by IA
  app.get("/api/tickets/ia/:iaId", authMiddleware, requirePermission("tickets:read"), async (req, res) => {
    try {
      const tickets = await storage.getTicketsByIA(req.params.iaId);
      res.json(tickets);
    } catch (error: any) {
      console.error("Error fetching tickets:", error);
      // Return empty array if local database is unavailable
      res.json([]);
    }
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
    try {
      const actions = await storage.getAllActions();
      res.json(actions);
    } catch (error: any) {
      console.error("Error fetching actions:", error);
      // Return empty array if local database is unavailable
      res.json([]);
    }
  });

  // Get actions by IA
  app.get("/api/actions/ia/:iaId", authMiddleware, requirePermission("actions:read"), async (req, res) => {
    try {
      const actions = await storage.getActionsByIA(req.params.iaId);
      res.json(actions);
    } catch (error: any) {
      console.error("Error fetching actions:", error);
      // Return empty array if local database is unavailable
      res.json([]);
    }
  });

  // ============ CONVERSATION ROUTES ============
  
  // Get all conversations
  app.get("/api/conversations", authMiddleware, requirePermission("conversations:read"), async (req, res) => {
    try {
      const conversations = await storage.getAllConversations();
      res.json(conversations);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      // Return empty array if local database is unavailable
      res.json([]);
    }
  });

  // Get conversation by attendance ID
  app.get("/api/conversations/attendance/:attendanceId", authMiddleware, requirePermission("conversations:read"), async (req, res) => {
    try {
      const conversation = await storage.getConversationByAttendanceId(req.params.attendanceId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversa não encontrada" });
      }
      res.json(conversation);
    } catch (error: any) {
      console.error("Error fetching conversation:", error);
      // Return 404 if local database is unavailable
      res.status(404).json({ error: "Conversa não encontrada" });
    }
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
  
  // Get all instances (numeros/contas do WhatsApp)
  app.get("/api/whatsapp/instances", authMiddleware, async (req, res) => {
    try {
      const { getInstances, getCacheStatus } = await import("./services/instances-cache");

      console.log("[instances] Fetching WhatsApp instances", {
        user: (req as any).user?.email,
        authenticated: !!(req as any).user,
      });

      // Get instances using optimized cache service
      const instances = await getInstances();
      const cacheStatus = getCacheStatus();

      console.log("[instances] Instances fetched successfully", {
        count: instances.length,
        cacheStatus,
      });

      // Add cache headers
      res.set("X-Cache-Status", cacheStatus.isValid ? "HIT" : "MISS");
      res.set("X-Cache-Age", cacheStatus.age?.toString() || "0");
      res.set("X-Cache-Source", cacheStatus.source || "unknown");

      return res.json(instances);
    } catch (error: any) {
      console.error("[instances] Failed to fetch instances:", {
        message: error.message,
        stack: error.stack,
      });

      return res.status(503).json({
        error: "Serviço temporariamente indisponível",
        details: error.message || "Não foi possível buscar instâncias",
      });
    }
  });
  // Get chats for a specific instance
  app.get("/api/whatsapp/instances/:instanceId/chats", authMiddleware, async (req, res) => {
    try {
      const { instanceId } = req.params;

      // CRITICAL FIX: Add validation logs to debug chat loading issues
      console.log(`💬 Fetching chats:`, {
        instanceId: instanceId || "❌ UNDEFINED",
        timestamp: new Date().toISOString()
      });

      // Validate required parameter
      if (!instanceId) {
        console.warn(`⚠️ Missing required parameter: instanceId`);
        return res.status(400).json({
          error: "Missing required parameter: instanceId",
          details: { instanceId }
        });
      }

      // Get all instance IDs that share the same WhatsApp number (ownerJid)
      // This enables cross-instance chat synchronization
      const relatedInstanceIds = await getRelatedInstanceIds(instanceId);

      console.log(`🔍 Related instances found:`, {
        original: instanceId,
        related: relatedInstanceIds,
        count: relatedInstanceIds.length
      });

      if (relatedInstanceIds.length === 0) {
        console.warn(`⚠️ No instance found with id: ${instanceId}`);
        return res.status(404).json({
          error: "Instance not found",
          details: { instanceId }
        });
      }

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

      console.log(`✅ Chats found:`, {
        count: result.rows.length,
        instanceIds: relatedInstanceIds
      });

      res.json(result.rows);
    } catch (error: any) {
      // CRITICAL FIX: Return proper error response instead of silent failure
      console.error("❌ Error fetching chats:", {
        error: error.message,
        code: error.code,
        detail: error.detail,
        instanceId: req.params.instanceId,
        stack: error.stack
      });

      res.status(500).json({
        error: "Failed to fetch chats",
        message: error.message,
        code: error.code,
        // Only in development - hide details in production
        ...(process.env.NODE_ENV === 'development' && {
          detail: error.detail,
          instanceId: req.params.instanceId
        })
      });
    }
  });

  // Get unread count for a specific chat (for polling after mark-read)
  app.get("/api/whatsapp/instances/:instanceId/chats/:remoteJid/unread-count", authMiddleware, async (req, res) => {
    try {
      const { instanceId, remoteJid } = req.params;
      const { evolutionPool } = await import("./config/evolution-db");
      
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
      // Return 0 instead of 500 error - Evolution DB may be temporarily unavailable
      res.json({ unreadMessages: 0 });
    }
  });

  // Get decrypted media (stickers, images, documents)
  app.get("/api/whatsapp/media/decrypt/:messageId", authMiddleware, async (req, res) => {
    try {
      const { messageId } = req.params;
      const { evolutionPool } = await import("./config/evolution-db");
      const { decryptWhatsAppMedia, bufferToDataUrl, MediaExpiredError } = await import("./services/whatsapp-media-decrypt");

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
      const { MediaExpiredError } = await import("./services/whatsapp-media-decrypt");

      // Tratar erro de mídia expirada (410 Gone ou 403 Forbidden)
      if (error instanceof MediaExpiredError || error.name === 'MediaExpiredError' || (error.message && error.message.includes('403')) ) {
        console.warn(`⏰ Mídia expirada ou inacessível para messageId ${req.params.messageId}`);
        console.warn(`   Razão: ${error.message}`);
        return res.status(410).json({
          error: "Mídia expirada ou inacessível",
          message: "Esta mídia não está mais disponível. As URLs do WhatsApp expiram ou o acesso foi negado.",
          expired: true,
          type: "MEDIA_EXPIRED_OR_FORBIDDEN"
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

      // CRITICAL FIX: Add validation logs to debug "mariaianova" issue
      console.log(`📨 Fetching messages:`, {
        instanceId: instanceId || "❌ UNDEFINED",
        remoteJid: remoteJid || "❌ UNDEFINED",
        limit,
        offset,
        timestamp: new Date().toISOString()
      });

      // Validate required parameters
      if (!instanceId || !remoteJid) {
        console.warn(`⚠️ Missing required parameters - instanceId: ${instanceId}, remoteJid: ${remoteJid}`);
        return res.status(400).json({
          error: "Missing required parameters: instanceId and remoteJid",
          details: { instanceId, remoteJid }
        });
      }

      // Get all instance IDs that share the same WhatsApp number (ownerJid)
      // This enables cross-instance message synchronization
      const relatedInstanceIds = await getRelatedInstanceIds(instanceId);

      console.log(`🔍 Related instances found:`, {
        original: instanceId,
        related: relatedInstanceIds,
        count: relatedInstanceIds.length
      });

      if (relatedInstanceIds.length === 0) {
        console.warn(`⚠️ No instance found with id: ${instanceId}`);
        return res.status(404).json({
          error: "Instance not found",
          details: { instanceId }
        });
      }

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

      console.log(`✅ Messages found:`, {
        remoteJid,
        count: result.rows.length,
        instanceIds: relatedInstanceIds,
        limit,
        offset
      });

      res.json(result.rows);
    } catch (error: any) {
      // CRITICAL FIX: Return proper error response instead of silent failure
      console.error("❌ Error fetching messages:", {
        error: error.message,
        code: error.code,
        detail: error.detail,
        instanceId: req.params.instanceId,
        remoteJid: req.params.remoteJid,
        stack: error.stack
      });

      // Return 500 error so client knows something went wrong
      res.status(500).json({
        error: "Failed to fetch messages",
        message: error.message,
        code: error.code,
        // Only in development - hide details in production
        ...(process.env.NODE_ENV === 'development' && {
          detail: error.detail,
          instanceId: req.params.instanceId,
          remoteJid: req.params.remoteJid
        })
      });
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

      // Gerar ID da mensagem IMEDIATAMENTE (antes de qualquer await)
      const messageId = `pending-${Date.now()}`;

      // 🚀 OTIMIZAÇÃO CRÍTICA: Retornar resposta INSTANTANEAMENTE (0ms)
      // NÃO fazer nenhum await antes de res.json()
      // Isso garante que a mensagem aparece no front sem delay
      res.json({
        success: true,
        message: "Mensagem sendo processada",
        messageId: messageId,
        status: "pending"
      });

      // ⏳ PROCESSAMENTO EM BACKGROUND (não bloqueia o cliente)
      // Resolver dados da instância DEPOIS que a resposta foi enviada
      const instanceData = await resolveInstanceIdentifier(instanceNumber);
      const { normalizedNumber, ownerNumber, instance } = instanceData;

      console.log("📨 send-message payload", {
        rawInstanceNumber: instanceNumber,
        normalizedInstanceNumber: normalizedNumber,
        instanceId: instance?.id,
        ownerJid: instance?.ownerJid,
        connectionStatus: instance?.connectionStatus,
        recipientNumber,
      });

      if (!instance) {
        console.error("❌ Instância não encontrada:", instanceNumber);
        return;
      }

      if (!normalizedNumber) {
        console.error("❌ Não foi possível determinar o número da instância");
        return;
      }

      // Validar formato do número da instância (55 + DDD + número)
      const brazilNumberPattern = /^55\d{10,11}$/;
      if (!brazilNumberPattern.test(normalizedNumber)) {
        console.error("❌ Número da instância inválido:", normalizedNumber);
        return;
      }

      // Validar formato do número do destinatário (pode ser brasileiro ou internacional)
      const recipientNumberPattern = /^\d{8,15}$/;
      if (!recipientNumberPattern.test(recipientNumber)) {
        console.error("❌ Número do destinatário inválido:", recipientNumber);
        return;
      }

      // Verificar se a instância tem status válido
      // Evolution API pode enviar mesmo com status "close" (desconectado)
      // Validamos apenas se o campo existe
      if (!instance.connectionStatus) {
        console.error("❌ Instância sem status de conexão");
        return;
      }

      console.log(`✅ Instância ${normalizedNumber} com status: ${instance.connectionStatus}. Prosseguindo com envio...`);

      // Enviar mensagem em background (NÃO espera)
      unifiedSender.sendMessage({
        instanceName: instance.name,
        instanceNumber: normalizedNumber,
        instanceRemoteJid: ownerNumber || normalizedNumber || undefined,
        recipientNumber,
        content: text,
      }).then(result => {
        if (result.success) {
          console.log(`✅ Mensagem enviada com sucesso via ${result.api} (${result.latency}ms) - ID: ${result.messageId}`);

          // Atualizar status da mensagem para "sent" quando enviada com sucesso
          // Emitir evento via WebSocket para atualizar todos os clientes conectados
          const updateEvent = {
            type: "message_status_updated",
            data: {
              messageId: result.messageId || messageId,
              status: "sent",
              api: result.api,
              timestamp: new Date().toISOString(),
            }
          };

          // Broadcast para todos os clientes WebSocket da instância
          wsClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              try {
                client.send(JSON.stringify(updateEvent));
              } catch (error) {
                console.error("Erro ao enviar evento WebSocket:", error);
              }
            }
          });
        } else {
          console.error(`❌ Erro ao enviar mensagem: ${result.error}`);

          // Emitir evento de falha
          const failureEvent = {
            type: "message_status_updated",
            data: {
              messageId: messageId,
              status: "failed",
              error: result.error,
              timestamp: new Date().toISOString(),
            }
          };

          wsClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              try {
                client.send(JSON.stringify(failureEvent));
              } catch (error) {
                console.error("Erro ao enviar evento WebSocket:", error);
              }
            }
          });
        }
      }).catch(error => {
        console.error(`❌ Erro crítico ao enviar mensagem em background:`, error);

        // Emitir evento de erro crítico
        const errorEvent = {
          type: "message_status_updated",
          data: {
            messageId: messageId,
            status: "failed",
            error: error.message || "Erro desconhecido",
            timestamp: new Date().toISOString(),
          }
        };

        wsClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(JSON.stringify(errorEvent));
            } catch (err) {
              console.error("Erro ao enviar evento WebSocket:", err);
            }
          }
        });
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
      const { evolutionPool } = await import("./config/evolution-db");
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

      const { evolutionPool } = await import("./config/evolution-db");

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
      let senderType: SenderType | undefined;
      if (fromMe && instanceId && messageData) {
        const botConfig = await getBotConfig(instanceId);
        if (botConfig) {
          const identity = resolveSenderIdentity({
            messageText: extractPrimaryMessageText(messageData?.message),
            pushName: messageData?.pushName,
            botConfig,
          });

          finalMessage = {
            ...messageData,
            pushName: identity.pushName ?? messageData?.pushName,
            senderType: identity.senderType,
          };
          senderType = identity.senderType;
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
          senderType,
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

  // Register Evolution API instance management routes
  registerInstanceRoutes(app);

  // Register Instance N8N Workflows routes
  app.use("/api/instances", instanceWorkflowsRouter);

  // Register Instance Bot Status routes (pause/inactive management)
  app.use("/api/instances", instanceBotStatusRouter);

  // User Profile Avatar Upload endpoint (DEPRECATED - Use direct Supabase upload from frontend)
  // Kept for backwards compatibility but frontend now uploads directly via MCP
  app.post("/api/upload-avatar", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      console.log("📤 /api/upload-avatar endpoint called");

      // Handle multipart/form-data (new method)
      const file = (req as any).file;
      if (file) {
        console.log("📁 Processing FormData upload:", {
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype
        });

        // Validate file
        const maxSizeMB = 5;
        if (file.size > maxSizeMB * 1024 * 1024) {
          return res.status(400).json({
            message: `File size must be less than ${maxSizeMB}MB`
          });
        }

        const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validMimes.includes(file.mimetype)) {
          return res.status(400).json({
            message: "Only JPEG, PNG, WebP and GIF images are allowed"
          });
        }

        // Generate unique path
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 10);
        const ext = file.originalname.split('.').pop() || 'jpg';
        const filename = `${timestamp}-${randomStr}.${ext}`;
        const filepath = `avatars/${req.user.id}/${filename}`;

        console.log("📤 Uploading to Supabase Storage:", filepath);

        // Upload to Supabase Storage (using service role key with full permissions)
        const { error: uploadError } = await supabase.storage
          .from('user-avatars')
          .upload(filepath, file.buffer, {
            upsert: false,
            contentType: file.mimetype
          });

        if (uploadError) {
          console.error("❌ Error uploading to Supabase:", uploadError.message);
          return res.status(500).json({
            message: `Upload failed: ${uploadError.message}`
          });
        }

        console.log("✅ File uploaded to storage");

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('user-avatars')
          .getPublicUrl(filepath);

        console.log("🔗 Public URL:", publicUrl);

        // Update profile with service role key (bypasses RLS)
        const { error: dbError } = await supabase
          .from('user_profiles_simonia')
          .upsert({
            user_id: req.user.id,
            name: req.user?.name || null,
            avatar_url: publicUrl,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (dbError) {
          console.error("❌ Error updating profile:", dbError.message);
          return res.status(500).json({
            message: `Failed to save avatar: ${dbError.message}`
          });
        }

        console.log("✅ Profile updated with avatar URL");

        return res.json({
          success: true,
          avatarUrl: publicUrl,
          message: "Avatar uploaded successfully"
        });
      }

      // Handle JSON body (base64 or URL) - for backwards compatibility
      const { fileName, fileBase64, avatarUrl } = req.body;

      // If avatar URL provided, just update profile
      if (avatarUrl) {
        console.log("📝 Updating profile with pre-uploaded avatar:", {
          user_id: req.user.id,
          avatar_url: avatarUrl
        });

        const { error: dbError } = await supabase
          .from('user_profiles_simonia')
          .upsert({
            user_id: req.user.id,
            name: req.user?.name || null,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (dbError) {
          console.error("❌ Error updating profile:", dbError.message);
          return res.status(500).json({
            message: `Failed to save avatar: ${dbError.message}`
          });
        }

        return res.json({
          success: true,
          avatarUrl,
          message: "Avatar updated successfully"
        });
      }

      // Fallback: Handle base64 upload
      if (!fileName || !fileBase64) {
        return res.status(400).json({
          message: "Please provide file, avatarUrl, or base64 encoded data"
        });
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(fileBase64, 'base64');
      const filepath = `avatars/${req.user.id}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filepath, buffer, { upsert: true });

      if (uploadError) {
        console.error("❌ Error uploading to Supabase:", uploadError);
        return res.status(500).json({ message: "Upload failed" });
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filepath);

      // Update profile
      const { error: dbError } = await supabase
        .from('user_profiles_simonia')
        .upsert({
          user_id: req.user.id,
          name: req.user?.name || null,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (dbError) {
        console.error("❌ Error updating profile:", dbError.message);
        return res.status(500).json({
          message: `Failed to save avatar: ${dbError.message}`
        });
      }

      console.log("✅ Profile updated via legacy endpoint");

      res.json({
        success: true,
        avatarUrl: publicUrl,
        message: "Avatar uploaded successfully"
      });
    } catch (error: any) {
      console.error("Error in upload-avatar endpoint:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  return httpServer;
}


