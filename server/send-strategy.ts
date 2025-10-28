import { EvolutionSender } from './senders/evolution-sender';
import { UazAPISender } from './senders/uazapi-sender';
import { supabase } from './supabase';
import type {
  MessageData,
  MediaData,
  SendResult,
  SendAPI,
  TestSendResult
} from './types/sender.types';

/**
 * UnifiedSender - Gerencia envio de mensagens com múltiplas APIs
 * Implementa estratégias de failover e testes comparativos
 */
export class UnifiedSender {
  private evolutionSender: EvolutionSender;
  private uazapiSender: UazAPISender;

  constructor() {
    this.evolutionSender = new EvolutionSender();
    this.uazapiSender = new UazAPISender();
  }

  /**
   * Obter configuração de envio da instância (do Supabase)
   * Retorna 'evolution' como padrão se a tabela não existir ou houver erro
   */
  async getSendConfig(instanceNumber: string): Promise<SendAPI> {
    try {
      const { data, error } = await supabase
        .from('uazapi_instances')
        .select('send_api')
        .eq('instance_number', instanceNumber)
        .maybeSingle();

      if (error) {
        // Se tabela não existe ou coluna não existe, usar fallback
        console.warn(`⚠️  Aviso ao obter configuração de envio (${error.code}): ${error.message}. Usando Evolution como padrão.`);
        return 'evolution';
      }

      if (!data) {
        // Instância não encontrada na Supabase, usar padrão
        console.log(`📋 Instância ${instanceNumber} não encontrada em uazapi_instances. Usando Evolution como padrão.`);
        return 'evolution';
      }

      const api = (data.send_api as SendAPI) || 'evolution';
      console.log(`📤 Configuração de envio para ${instanceNumber}: ${api}`);
      return api;
    } catch (error: any) {
      console.error(`❌ Erro crítico ao obter configuração de envio: ${error?.message || error}`);
      return 'evolution';
    }
  }

  /**
   * Salvar configuração de envio (no Supabase)
   * Usa UPSERT para criar instância se não existir
   * Se a tabela não existir, apenas registra aviso (não é crítico)
   */
  async setSendConfig(instanceNumber: string, sendAPI: SendAPI): Promise<void> {
    try {
      const { error } = await supabase
        .from('uazapi_instances')
        .upsert({
          instance_number: instanceNumber,
          send_api: sendAPI,
          api_token: '', // Token vazio por padrão se não existir
        }, {
          onConflict: 'instance_number'
        });

      if (error) {
        // Se tabela não existe, apenas avisar (não é bloqueante)
        console.warn(`⚠️  Aviso ao salvar configuração de envio (${error.code}): ${error.message}. Configuração não foi persistida no Supabase.`);
        // Não lançar erro, pois o envio pode continuar funcionar via Evolution
        return;
      }

      console.log(`✅ Configuração de envio atualizada: ${instanceNumber} -> ${sendAPI}`);
    } catch (error: any) {
      console.warn(`⚠️  Erro ao salvar configuração de envio: ${error?.message || error}. Configuração não foi persistida.`);
      // Não lançar erro, pois o envio pode continuar funcionar via Evolution
    }
  }

  /**
   * Enviar mensagem com estratégia automática
   * Se uma API falhar, tenta a outra como fallback
   */
  async sendMessage(data: MessageData): Promise<SendResult> {
    const config = await this.getSendConfig(data.instanceNumber);

    console.log(`📤 Enviando mensagem via ${config} para ${data.recipientNumber}`);

    switch (config) {
      case 'evolution':
        return await this.sendViaEvolution(data);

      case 'uazapi':
        return await this.sendViaUazAPI(data);

      default:
        return await this.sendViaEvolution(data);
    }
  }

  /**
   * Enviar mensagem via Evolution
   */
  private async sendViaEvolution(data: MessageData): Promise<SendResult> {
    const result = await this.evolutionSender.sendMessage(data);

    if (result.success) {
      console.log(`✅ Mensagem enviada via Evolution (${result.latency}ms)`);
      return result;
    }

    // Fallback automático: tenta UazAPI se Evolution falhar
    console.warn(`⚠️  Evolution falhou, tentando UazAPI...`);
    const uazapiResult = await this.uazapiSender.sendMessage(data);

    if (uazapiResult.success) {
      console.log(`✅ Mensagem enviada via UazAPI (fallback, ${uazapiResult.latency}ms)`);
      return {
        ...uazapiResult,
        note: 'Enviado via UazAPI (Evolution falhou)',
      };
    }

    console.error(`❌ Ambas as APIs falharam`);
    return {
      success: false,
      api: 'evolution',
      error: `Evolution: ${result.error} | UazAPI: ${uazapiResult.error}`,
      latency: result.latency + uazapiResult.latency,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Enviar mensagem via UazAPI
   */
  private async sendViaUazAPI(data: MessageData): Promise<SendResult> {
    const result = await this.uazapiSender.sendMessage(data);

    if (result.success) {
      console.log(`✅ Mensagem enviada via UazAPI (${result.latency}ms)`);
      return result;
    }

    // Fallback automático: tenta Evolution se UazAPI falhar
    console.warn(`⚠️  UazAPI falhou, tentando Evolution...`);
    const evolutionResult = await this.evolutionSender.sendMessage(data);

    if (evolutionResult.success) {
      console.log(`✅ Mensagem enviada via Evolution (fallback, ${evolutionResult.latency}ms)`);
      return {
        ...evolutionResult,
        note: 'Enviado via Evolution (UazAPI falhou)',
      };
    }

    console.error(`❌ Ambas as APIs falharam`);
    return {
      success: false,
      api: 'uazapi',
      error: `UazAPI: ${result.error} | Evolution: ${evolutionResult.error}`,
      latency: result.latency + evolutionResult.latency,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Enviar mídia com estratégia automática
   */
  async sendMedia(data: MediaData): Promise<SendResult> {
    const config = await this.getSendConfig(data.instanceNumber);

    console.log(`📸 Enviando mídia via ${config} para ${data.recipientNumber}`);

    switch (config) {
      case 'evolution':
        return await this.sendMediaViaEvolution(data);

      case 'uazapi':
        return await this.sendMediaViaUazAPI(data);

      default:
        return await this.sendMediaViaEvolution(data);
    }
  }

  private async sendMediaViaEvolution(data: MediaData): Promise<SendResult> {
    const result = await this.evolutionSender.sendMedia(data);

    if (result.success) {
      console.log(`✅ Mídia enviada via Evolution`);
      return result;
    }

    // Fallback automático
    console.warn(`⚠️  Evolution falhou, tentando UazAPI...`);
    const uazapiResult = await this.uazapiSender.sendMedia(data);

    if (uazapiResult.success) {
      console.log(`✅ Mídia enviada via UazAPI (fallback)`);
      return {
        ...uazapiResult,
        note: 'Enviado via UazAPI (Evolution falhou)',
      };
    }

    return {
      success: false,
      api: 'evolution',
      error: `Evolution: ${result.error} | UazAPI: ${uazapiResult.error}`,
      latency: result.latency + uazapiResult.latency,
      timestamp: new Date().toISOString(),
    };
  }

  private async sendMediaViaUazAPI(data: MediaData): Promise<SendResult> {
    const result = await this.uazapiSender.sendMedia(data);

    if (result.success) {
      console.log(`✅ Mídia enviada via UazAPI`);
      return result;
    }

    // Fallback automático
    console.warn(`⚠️  UazAPI falhou, tentando Evolution...`);
    const evolutionResult = await this.evolutionSender.sendMedia(data);

    if (evolutionResult.success) {
      console.log(`✅ Mídia enviada via Evolution (fallback)`);
      return {
        ...evolutionResult,
        note: 'Enviado via Evolution (UazAPI falhou)',
      };
    }

    return {
      success: false,
      api: 'uazapi',
      error: `UazAPI: ${result.error} | Evolution: ${evolutionResult.error}`,
      latency: result.latency + evolutionResult.latency,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Testar envio com ambas as APIs (para comparação)
   */
  async testSend(
    instanceNumber: string,
    recipientNumber: string,
    message: string,
    apis: ('evolution' | 'uazapi')[] = ['evolution', 'uazapi']
  ): Promise<TestSendResult> {
    console.log(`🧪 Testando envio para ${recipientNumber} via ${apis.join(', ')}`);

    const data: MessageData = {
      instanceNumber,
      recipientNumber,
      content: `🧪 Teste de envio - ${new Date().toLocaleTimeString('pt-BR')} - ${message}`,
    };

    const results: TestSendResult = {
      summary: {
        successCount: 0,
        failureCount: 0,
      },
    };

    if (apis.includes('evolution')) {
      const result = await this.evolutionSender.sendMessage(data);
      results.evolution = result;
      if (result.success) results.summary.successCount++;
      else results.summary.failureCount++;
    }

    if (apis.includes('uazapi')) {
      const result = await this.uazapiSender.sendMessage(data);
      results.uazapi = result;
      if (result.success) results.summary.successCount++;
      else results.summary.failureCount++;
    }

    // Determinar API mais rápida
    const latencies = [
      results.evolution?.latency || Infinity,
      results.uazapi?.latency || Infinity,
    ];
    const minLatency = Math.min(...latencies);

    if (minLatency !== Infinity) {
      if (results.evolution?.latency === minLatency) {
        results.summary.fastestAPI = 'evolution';
      } else if (results.uazapi?.latency === minLatency) {
        results.summary.fastestAPI = 'uazapi';
      }
      results.summary.fastestLatency = minLatency;
    }

    console.log(`✅ Teste concluído:`, results.summary);
    return results;
  }
}

// Exportar instância singleton
export const unifiedSender = new UnifiedSender();
