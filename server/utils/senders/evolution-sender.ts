import axios from 'axios';
import type { MessageData, MediaData, SendResult } from '../types/sender.types';

/**
 * Adapter para enviar mensagens via Evolution API
 * Usa a conexão já existente com o servidor Evolution
 */
export class EvolutionSender {
  private evolutionBaseUrl: string;

  constructor(baseUrl: string = process.env.EVOLUTION_API_URL || 'http://localhost:8080') {
    this.evolutionBaseUrl = baseUrl;
  }

  private sanitizeIdentifier(value?: string | null): string | null {
    if (!value) return null;
    const digitsOnly = String(value).replace(/[^0-9]/g, "");
    return digitsOnly.length > 0 ? digitsOnly : null;
  }

  /**
   * Enviar mensagem de texto via Evolution
   */
  async sendMessage(data: MessageData): Promise<SendResult> {
    const startTime = Date.now();

    try {
      const payload = {
        number: data.recipientNumber,
        text: data.content,
      };

      const response = await axios.post(
        `${this.evolutionBaseUrl}/message/sendText/${data.instanceNumber}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': `${process.env.EVOLUTION_API_KEY}`,
          },
          timeout: 30000,
        }
      );

      const latency = Date.now() - startTime;

      return {
        success: true,
        api: 'evolution',
        messageId: response.data?.key?.id || response.data?.id || `evolution-${Date.now()}`,
        data: response.data,
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;

      // Log detalhado do erro
      console.error(`[Evolution Error] Status: ${error.response?.status}, Message: ${error.message}`);
      if (error.response?.data) {
        console.error(`[Evolution Response] ${JSON.stringify(error.response.data)}`);
      }

      return {
        success: false,
        api: 'evolution',
        error: error.response?.data?.message || error.message || 'Erro ao enviar via Evolution',
        latency,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Enviar mídia via Evolution
   */
  async sendMedia(data: MediaData): Promise<SendResult> {
    const startTime = Date.now();

    try {
      const payload = {
        number: data.recipientNumber,
        mediaUrl: data.file,
        caption: data.caption,
        mediaType: data.type,
      };

      const response = await axios.post(
        `${this.evolutionBaseUrl}/message/sendMedia/${data.instanceNumber}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EVOLUTION_API_KEY}`,
          },
          timeout: 30000,
        }
      );

      const latency = Date.now() - startTime;

      return {
        success: true,
        api: 'evolution',
        messageId: response.data?.key?.id || response.data?.id || `evolution-${Date.now()}`,
        data: response.data,
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;

      return {
        success: false,
        api: 'evolution',
        error: error.message || 'Erro ao enviar mídia via Evolution',
        latency,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
