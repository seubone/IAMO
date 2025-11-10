import crypto from 'crypto';
import axios from 'axios';

/**
 * Erro customizado para mídia expirada
 */
export class MediaExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaExpiredError';
  }
}

/**
 * Helper para retry com exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Não fazer retry em erros HTTP 403, 404, 410 (mídia expirada/não encontrada)
      if (error.response?.status === 403 || error.response?.status === 404 || error.response?.status === 410) {
        throw new MediaExpiredError(`Mídia expirada ou inacessível (HTTP ${error.response.status})`);
      }

      // Não fazer retry em erros que não são de rede
      if (error.code !== 'ENOTFOUND' && error.code !== 'ETIMEDOUT' && error.code !== 'ECONNRESET') {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`⚠️  Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms for URL error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Descriptografa mídia do WhatsApp usando a mediaKey
 * WhatsApp usa AES-256-CBC para criptografar arquivos de mídia
 */
export async function decryptWhatsAppMedia(
  encryptedUrl: string,
  mediaKeyBase64: string,
  mediaType: 'image' | 'video' | 'audio' | 'document'
): Promise<Buffer> {
  try {
    // Validar URL antes de tentar download
    if (!encryptedUrl || !encryptedUrl.startsWith('http')) {
      throw new Error(`URL inválida ou expirada: ${encryptedUrl}`);
    }

    // 1. Download do arquivo criptografado (.enc) com retry
    const response = await retryWithBackoff(async () => {
      return await axios.get(encryptedUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
    });

    const encryptedData = Buffer.from(response.data);
    
    // 2. Decodificar mediaKey de base64
    const mediaKey = Buffer.from(mediaKeyBase64, 'base64');
    
    // 3. Expandir a mediaKey usando HKDF
    const mediaKeyExpanded = expandMediaKey(mediaKey, mediaType);
    
    // 4. Extrair componentes de criptografia
    const iv = mediaKeyExpanded.slice(0, 16);
    const cipherKey = mediaKeyExpanded.slice(16, 48);
    // const macKey = mediaKeyExpanded.slice(48, 80); // Não usado por enquanto
    
    // 5. Remover MAC (últimos 10 bytes)
    const encFile = encryptedData.slice(0, -10);
    
    // 6. Descriptografar usando AES-256-CBC
    const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
    const decrypted = Buffer.concat([
      decipher.update(encFile),
      decipher.final()
    ]);
    
    return decrypted;
  } catch (error: any) {
    console.error('Erro ao descriptografar mídia WhatsApp:', error.message);
    throw new Error(`Falha na descriptografia: ${error.message}`);
  }
}

/**
 * Expande a mediaKey usando HKDF (HMAC-based Extract-and-Expand Key Derivation Function)
 */
function expandMediaKey(mediaKey: Buffer, mediaType: string): Buffer {
  // Mapa de tipos de mídia para string de contexto
  const typeMap: Record<string, string> = {
    'image': 'WhatsApp Image Keys',
    'video': 'WhatsApp Video Keys',
    'audio': 'WhatsApp Audio Keys',
    'document': 'WhatsApp Document Keys',
  };
  
  const info = Buffer.from(typeMap[mediaType] || 'WhatsApp Media Keys');
  
  // HKDF-Expand (simplificado)
  const salt = Buffer.alloc(32, 0); // Salt vazio
  
  // PRK (Pseudo-Random Key) - HMAC-SHA256
  const prk = crypto.createHmac('sha256', salt)
    .update(mediaKey)
    .digest();
  
  // OKM (Output Keying Material) - Expandir para 112 bytes
  // Cada bloco HMAC-SHA256 gera 32 bytes, então precisamos de 4 blocos (32 * 4 = 128 bytes)
  const okm: Buffer[] = [];
  let previousBlock = Buffer.alloc(0);
  
  for (let i = 1; i <= 4; i++) { // Apenas 4 iterações necessárias
    const hmac = crypto.createHmac('sha256', prk);
    hmac.update(previousBlock);
    hmac.update(info);
    hmac.update(Buffer.from([i]));
    
    previousBlock = hmac.digest();
    okm.push(previousBlock);
  }
  
  return Buffer.concat(okm).slice(0, 112);
}

/**
 * Converte buffer para base64 data URL
 */
export function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}
