import axios from 'axios';
import { supabase } from '../supabase';
import { getUazapiTokenByInstanceNumber } from '../uazapi-supabase';
import type { MessageData, MediaData, SendResult } from '../types/sender.types';

/**
 * Adapter para enviar mensagens via UazAPI
 * Usa tokens armazenados no Supabase (tabela uazapi_instances)
 */
export class UazAPISender {
  private uazapiBaseUrl: string = 'https://api.uazapi.com';

  /**
   * Obter token da instância via Supabase
   */
  private async getInstanceToken(instanceNumber: string): Promise<string | null> {
    try {
      const record = await getUazapiTokenByInstanceNumber(instanceNumber);

      if (!record || !record.apiToken) {
        console.log(`ℹ️  Token UazAPI não configurado para ${instanceNumber}`);
        return null;
      }

      console.log(`🔑 Token UazAPI encontrado para ${instanceNumber}`);
      return record.apiToken;
    } catch (error: any) {
      console.warn(`⚠️  Erro ao buscar token UazAPI para ${instanceNumber}: ${error.message}`);
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
