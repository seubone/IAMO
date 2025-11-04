import { Express, Request, Response } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { requirePermission, requireRole } from "../middleware/rbac";

/**
 * IA Configuration Routes
 * Routes for managing AI configurations including N8N workflows, pause schedules, and message prefixes
 */
export function registerIAConfigRoutes(app: Express) {
  /**
   * PATCH /api/ias/:id
   * Update IA configuration (extends existing PATCH route)
   * This route should be added to handle the new fields
   */
  app.patch("/api/ias/:id", authMiddleware, requirePermission("ias:update"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        aiName,
        consultantName,
        description,
        category,
        avatarUrl,
        n8nWorkflowId,
        n8nWorkflowName,
        n8nWebhookUrl,
        n8nTriggerType,
        n8nLastExecutionTimestamp,
        n8nConfig,
        pauseUntil,
        pauseReason,
        messagePrefixTemplate,
        useAiPrefix,
        useConsultantPrefix,
        modelVersion,
        performanceScore,
        status,
        reason,
      } = req.body;

      // Get storage instance (from context)
      const storage = (req as any).storage || require("../db-storage").dbStorage;

      // Prepare update data
      const updateData: any = {};

      // Basic fields
      if (aiName !== undefined) updateData.aiName = aiName || null;
      if (consultantName !== undefined) updateData.consultantName = consultantName || null;
      if (description !== undefined) updateData.description = description || null;
      if (category !== undefined) updateData.category = category || null;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;

      // N8N fields
      if (n8nWorkflowId !== undefined) updateData.n8nWorkflowId = n8nWorkflowId || null;
      if (n8nWorkflowName !== undefined) updateData.n8nWorkflowName = n8nWorkflowName || null;
      if (n8nWebhookUrl !== undefined) updateData.n8nWebhookUrl = n8nWebhookUrl || null;
      if (n8nTriggerType !== undefined) updateData.n8nTriggerType = n8nTriggerType || null;
      if (n8nLastExecutionTimestamp !== undefined) updateData.n8nLastExecutionTimestamp = n8nLastExecutionTimestamp || null;
      if (n8nConfig !== undefined) updateData.n8nConfig = n8nConfig || null;

      // Pause fields
      if (pauseUntil !== undefined) updateData.pauseUntil = pauseUntil || null;
      if (pauseReason !== undefined) updateData.pauseReason = pauseReason || null;

      // Message formatting
      if (messagePrefixTemplate !== undefined) updateData.messagePrefixTemplate = messagePrefixTemplate || "*{name}:*\n";
      if (useAiPrefix !== undefined) updateData.useAiPrefix = useAiPrefix;
      if (useConsultantPrefix !== undefined) updateData.useConsultantPrefix = useConsultantPrefix;

      // Other fields
      if (modelVersion !== undefined) updateData.modelVersion = modelVersion || null;
      if (performanceScore !== undefined) updateData.performanceScore = performanceScore || null;

      // Track who made the modification
      updateData.lastModifiedBy = req.user?.id || "system";
      updateData.lastModifiedAt = new Date();

      // Handle status changes
      if (status !== undefined) {
        updateData.status = status;

        // Create audit action if status changed
        if (storage.createAction && req.user?.id) {
          let actionName = "";
          if (status === "active") actionName = "IA Ativada";
          else if (status === "paused") actionName = "IA Pausada";
          else if (status === "inactive") actionName = "IA Inativada";

          if (actionName) {
            await storage.createAction({
              iaId: id,
              userId: req.user.id,
              action: actionName,
              reason: reason || "Sem motivo especificado",
            });
          }
        }
      }

      // Update the IA
      const ia = await storage.updateIA(id, updateData);

      if (!ia) {
        return res.status(404).json({ error: "IA não encontrada" });
      }

      // Broadcast update via WebSocket if available
      const broadcast = (req as any).broadcast;
      if (broadcast) {
        broadcast({ type: "ia_updated", data: ia });
      }

      res.json(ia);
    } catch (error: any) {
      console.error("Error updating IA config:", error);
      res.status(500).json({
        error: "Erro ao atualizar configuração da IA",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/ias/:id/config
   * Get complete IA configuration with all details
   */
  app.get("/api/ias/:id/config", authMiddleware, requirePermission("ias:read"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const storage = (req as any).storage || require("../db-storage").dbStorage;

      const ia = await storage.getIA(id);
      if (!ia) {
        return res.status(404).json({ error: "IA não encontrada" });
      }

      // Return configuration in a structured format
      res.json({
        id: ia.id,
        name: ia.name,
        status: ia.status,

        // IA Names
        aiName: ia.aiName,
        consultantName: ia.consultantName,

        // Description and metadata
        description: ia.description,
        category: ia.category,
        avatarUrl: ia.avatarUrl,

        // N8N Configuration
        n8n: {
          workflowId: ia.n8nWorkflowId,
          workflowName: ia.n8nWorkflowName,
          webhookUrl: ia.n8nWebhookUrl,
          triggerType: ia.n8nTriggerType,
          lastExecutionTimestamp: ia.n8nLastExecutionTimestamp,
          config: ia.n8nConfig,
        },

        // Pause Schedule
        pause: {
          until: ia.pauseUntil,
          reason: ia.pauseReason,
        },

        // Message Formatting
        messages: {
          prefixTemplate: ia.messagePrefixTemplate,
          useAiPrefix: ia.useAiPrefix,
          useConsultantPrefix: ia.useConsultantPrefix,
        },

        // Performance
        modelVersion: ia.modelVersion,
        performanceScore: ia.performanceScore,

        // Metadata
        lastModifiedBy: ia.lastModifiedBy,
        lastModifiedAt: ia.lastModifiedAt,
        createdAt: ia.createdAt,
        updatedAt: ia.updatedAt,
      });
    } catch (error: any) {
      console.error("Error fetching IA config:", error);
      res.status(500).json({
        error: "Erro ao recuperar configuração da IA",
        message: error.message,
      });
    }
  });

  /**
   * POST /api/ias/:id/pause
   * Pause an IA with a schedule
   */
  app.post("/api/ias/:id/pause", authMiddleware, requirePermission("ias:update"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { pauseUntil, reason } = req.body;

      if (!pauseUntil) {
        return res.status(400).json({ error: "pauseUntil é obrigatório" });
      }

      const storage = (req as any).storage || require("../db-storage").dbStorage;

      const ia = await storage.updateIA(id, {
        status: "paused",
        pauseUntil: new Date(pauseUntil),
        pauseReason: reason || "Pausa agendada",
        lastModifiedBy: req.user?.id || "system",
        lastModifiedAt: new Date(),
      });

      if (!ia) {
        return res.status(404).json({ error: "IA não encontrada" });
      }

      // Create audit action
      if (storage.createAction && req.user?.id) {
        await storage.createAction({
          iaId: id,
          userId: req.user.id,
          action: "IA Pausada",
          reason: reason || "Pausa agendada",
        });
      }

      const broadcast = (req as any).broadcast;
      if (broadcast) {
        broadcast({ type: "ia_paused", data: ia });
      }

      res.json({
        success: true,
        message: `IA pausada até ${new Date(pauseUntil).toLocaleString()}`,
        data: ia,
      });
    } catch (error: any) {
      console.error("Error pausing IA:", error);
      res.status(500).json({
        error: "Erro ao pausar IA",
        message: error.message,
      });
    }
  });

  /**
   * POST /api/ias/:id/resume
   * Resume a paused IA
   */
  app.post("/api/ias/:id/resume", authMiddleware, requirePermission("ias:update"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const storage = (req as any).storage || require("../db-storage").dbStorage;

      const ia = await storage.updateIA(id, {
        status: "active",
        pauseUntil: null,
        pauseReason: null,
        lastModifiedBy: req.user?.id || "system",
        lastModifiedAt: new Date(),
      });

      if (!ia) {
        return res.status(404).json({ error: "IA não encontrada" });
      }

      // Create audit action
      if (storage.createAction && req.user?.id) {
        await storage.createAction({
          iaId: id,
          userId: req.user.id,
          action: "IA Retomada",
          reason: "Retomada de pausa agendada",
        });
      }

      const broadcast = (req as any).broadcast;
      if (broadcast) {
        broadcast({ type: "ia_resumed", data: ia });
      }

      res.json({
        success: true,
        message: "IA retomada com sucesso",
        data: ia,
      });
    } catch (error: any) {
      console.error("Error resuming IA:", error);
      res.status(500).json({
        error: "Erro ao retomar IA",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/ias/:id/preview
   * Get preview of how messages will be formatted
   */
  app.get("/api/ias/:id/preview", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const storage = (req as any).storage || require("../db-storage").dbStorage;

      const ia = await storage.getIA(id);
      if (!ia) {
        return res.status(404).json({ error: "IA não encontrada" });
      }

      const sampleMessage = "Olá! Como posso ajudar?";
      const template = ia.messagePrefixTemplate || "*{name}:*\n";

      const formatMessage = (message: string, name: string) => {
        if (!name) return message;
        const prefix = template.replace("{name}", name);
        return prefix + message;
      };

      const aiMessage = ia.useAiPrefix && ia.aiName
        ? formatMessage(sampleMessage, ia.aiName)
        : sampleMessage;

      const consultantMessage = ia.useConsultantPrefix && ia.consultantName
        ? formatMessage(sampleMessage, ia.consultantName)
        : sampleMessage;

      res.json({
        aiMessage,
        consultantMessage,
        template,
        aiName: ia.aiName,
        consultantName: ia.consultantName,
      });
    } catch (error: any) {
      console.error("Error generating preview:", error);
      res.status(500).json({
        error: "Erro ao gerar preview",
        message: error.message,
      });
    }
  });
}
