/**
 * Tipos para o sistema unificado de envio de mensagens
 */

export interface MessageData {
  instanceNumber: string; // número da instância (normalizado)
  instanceRemoteJid?: string; // remoteJid da instância (sem @s.whatsapp.net)
  recipientNumber: string;
  content: string;
}

export interface MediaData {
  instanceNumber: string;
  instanceRemoteJid?: string;
  recipientNumber: string;
  file: string; // base64 ou URL
  type: 'image' | 'video' | 'audio' | 'document' | 'myaudio' | 'ptt' | 'sticker';
  caption?: string;
  docName?: string; // Nome do arquivo para documents
}

export interface SendResult {
  success: boolean;
  api: 'evolution' | 'uazapi';
  messageId?: string;
  data?: any;
  error?: string;
  note?: string; // Usado para fallback (ex: "Enviado via UazAPI (Evolution falhou)")
  latency: number; // em ms
  timestamp: string; // ISO 8601
}

export type SendAPI = 'evolution' | 'uazapi';

export interface SendConfig {
  instanceNumber: string;
  sendAPI: SendAPI;
}

export interface TestSendResult {
  evolution?: SendResult;
  uazapi?: SendResult;
  summary: {
    successCount: number;
    failureCount: number;
    fastestAPI?: 'evolution' | 'uazapi';
    fastestLatency?: number;
  };
}
