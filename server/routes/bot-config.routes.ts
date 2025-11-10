import { Express, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getBotConfigByInstanceNumber,
  upsertBotConfig,
  deleteBotConfig,
  formatMessageWithPrefix,
  generateConsultantName,
} from "../services/bot-instances-supabase";
import type { BotInstanceConfig } from "../../shared/bot-instance.types";

/**
 * Register bot configuration routes
 * All routes require authentication
 */
export function registerBotConfigRoutes(app: Express) {
  /**
   * GET /api/bot-config/:instanceNumber
   * Retrieve bot configuration for a specific instance
   */
  app.get("/api/bot-config/:instanceNumber", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { instanceNumber } = req.params;

      if (!instanceNumber || instanceNumber.trim() === "") {
        return res.status(400).json({ error: "instanceNumber é obrigatório" });
      }

      const config = await getBotConfigByInstanceNumber(instanceNumber.trim());

      if (!config) {
        // Return default config if not found
        return res.json({
          instance_number: instanceNumber,
          has_bot_enabled: false,
          message_prefix_template: "*{name}:*\n",
          use_prefix_for_bot: true,
          use_prefix_for_consultant: true,
        });
      }

      res.json(config);
    } catch (error: any) {
      console.error("Error fetching bot config:", error);
      res.status(500).json({ error: "Erro ao recuperar configuração do bot" });
    }
  });

  /**
   * POST /api/bot-config
   * Create or update bot configuration
   */
  app.post("/api/bot-config", authMiddleware, async (req: Request, res: Response) => {
    try {
      const config: BotInstanceConfig = req.body;

      // Validation
      if (!config.instance_number || config.instance_number.trim() === "") {
        return res.status(400).json({ error: "instance_number é obrigatório" });
      }

      if (!config.instance_id || config.instance_id.trim() === "") {
        return res.status(400).json({ error: "instance_id é obrigatório" });
      }

      // Validate bot name format if bot is enabled
      if (config.has_bot_enabled && config.bot_name) {
        const botNameTrimmed = config.bot_name.trim();
        const parts = botNameTrimmed.split(/\s+/);

        if (parts.length < 2) {
          return res.status(400).json({
            error: "Nome do bot deve conter pelo menos dois nomes (ex: Maria Luzia)",
          });
        }

        // Check if each part starts with uppercase letter
        const validFormat = parts.every((part) => /^[A-Z]/.test(part));
        if (!validFormat) {
          return res.status(400).json({
            error: "Cada palavra do nome deve começar com letra maiúscula (ex: Maria Luzia)",
          });
        }
      }

      // Normalize instance number
      const normalizedInstanceNumber = config.instance_number.replace(/\D/g, "");

      // Determine consultant name (prefer explicit value, fallback to auto-generate)
      const trimmedConsultantName = config.consultant_name?.trim() || "";
      let consultantName = trimmedConsultantName || null;

      if (config.has_bot_enabled) {
        if (!consultantName && config.bot_name) {
          consultantName = generateConsultantName(config.bot_name);
        }
      } else {
        // If bot is disabled, clear consultant name to avoid stale prefixes
        consultantName = trimmedConsultantName || null;
      }

      // Prepare config object for saving
      const configToSave: BotInstanceConfig = {
        instance_id: config.instance_id,
        instance_number: normalizedInstanceNumber,
        instance_remote_jid: config.instance_remote_jid || null,
        has_bot_enabled: config.has_bot_enabled ?? false,
        bot_name: config.bot_name || null,
        consultant_name: consultantName || null,
        bot_activity: config.bot_activity || null,
        message_prefix_template: config.message_prefix_template || "*{name}:*\n",
        use_prefix_for_bot: config.use_prefix_for_bot ?? true,
        use_prefix_for_consultant: config.use_prefix_for_consultant ?? true,
      };

      const result = await upsertBotConfig(configToSave);

      res.json({
        success: true,
        message: "Configuração do bot salva com sucesso",
        data: result,
      });
    } catch (error: any) {
      console.error("Error saving bot config:", error);
      res.status(500).json({
        error: "Erro ao salvar configuração do bot",
        message: error.message,
      });
    }
  });

  /**
   * DELETE /api/bot-config/:instanceNumber
   * Delete bot configuration for a specific instance
   */
  app.delete("/api/bot-config/:instanceNumber", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { instanceNumber } = req.params;

      if (!instanceNumber || instanceNumber.trim() === "") {
        return res.status(400).json({ error: "instanceNumber é obrigatório" });
      }

      const success = await deleteBotConfig(instanceNumber.trim());

      if (!success) {
        return res.status(404).json({ error: "Configuração não encontrada" });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting bot config:", error);
      res.status(500).json({ error: "Erro ao deletar configuração do bot" });
    }
  });

  /**
   * GET /api/bot-config/:instanceNumber/preview
   * Get preview of formatted messages with bot prefixes
   */
  app.get("/api/bot-config/:instanceNumber/preview", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { instanceNumber } = req.params;

      if (!instanceNumber || instanceNumber.trim() === "") {
        return res.status(400).json({ error: "instanceNumber é obrigatório" });
      }

      const config = await getBotConfigByInstanceNumber(instanceNumber.trim());

      if (!config || !config.has_bot_enabled) {
        return res.json({
          botMessage: "Olá! Como posso ajudar?",
          consultantMessage: "Vou verificar isso para você.",
          template: "*{name}:*\n",
          note: "Bot não está habilitado",
        });
      }

      const sampleBotMessage = "Olá! Como posso ajudar?";
      const sampleConsultantMessage = "Vou verificar isso para você.";

      const botMessage = config.use_prefix_for_bot && config.bot_name
        ? formatMessageWithPrefix(sampleBotMessage, config.bot_name, config.message_prefix_template)
        : sampleBotMessage;

      const consultantMessage = config.use_prefix_for_consultant && config.consultant_name
        ? formatMessageWithPrefix(
            sampleConsultantMessage,
            config.consultant_name,
            config.message_prefix_template
          )
        : sampleConsultantMessage;

      res.json({
        botMessage,
        consultantMessage,
        template: config.message_prefix_template,
        botName: config.bot_name,
        consultantName: config.consultant_name,
      });
    } catch (error: any) {
      console.error("Error generating preview:", error);
      res.status(500).json({ error: "Erro ao gerar preview das mensagens" });
    }
  });
}
