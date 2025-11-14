/**
 * API Client - Centralizado
 * Organiza todas as chamadas de API da aplicação
 */

import { getAuthHeaders } from "./api";
import { queryClient } from "./queryClient";

const API_BASE_URL = "/api";

// ============================================================================
// TIPOS
// ============================================================================

export interface CreateInstancePayload {
  instanceName: string;
  number?: string;
  integration?: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS";
  qrcode?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  rejectCall?: boolean;
}

export interface EvolutionInstanceResponse {
  success: boolean;
  instance: {
    instanceId: string;
    instanceName: string;
    instanceNumber?: string;
    status: string;
    qrcode?: {
      code?: string;
      base64?: string;
    };
    error?: string;
  };
  message: string;
}

export interface EvolutionInstance {
  instance: {
    instanceName: string;
    instanceId: string;
    instanceNumber?: string;
    profileName?: string;
    profilePictureUrl?: string;
    status: "connecting" | "connected" | "disconnected" | "error";
    qrCode?: {
      pairingCode?: string;
      code?: string;
      base64?: string;
    };
    mobile?: boolean;
    businessAccount?: boolean;
    webhook?: {
      enabled: boolean;
      url?: string;
    };
  };
}

// ============================================================================
// EVOLUTION API - INSTÂNCIAS
// ============================================================================

export const evolutionInstancesAPI = {
  /**
   * Criar nova instância WhatsApp
   */
  create: async (payload: CreateInstancePayload): Promise<EvolutionInstanceResponse> => {
    const response = await fetch(`${API_BASE_URL}/instances`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || errorData.error || "Erro ao criar instância"
      );
    }

    return response.json();
  },

  /**
   * Listar todas as instâncias
   */
  list: async (): Promise<{
    success: boolean;
    count: number;
    instances: EvolutionInstance[];
  }> => {
    const response = await fetch(`${API_BASE_URL}/instances`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Erro ao listar instâncias");
    }

    return response.json();
  },

  /**
   * Conectar instância
   */
  connect: async (instanceId: string): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/instances/${instanceId}/connect`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao conectar instância");
    }

    return response.json();
  },

  /**
   * Reiniciar instância
   */
  restart: async (instanceId: string): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/instances/${instanceId}/restart`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao reiniciar instância");
    }

    return response.json();
  },

  /**
   * Obter estado de conexão
   */
  getConnectionState: async (instanceId: string): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/instances/${instanceId}/connection-state`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao obter estado de conexão");
    }

    return response.json();
  },

  /**
   * Fazer logout
   */
  logout: async (instanceId: string): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/instances/${instanceId}/logout`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao fazer logout");
    }

    return response.json();
  },

  /**
   * Deletar instância
   */
  delete: async (instanceId: string): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/instances/${instanceId}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao deletar instância");
    }

    return response.json();
  },

  /**
   * Definir presença
   */
  setPresence: async (
    instanceId: string,
    presence: "available" | "composing" | "recording" | "paused"
  ): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/instances/${instanceId}/presence`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ presence }),
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao definir presença");
    }

    return response.json();
  },
};

// ============================================================================
// AI DATA API
// ============================================================================

export const aiDataAPI = {
  /**
   * Listar todas as IAs
   */
  list: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/ai-data`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Erro ao listar IAs");
    }

    return response.json();
  },

  /**
   * Obter IA por ID
   */
  getById: async (id: number): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/ai-data/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Erro ao obter IA");
    }

    return response.json();
  },

  /**
   * Obter IA por número de instância
   */
  getByInstance: async (instanceNumber: string): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/ai-data/instance/${instanceNumber}`,
      {
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao obter IA da instância");
    }

    return response.json();
  },

  /**
   * Criar nova IA
   */
  create: async (data: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/ai-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Erro ao criar IA");
    }

    return response.json();
  },

  /**
   * Atualizar IA
   */
  update: async (id: number, data: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/ai-data/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Erro ao atualizar IA");
    }

    return response.json();
  },

  /**
   * Deletar IA
   */
  delete: async (id: number): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/ai-data/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Erro ao deletar IA");
    }

    return response.json();
  },

  /**
   * Testar webhook
   */
  testWebhook: async (id: number): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/ai-data/${id}/test-webhook`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Erro ao testar webhook");
    }

    return response.json();
  },

  /**
   * Testar Uazapi
   */
  testUazapi: async (id: number, token: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/ai-data/${id}/test-uazapi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error("Erro ao testar Uazapi");
    }

    return response.json();
  },
};

// ============================================================================
// WHATSAPP API
// ============================================================================

export const whatsappAPI = {
  /**
   * Enviar mensagem
   */
  sendMessage: async (data: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/whatsapp/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Erro ao enviar mensagem");
    }

    return response.json();
  },

  /**
   * Enviar mídia
   */
  sendMedia: async (data: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/whatsapp/send-media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Erro ao enviar mídia");
    }

    return response.json();
  },

  /**
   * Marcar como lido
   */
  markAsRead: async (data: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/whatsapp/mark-read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Erro ao marcar como lido");
    }

    return response.json();
  },
};

// ============================================================================
// CACHE INVALIDATION HELPERS
// ============================================================================

export const cacheHelpers = {
  /**
   * Invalidar cache de instâncias
   */
  invalidateInstances: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/instances"] });
  },

  /**
   * Invalidar cache de IAs
   */
  invalidateAIData: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/ai-data"] });
  },

  /**
   * Invalidar tudo
   */
  invalidateAll: () => {
    queryClient.invalidateQueries();
  },
};
