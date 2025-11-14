/**
 * Evolution API Instance Management Service
 * Integração com Evolution API para criar, gerenciar e conectar instâncias WhatsApp
 */

import { z } from "zod";

// Environment variables
const evolutionApiUrl = process.env.EVOLUTION_API_URL
  ? process.env.EVOLUTION_API_URL.replace(/\/$/, "")
  : undefined;
const evolutionApiKey = process.env.EVOLUTION_API_KEY || undefined;

// ============================================================================
// TIPOS E SCHEMAS
// ============================================================================

/**
 * Dados para criar uma instância na Evolution API
 */
export interface CreateEvolutionInstanceRequest {
  instanceName: string;
  token?: string;
  qrcode?: boolean;
  number?: string;
  integration?: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS";
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
  proxyHost?: string;
  proxyPort?: string;
  proxyProtocol?: "http" | "https" | "socks5";
  proxyUsername?: string;
  proxyPassword?: string;
  webhook?: {
    url: string;
    byEvents?: boolean;
    base64?: boolean;
    headers?: Record<string, string>;
    events?: string[];
  };
  rabbitmq?: {
    enabled: boolean;
    events?: string[];
  };
  sqs?: {
    enabled: boolean;
    events?: string[];
  };
  chatwootAccountId?: number;
  chatwootToken?: string;
  chatwootUrl?: string;
  chatwootSignMsg?: boolean;
  chatwootReopenConversation?: boolean;
  chatwootConversationPending?: boolean;
  chatwootImportContacts?: boolean;
  chatwootNameInbox?: string;
  chatwootMergeBrazilContacts?: boolean;
  chatwootImportMessages?: boolean;
  chatwootDaysLimitImportMessages?: number;
  chatwootOrganization?: string;
  chatwootLogo?: string;
}

/**
 * Resposta ao criar uma instância
 */
export interface EvolutionInstanceResponse {
  instanceId: string;
  instanceName: string;
  instanceNumber?: string;
  status: string;
  qrcode?: {
    code?: string;
    base64?: string;
  };
  error?: string;
}

/**
 * Dados de uma instância da Evolution
 */
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

/**
 * Resposta ao buscar instâncias
 */
export interface EvolutionInstancesResponse {
  instances: EvolutionInstance[];
}

/**
 * Schema Zod para validação
 */
const createInstanceSchema = z.object({
  instanceName: z.string().min(1, "instanceName é obrigatório"),
  token: z.string().optional(),
  qrcode: z.boolean().optional().default(true),
  number: z.string().optional(),
  integration: z
    .enum(["WHATSAPP-BAILEYS", "WHATSAPP-BUSINESS"])
    .optional()
    .default("WHATSAPP-BAILEYS"),
  rejectCall: z.boolean().optional(),
  msgCall: z.string().optional(),
  groupsIgnore: z.boolean().optional(),
  alwaysOnline: z.boolean().optional(),
  readMessages: z.boolean().optional(),
  readStatus: z.boolean().optional(),
  syncFullHistory: z.boolean().optional(),
});

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Verifica se a Evolution API está configurada
 */
export function isEvolutionApiConfigured(): boolean {
  return Boolean(evolutionApiUrl && evolutionApiKey);
}

/**
 * Valida o payload para criação de instância
 */
export function validateCreateInstancePayload(
  data: unknown
): CreateEvolutionInstanceRequest {
  const validated = createInstanceSchema.parse(data);
  return validated as CreateEvolutionInstanceRequest;
}

/**
 * Normaliza número de telefone (remove caracteres especiais)
 */
export function normalizePhoneNumber(number: string): string {
  // Remove espaços, hífens, parênteses, etc
  return number.replace(/\D/g, "");
}

// ============================================================================
// OPERAÇÕES COM INSTÂNCIAS
// ============================================================================

/**
 * Cria uma nova instância na Evolution API
 */
export async function createInstance(
  payload: CreateEvolutionInstanceRequest
): Promise<EvolutionInstanceResponse> {
  if (!isEvolutionApiConfigured()) {
    throw new Error(
      "Evolution API não está configurada (EVOLUTION_API_URL/KEY ausentes)"
    );
  }

  const endpoint = `${evolutionApiUrl}/instance/create`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evolutionApiKey as string,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `Erro ao criar instância: ${response.status}`
      );
    }

    return data;
  } catch (error: any) {
    console.error("Erro ao criar instância na Evolution API:", error);
    throw new Error(
      `Falha ao criar instância: ${error.message || "Erro desconhecido"}`
    );
  }
}

/**
 * Busca todas as instâncias criadas
 */
export async function fetchInstances(): Promise<EvolutionInstance[]> {
  if (!isEvolutionApiConfigured()) {
    throw new Error(
      "Evolution API não está configurada (EVOLUTION_API_URL/KEY ausentes)"
    );
  }

  const endpoint = `${evolutionApiUrl}/instance/fetchInstances`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: evolutionApiKey as string,
      },
    });

    const data: EvolutionInstancesResponse = await response.json();

    if (!response.ok) {
      throw new Error(
        `Erro ao buscar instâncias: ${response.status}`
      );
    }

    return data.instances || [];
  } catch (error: any) {
    console.error("Erro ao buscar instâncias da Evolution API:", error);
    throw new Error(
      `Falha ao buscar instâncias: ${error.message || "Erro desconhecido"}`
    );
  }
}

/**
 * Conecta/inicializa uma instância
 */
export async function connectInstance(instance: string): Promise<any> {
  if (!isEvolutionApiConfigured()) {
    throw new Error(
      "Evolution API não está configurada (EVOLUTION_API_URL/KEY ausentes)"
    );
  }

  const endpoint = `${evolutionApiUrl}/instance/connect/${instance}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: evolutionApiKey as string,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `Erro ao conectar instância: ${response.status}`
      );
    }

    return data;
  } catch (error: any) {
    console.error("Erro ao conectar instância:", error);
    throw new Error(
      `Falha ao conectar instância: ${error.message || "Erro desconhecido"}`
    );
  }
}

/**
 * Reinicia uma instância
 */
export async function restartInstance(instance: string): Promise<any> {
  if (!isEvolutionApiConfigured()) {
    throw new Error(
      "Evolution API não está configurada (EVOLUTION_API_URL/KEY ausentes)"
    );
  }

  const endpoint = `${evolutionApiUrl}/instance/restart/${instance}`;

  try {
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        apikey: evolutionApiKey as string,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `Erro ao reiniciar instância: ${response.status}`
      );
    }

    return data;
  } catch (error: any) {
    console.error("Erro ao reiniciar instância:", error);
    throw new Error(
      `Falha ao reiniciar instância: ${error.message || "Erro desconhecido"}`
    );
  }
}

/**
 * Obtém o estado da conexão de uma instância
 */
export async function getInstanceConnectionState(
  instance: string
): Promise<any> {
  if (!isEvolutionApiConfigured()) {
    throw new Error(
      "Evolution API não está configurada (EVOLUTION_API_URL/KEY ausentes)"
    );
  }

  const endpoint = `${evolutionApiUrl}/instance/connectionState/${instance}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: evolutionApiKey as string,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Erro ao obter estado de conexão: ${response.status}`
      );
    }

    return data;
  } catch (error: any) {
    console.error("Erro ao obter estado de conexão:", error);
    throw new Error(
      `Falha ao obter estado de conexão: ${
        error.message || "Erro desconhecido"
      }`
    );
  }
}

/**
 * Faz logout de uma instância
 */
export async function logoutInstance(instance: string): Promise<any> {
  if (!isEvolutionApiConfigured()) {
    throw new Error(
      "Evolution API não está configurada (EVOLUTION_API_URL/KEY ausentes)"
    );
  }

  const endpoint = `${evolutionApiUrl}/instance/logout/${instance}`;

  try {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        apikey: evolutionApiKey as string,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `Erro ao fazer logout: ${response.status}`
      );
    }

    return data;
  } catch (error: any) {
    console.error("Erro ao fazer logout:", error);
    throw new Error(
      `Falha ao fazer logout: ${error.message || "Erro desconhecido"}`
    );
  }
}

/**
 * Deleta uma instância
 */
export async function deleteInstance(instance: string): Promise<any> {
  if (!isEvolutionApiConfigured()) {
    throw new Error(
      "Evolution API não está configurada (EVOLUTION_API_URL/KEY ausentes)"
    );
  }

  const endpoint = `${evolutionApiUrl}/instance/delete/${instance}`;

  try {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        apikey: evolutionApiKey as string,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `Erro ao deletar instância: ${response.status}`
      );
    }

    return data;
  } catch (error: any) {
    console.error("Erro ao deletar instância:", error);
    throw new Error(
      `Falha ao deletar instância: ${error.message || "Erro desconhecido"}`
    );
  }
}

/**
 * Define o status de presença de uma instância
 */
export async function setPresence(
  instance: string,
  presence: "available" | "composing" | "recording" | "paused"
): Promise<any> {
  if (!isEvolutionApiConfigured()) {
    throw new Error(
      "Evolution API não está configurada (EVOLUTION_API_URL/KEY ausentes)"
    );
  }

  const endpoint = `${evolutionApiUrl}/instance/setPresence/${instance}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evolutionApiKey as string,
      },
      body: JSON.stringify({ presence }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `Erro ao definir presença: ${response.status}`
      );
    }

    return data;
  } catch (error: any) {
    console.error("Erro ao definir presença:", error);
    throw new Error(
      `Falha ao definir presença: ${error.message || "Erro desconhecido"}`
    );
  }
}
