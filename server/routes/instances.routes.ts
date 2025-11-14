import { Express, Request, Response } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import {
  createInstance,
  fetchInstances,
  connectInstance,
  restartInstance,
  getInstanceConnectionState,
  logoutInstance,
  deleteInstance,
  setPresence,
  isEvolutionApiConfigured,
  validateCreateInstancePayload,
  normalizePhoneNumber,
  CreateEvolutionInstanceRequest,
  type EvolutionInstanceResponse,
} from "../services/evolution-instances";
import { supabase } from "../config/supabase";

/**
 * Rotas para gerenciar instâncias Evolution API
 * Criação, listagem, conexão e gerenciamento de instâncias WhatsApp
 */
export function registerInstanceRoutes(app: Express) {
  // Middleware para verificar se Evolution API está configurada
  const checkEvolutionAPI = (req: AuthRequest, res: Response, next: any) => {
    if (!isEvolutionApiConfigured()) {
      return res.status(503).json({
        error: "Evolution API não está configurada no servidor",
        message:
          "As variáveis EVOLUTION_API_URL e EVOLUTION_API_KEY precisam estar definidas",
      });
    }
    next();
  };

  /**
   * POST /api/instances
   * Criar uma nova instância WhatsApp
   */
  app.post(
    "/api/instances",
    authMiddleware,
    checkEvolutionAPI,
    async (req: AuthRequest, res: Response) => {
      try {
        // Validar payload
        let payload: CreateEvolutionInstanceRequest;
        try {
          payload = validateCreateInstancePayload(req.body);
        } catch (validationError: any) {
          return res.status(400).json({
            error: "Dados inválidos",
            details: validationError.errors || validationError.message,
          });
        }

        // Normalizar número se fornecido
        if (payload.number) {
          payload.number = normalizePhoneNumber(payload.number);
        }

        // Criar instância na Evolution API
        const instanceResponse: EvolutionInstanceResponse =
          await createInstance(payload);

        if (instanceResponse.error) {
          return res.status(400).json({
            error: "Erro ao criar instância",
            message: instanceResponse.error,
          });
        }

        // Tentar salvar referência no Supabase se instanceId for fornecido
        if (instanceResponse.instanceId) {
          try {
            const { error: supabaseError } = await supabase
              .from("bot_instances")
              .insert({
                instance_id: instanceResponse.instanceId,
                instance_number: instanceResponse.instanceNumber,
                has_bot_enabled: false,
                bot_paused: false,
                message_prefix_template: "*{name}:*\n",
                use_prefix_for_bot: true,
                use_prefix_for_consultant: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (supabaseError) {
              console.warn(
                "Aviso: Não foi possível salvar referência no Supabase:",
                supabaseError
              );
              // Não falha a requisição, apenas avisa
            }
          } catch (dbError: any) {
            console.warn(
              "Aviso: Erro ao salvar no Supabase:",
              dbError.message
            );
            // Não falha a requisição
          }
        }

        res.status(201).json({
          success: true,
          instance: instanceResponse,
          message: "Instância criada com sucesso",
        });
      } catch (error: any) {
        console.error("Erro ao criar instância:", error);
        res.status(500).json({
          error: "Erro ao criar instância",
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/instances
   * Listar todas as instâncias
   */
  app.get(
    "/api/instances",
    authMiddleware,
    checkEvolutionAPI,
    async (req: AuthRequest, res: Response) => {
      try {
        const instances = await fetchInstances();

        res.json({
          success: true,
          count: instances.length,
          instances,
        });
      } catch (error: any) {
        console.error("Erro ao listar instâncias:", error);
        res.status(500).json({
          error: "Erro ao listar instâncias",
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/instances/:instanceId/connect
   * Conectar/inicializar uma instância
   */
  app.get(
    "/api/instances/:instanceId/connect",
    authMiddleware,
    checkEvolutionAPI,
    async (req: AuthRequest, res: Response) => {
      try {
        const { instanceId } = req.params;

        if (!instanceId) {
          return res.status(400).json({
            error: "instanceId é obrigatório",
          });
        }

        const result = await connectInstance(instanceId);

        res.json({
          success: true,
          instance: result,
          message: "Instância conectada com sucesso",
        });
      } catch (error: any) {
        console.error("Erro ao conectar instância:", error);
        res.status(500).json({
          error: "Erro ao conectar instância",
          message: error.message,
        });
      }
    }
  );

  /**
   * PUT /api/instances/:instanceId/restart
   * Reiniciar uma instância
   */
  app.put(
    "/api/instances/:instanceId/restart",
    authMiddleware,
    checkEvolutionAPI,
    async (req: AuthRequest, res: Response) => {
      try {
        const { instanceId } = req.params;

        if (!instanceId) {
          return res.status(400).json({
            error: "instanceId é obrigatório",
          });
        }

        const result = await restartInstance(instanceId);

        res.json({
          success: true,
          instance: result,
          message: "Instância reiniciada com sucesso",
        });
      } catch (error: any) {
        console.error("Erro ao reiniciar instância:", error);
        res.status(500).json({
          error: "Erro ao reiniciar instância",
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/instances/:instanceId/connection-state
   * Obter estado da conexão de uma instância
   */
  app.get(
    "/api/instances/:instanceId/connection-state",
    authMiddleware,
    checkEvolutionAPI,
    async (req: AuthRequest, res: Response) => {
      try {
        const { instanceId } = req.params;

        if (!instanceId) {
          return res.status(400).json({
            error: "instanceId é obrigatório",
          });
        }

        const result = await getInstanceConnectionState(instanceId);

        res.json({
          success: true,
          connectionState: result,
        });
      } catch (error: any) {
        console.error("Erro ao obter estado de conexão:", error);
        res.status(500).json({
          error: "Erro ao obter estado de conexão",
          message: error.message,
        });
      }
    }
  );

  /**
   * DELETE /api/instances/:instanceId/logout
   * Fazer logout de uma instância
   */
  app.delete(
    "/api/instances/:instanceId/logout",
    authMiddleware,
    checkEvolutionAPI,
    async (req: AuthRequest, res: Response) => {
      try {
        const { instanceId } = req.params;

        if (!instanceId) {
          return res.status(400).json({
            error: "instanceId é obrigatório",
          });
        }

        const result = await logoutInstance(instanceId);

        res.json({
          success: true,
          message: "Logout realizado com sucesso",
          result,
        });
      } catch (error: any) {
        console.error("Erro ao fazer logout:", error);
        res.status(500).json({
          error: "Erro ao fazer logout",
          message: error.message,
        });
      }
    }
  );

  /**
   * DELETE /api/instances/:instanceId
   * Deletar uma instância
   */
  app.delete(
    "/api/instances/:instanceId",
    authMiddleware,
    checkEvolutionAPI,
    async (req: AuthRequest, res: Response) => {
      try {
        const { instanceId } = req.params;

        if (!instanceId) {
          return res.status(400).json({
            error: "instanceId é obrigatório",
          });
        }

        const result = await deleteInstance(instanceId);

        // Tentar remover referência do Supabase
        try {
          await supabase
            .from("bot_instances")
            .delete()
            .eq("instance_id", instanceId);
        } catch (dbError: any) {
          console.warn(
            "Aviso: Erro ao remover referência do Supabase:",
            dbError.message
          );
        }

        res.json({
          success: true,
          message: "Instância deletada com sucesso",
          result,
        });
      } catch (error: any) {
        console.error("Erro ao deletar instância:", error);
        res.status(500).json({
          error: "Erro ao deletar instância",
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/instances/:instanceId/presence
   * Definir status de presença
   */
  app.post(
    "/api/instances/:instanceId/presence",
    authMiddleware,
    checkEvolutionAPI,
    async (req: AuthRequest, res: Response) => {
      try {
        const { instanceId } = req.params;
        const { presence } = req.body;

        if (!instanceId) {
          return res.status(400).json({
            error: "instanceId é obrigatório",
          });
        }

        if (
          !presence ||
          !["available", "composing", "recording", "paused"].includes(
            presence
          )
        ) {
          return res.status(400).json({
            error:
              "presence deve ser: available, composing, recording ou paused",
          });
        }

        const result = await setPresence(
          instanceId,
          presence as "available" | "composing" | "recording" | "paused"
        );

        res.json({
          success: true,
          message: "Presença definida com sucesso",
          result,
        });
      } catch (error: any) {
        console.error("Erro ao definir presença:", error);
        res.status(500).json({
          error: "Erro ao definir presença",
          message: error.message,
        });
      }
    }
  );
}
