import { Express, Request, Response } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { supabase } from "../config/supabase";

/**
 * Rotas para gerenciar ai_data (usando tabela bot_instances)
 * Vincular instância com N8N workflow
 */
export function registerAIDataRoutes(app: Express) {
  /**
   * GET /api/ai-data/:id
   * Obter configuração de uma IA pelo ID
   */
  app.get("/api/ai-data/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from("bot_instances")
        .select("*")
        .eq("id", parseInt(id))
        .single();

      if (error) {
        return res.status(404).json({ error: "IA não encontrada" });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Erro ao buscar ai_data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/ai-data/instance/:instanceNumber
   * Obter IA pela instância (busca por instance_id UUID ou instance_number)
   */
  app.get("/api/ai-data/instance/:instanceNumber", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { instanceNumber } = req.params;

      // Primeiro tenta buscar pelo instance_id (UUID), depois por instance_number
      const { data, error } = await supabase
        .from("bot_instances")
        .select("*")
        .or(`instance_id.eq.${instanceNumber},instance_number.eq.${instanceNumber}`)
        .maybeSingle();

      if (error) {
        console.error("Erro na busca:", error);
        return res.status(404).json({ error: "IA não configurada para esta instância" });
      }

      if (!data) {
        return res.status(404).json({ error: "IA não configurada para esta instância" });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Erro ao buscar ai_data por instância:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PATCH /api/ai-data/:id
   * Atualizar configuração de IA
   */
  app.patch("/api/ai-data/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        ai_name,
        consultant_name,
        description,
        n8n_webhook_url,
        api_token,
        bot_paused,
      } = req.body;

      const updateData: any = {};

      // Mapeia a requisição da API para as colunas da tabela bot_instances
      if (ai_name !== undefined) updateData.bot_name = ai_name;
      if (consultant_name !== undefined) updateData.consultant_name = consultant_name;
      if (description !== undefined) updateData.bot_activity = description;
      if (n8n_webhook_url !== undefined) updateData.n8n_webhook_url = n8n_webhook_url;
      if (api_token !== undefined) updateData.api_token = api_token;
      if (bot_paused !== undefined) updateData.bot_paused = bot_paused;

      // Lógica para habilitar/desabilitar o bot
      if (req.body.hasOwnProperty('has_bot_enabled')) {
        updateData.has_bot_enabled = req.body.has_bot_enabled;
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("bot_instances")
        .update(updateData)
        .eq("id", parseInt(id))
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Erro ao atualizar ai_data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/ai-data
   * Criar nova entrada de IA para instância
   */
  app.post("/api/ai-data", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const {
        instance_number,
        instance_id,
        ai_name,
        consultant_name,
        description,
        n8n_webhook_url,
        api_token,
      } = req.body;

      if (!instance_number && !instance_id) {
        return res.status(400).json({ error: "instance_number ou instance_id é obrigatório" });
      }

      // Auto-enable bot se ai_name for fornecido
      const shouldEnableBot = !!(ai_name && ai_name.trim().length > 0);

      const insertData: any = {
        instance_number: instance_number?.substring(0, 20) || instance_id?.substring(0, 20),
        instance_id,
        has_bot_enabled: shouldEnableBot,
        bot_name: ai_name || null,
        consultant_name: consultant_name || null,
        bot_activity: description || null,
        n8n_webhook_url: n8n_webhook_url || null,
        api_token: api_token || null,
        message_prefix_template: "*{name}:*\n",
        use_prefix_for_bot: true,
        use_prefix_for_consultant: true,
      };

      const { data, error } = await supabase
        .from("bot_instances")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.status(201).json(data);
    } catch (error: any) {
      console.error("Erro ao criar ai_data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/ai-data/:id
   * Deletar configuração de IA
   */
  app.delete("/api/ai-data/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from("bot_instances")
        .delete()
        .eq("id", parseInt(id));

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ success: true, message: "IA deletada com sucesso" });
    } catch (error: any) {
      console.error("Erro ao deletar ai_data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/ai-data
   * Listar todas as IAs configuradas
   */
  app.get("/api/ai-data", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { data, error } = await supabase
        .from("bot_instances")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json(data || []);
    } catch (error: any) {
      console.error("Erro ao listar ai_data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/ai-data/:id/test-webhook
   * Testar conexão com webhook N8N
   */
  app.post("/api/ai-data/:id/test-webhook", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: aiData, error: fetchError } = await supabase
        .from("bot_instances")
        .select("n8n_webhook_url")
        .eq("id", parseInt(id))
        .single();

      if (fetchError || !aiData?.n8n_webhook_url) {
        return res.status(404).json({ error: "Webhook não configurado" });
      }

      // Testar a conexão
      try {
        const testResponse = await fetch(aiData.n8n_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true }),
        });

        if (testResponse.ok) {
          return res.json({
            success: true,
            message: "Webhook está funcionando",
            statusCode: testResponse.status,
          });
        } else {
          return res.json({
            success: false,
            message: "Webhook retornou erro",
            statusCode: testResponse.status,
          });
        }
      } catch (fetchErr: any) {
        return res.json({
          success: false,
          message: "Erro ao conectar ao webhook",
          error: fetchErr.message,
        });
      }
    } catch (error: any) {
      console.error("Erro ao testar webhook:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/ai-data/:id/test-uazapi
   * Testar conexão com API Uazapi
   */
  app.post("/api/ai-data/:id/test-uazapi", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token não fornecido" });
      }

      // Testar conexão com Uazapi
      try {
        const testResponse = await fetch("https://api.uazapi.com/api/instance/list", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "uazapi-key": token,
          },
        });

        if (testResponse.ok) {
          const data = await testResponse.json();
          return res.json({
            success: true,
            message: "Token Uazapi é válido",
            statusCode: testResponse.status,
            data,
          });
        } else if (testResponse.status === 401) {
          return res.json({
            success: false,
            message: "Token Uazapi inválido ou expirado",
            statusCode: testResponse.status,
          });
        } else {
          return res.json({
            success: false,
            message: "Erro ao conectar com Uazapi",
            statusCode: testResponse.status,
          });
        }
      } catch (fetchErr: any) {
        return res.json({
          success: false,
          message: "Erro ao conectar com Uazapi",
          error: fetchErr.message,
        });
      }
    } catch (error: any) {
      console.error("Erro ao testar Uazapi:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
