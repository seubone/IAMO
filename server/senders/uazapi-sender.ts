import axios from 'axios';
import { evolutionPool } from '../evolution-db';
import type { MessageData, MediaData, SendResult } from '../types/sender.types';

/**
 * Adapter para enviar mensagens via UazAPI
 * Usa tokens armazenados na tabela uazapi_instances
 */
export class UazAPISender {
  private uazapiBaseUrl: string = 'https://api.uazapi.com';

  /**
   * Obter token da instância
   */
  private async getInstanceToken(instanceNumber: string): Promise<string | null> {
    try {
      const result = await evolutionPool.query(
        'SELECT api_token FROM uazapi_instances WHERE instance_number = $1',
        [instanceNumber]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].api_token;
    } catch (error) {
      console.error('Erro ao buscar token UazAPI:', error);
      return null;
    }
  }

  /**
   * Enviar mensagem de texto via UazAPI
   */
  async sendMessage(data: MessageData): Promise<SendResult> {
    const startTime = Date.now();

    try {
      const token = await this.getInstanceToken(data.instanceNumber);

      if (!token) {
        const latency = Date.now() - startTime;
        return {
          success: false,
          api: 'uazapi',
          error: 'Token UazAPI não configurado para esta instância',
          latency,
          timestamp: new Date().toISOString(),
        };
      }

      const payload = {
        phone: data.recipientNumber,
        message: data.content,
      };

      const response = await axios.post(
        `${this.uazapiBaseUrl}/v2/send-message`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      const latency = Date.now() - startTime;

      return {
        success: true,
        api: 'uazapi',
        messageId: response.data?.id || `uazapi-${Date.now()}`,
        data: response.data,
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;

      return {
        success: false,
        api: 'uazapi',
        error: error.message || 'Erro ao enviar via UazAPI',
        latency,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Enviar mídia via UazAPI
   */
  async sendMedia(data: MediaData): Promise<SendResult> {
    const startTime = Date.now();

    try {
      const token = await this.getInstanceToken(data.instanceNumber);

      if (!token) {
        const latency = Date.now() - startTime;
        return {
          success: false,
          api: 'uazapi',
          error: 'Token UazAPI não configurado para esta instância',
          latency,
          timestamp: new Date().toISOString(),
        };
      }

      const payload = {
        phone: data.recipientNumber,
        mediaUrl: data.file,
        caption: data.caption,
        mediaType: data.type,
      };

      const response = await axios.post(
        `${this.uazapiBaseUrl}/v2/send-media`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      const latency = Date.now() - startTime;

      return {
        success: true,
        api: 'uazapi',
        messageId: response.data?.id || `uazapi-${Date.now()}`,
        data: response.data,
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;

      return {
        success: false,
        api: 'uazapi',
        error: error.message || 'Erro ao enviar mídia via UazAPI',
        latency,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
