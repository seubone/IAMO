/**
 * Tipos para o sistema unificado de envio de mensagens
 */

export interface MessageData {
  instanceNumber: string;
  recipientNumber: string;
  content: string;
}

export interface MediaData {
  instanceNumber: string;
  recipientNumber: string;
  file: string; // base64 ou URL
  type: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
}

export interface SendResult {
  success: boolean;
  api: 'evolution' | 'uazapi';
  messageId?: string;
  data?: any;
  error?: string;
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
