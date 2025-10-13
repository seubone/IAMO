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
    });
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

  // ============ N8N WEBHOOK ============
  
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

  return httpServer;
}
