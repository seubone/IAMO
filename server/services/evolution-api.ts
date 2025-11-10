const apiUrl = process.env.EVOLUTION_API_URL
  ? process.env.EVOLUTION_API_URL.replace(/\/$/, "")
  : undefined;
const apiKey = process.env.EVOLUTION_API_KEY || undefined;

type MessageKeyLike = {
  id?: string;
  remoteJid?: string;
  remotejid?: string;
  remote_jid?: string;
  fromMe?: boolean;
  from_me?: boolean;
  participant?: string;
};

export interface EvolutionMediaRequest {
  instanceId: string;
  messageId: string;
  messageKey?: MessageKeyLike;
  directPath?: string;
  fileEncSha256?: string;
  fileSha256?: string;
  mediaKeyTimestamp?: number;
  fileLength?: number;
}

export interface EvolutionMediaResponse {
  buffer: Buffer;
  mimetype?: string;
}

export function isEvolutionApiConfigured(): boolean {
  return Boolean(apiUrl && apiKey);
}

function buildMediaPayload(params: EvolutionMediaRequest) {
  const key = params.messageKey || {};
  const payload: Record<string, any> = {
    message: {
      key: {
        id: key.id,
        remoteJid:
          key.remoteJid ??
          key.remotejid ??
          key.remote_jid ??
          undefined,
        fromMe: key.fromMe ?? key.from_me ?? undefined,
        participant: key.participant ?? undefined,
      },
    },
    messageId: params.messageId,
  };

  if (params.directPath) {
    payload.directPath = params.directPath;
  }
  if (params.fileEncSha256) {
    payload.fileEncSha256 = params.fileEncSha256;
  }
  if (params.fileSha256) {
    payload.fileSha256 = params.fileSha256;
  }
  if (typeof params.mediaKeyTimestamp === "number") {
    payload.mediaKeyTimestamp = params.mediaKeyTimestamp;
  }
  if (typeof params.fileLength === "number") {
    payload.fileLength = params.fileLength;
  }

  return payload;
}

function markAsMediaExpired(error: Error, status?: number) {
  error.name = "MediaExpiredError";
  if (status) {
    (error as any).status = status;
  }
  return error;
}

export async function fetchMediaFromEvolution(
  params: EvolutionMediaRequest
): Promise<EvolutionMediaResponse> {
  if (!isEvolutionApiConfigured()) {
    throw new Error("Evolution API não está configurada (EVOLUTION_API_URL/KEY ausentes)");
  }

  if (!params.instanceId) {
    throw new Error("instanceId é obrigatório para baixar mídia via Evolution API");
  }

  const endpoint = `${apiUrl}/chat/getBase64FromMediaMessage/${params.instanceId}`;
  const payload = buildMediaPayload(params);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey as string,
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  let jsonBody: any = undefined;

  if (rawBody) {
    try {
      jsonBody = JSON.parse(rawBody);
    } catch (error) {
      // Keep raw body for debugging if needed
    }
  }

  if (!response.ok) {
    const message =
      (jsonBody && (jsonBody.message || jsonBody.error || jsonBody.reason)) ||
      `Evolution API respondeu com status ${response.status}`;
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).body = jsonBody ?? rawBody;

    if ([401, 403, 404, 410].includes(response.status)) {
      throw markAsMediaExpired(error, response.status);
    }

    throw error;
  }

  const base64: string | undefined =
    jsonBody?.base64 ??
    jsonBody?.data ??
    jsonBody?.result?.data ??
    jsonBody?.media?.data ??
    jsonBody?.media?.base64 ??
    jsonBody?.payload?.data;

  if (!base64 || typeof base64 !== "string") {
    throw new Error("Resposta inválida da Evolution API: campo base64 ausente");
  }

  const buffer = Buffer.from(base64, "base64");
  const mimetype: string | undefined =
    jsonBody?.mimetype ??
    jsonBody?.media?.mimetype ??
    jsonBody?.result?.mimetype ??
    jsonBody?.payload?.mimetype;

  return { buffer, mimetype };
}
