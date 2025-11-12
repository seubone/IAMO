import axios from 'axios';
import { supabase } from '../supabase';
import { getUazapiTokenByInstanceNumber } from '../uazapi-supabase';
import type { MessageData, MediaData, SendResult } from '../types/sender.types';

/**
 * Adapter para enviar mensagens via UazAPI
 * Usa tokens armazenados no Supabase (tabela uazapi_instances)
 */
export class UazAPISender {
  private uazapiBaseUrl: string;

  constructor() {
    this.uazapiBaseUrl = process.env.UAZAPI_BASE_URL || 'https://quatro-cinco.uazapi.com';
  }

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
        number: data.recipientNumber,
        text: data.content,
      };

      // Log detalhado do request
      console.log('🔍 [UazAPI Request Debug]');
      console.log('  URL:', `${this.uazapiBaseUrl}/send/text`);
      console.log('  Token (primeiros 10 chars):', token.substring(0, 10) + '...');
      console.log('  Token (tamanho):', token.length);
      console.log('  Payload:', JSON.stringify(payload));

      const response = await axios.post(
        `${this.uazapiBaseUrl}/send/text`,
        payload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'token': token,
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

      // Log detalhado do erro
      console.error(`[UazAPI Error] Status: ${error.response?.status}, Message: ${error.message}`);
      if (error.response?.data) {
        console.error(`[UazAPI Response] ${JSON.stringify(error.response.data)}`);
      }

      return {
        success: false,
        api: 'uazapi',
        error: error.response?.data?.message || error.message || 'Erro ao enviar via UazAPI',
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
        `${this.uazapiBaseUrl}/send/media`,
        payload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'token': token,
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
