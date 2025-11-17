# 📨 API de Envio de Mensagens - Documentação Completa

## 🎯 Visão Geral Rápida

O sistema suporta **dois provedores de API** (Evolution API e UazAPI) com **failover automático**. As mensagens são enviadas de forma **assíncrona** (retorna imediatamente, processa em background).

---

## 📍 Endpoints Principais

### 1. **Enviar Mensagem de Texto**
```
POST /api/whatsapp/send-message
```

**Autenticação:** ✅ JWT Bearer Token (via authMiddleware)

**Payload:**
```json
{
  "instanceNumber": "5511999999999",
  "recipientNumber": "5511988888888",
  "text": "Olá! Esta é uma mensagem de teste."
}
```

**Validação:**
- `instanceNumber`: Obrigatório (formato: 55 + DDD + número)
- `recipientNumber`: Obrigatório (apenas dígitos, 8-15)
- `text`: Obrigatório (conteúdo da mensagem)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Mensagem sendo processada",
  "messageId": "pending-1731858523456",
  "status": "pending"
}
```

**Erros Possíveis:**
- 400: Campos obrigatórios faltando
- 400: Número inválido (formato errado)
- 404: Instância não encontrada
- 400: Instância desconectada

**File:** `server/routes.ts` (lines 1616-1708)

---

### 2. **Enviar Áudio**
```
POST /api/whatsapp/send-audio
```

**Payload:**
```json
{
  "instanceNumber": "5511999999999",
  "recipientNumber": "5511988888888",
  "audio": "data:audio/wav;base64,UklGRi4A...",
  "waveformData": [0, 10, 20, 30, 20, 10, 0],
  "duration": 3.5
}
```

**Campos:**
- `audio`: Base64 codificado (WAV/MP3)
- `waveformData` (opcional): Array de valores para visualização
- `duration` (opcional): Duração em segundos

**Response:** Mesmo que send-message

**File:** `server/routes.ts` (lines 1711-1798)

---

### 3. **Enviar Mídia (Genérico)**
```
POST /api/whatsapp/send-media
```

**Payload:**
```json
{
  "instanceNumber": "5511999999999",
  "recipientNumber": "5511988888888",
  "type": "image",
  "file": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "text": "Legenda da imagem",
  "docName": "opcional-para-documentos.pdf"
}
```

**Tipos Suportados:**
- `image` - JPG, PNG
- `video` - MP4, AVI
- `audio` - MP3, M4A, OGG
- `document` - PDF, DOC, DOCX, XLS
- `ptt` - Push-to-Talk (áudio WhatsApp)
- `myaudio` - Formato customizado
- `sticker` - Sticker WebP

**Campos:**
- `type`: Obrigatório (um dos tipos acima)
- `file`: Obrigatório (URL ou Base64)
- `text`: Opcional (legenda/descrição)
- `docName`: Opcional (nome do documento)

**Response:** Mesmo que send-message com metadados adicionais

**File:** `server/routes.ts` (lines 1802-1910)

---

## ⚙️ Configuração de API

### 4. **Obter Configuração Atual**
```
GET /api/send-config/:instanceNumber
```

**Response:**
```json
{
  "instanceNumber": "5511999999999",
  "sendAPI": "evolution"
}
```

**File:** `server/routes.ts` (lines 2379-2398)

---

### 5. **Alterar API de Envio**
```
PUT /api/send-config/:instanceNumber
```

**Payload:**
```json
{
  "sendAPI": "evolution"
}
```

**Valores Válidos:**
- `evolution` - Evolution API (padrão)
- `uazapi` - UazAPI

**Response:**
```json
{
  "success": true,
  "instanceNumber": "5511999999999",
  "sendAPI": "evolution"
}
```

**File:** `server/routes.ts` (lines 2401-2427)

---

### 6. **Testar Ambas as APIs**
```
POST /api/whatsapp/test-send
```

**Payload:**
```json
{
  "instanceNumber": "5511999999999",
  "recipientNumber": "5511988888888",
  "message": "Mensagem de teste (opcional)"
}
```

**Response:**
```json
{
  "evolution": {
    "success": true,
    "api": "evolution",
    "messageId": "3EB0XXXXXXXXXXXXX",
    "latency": 245,
    "timestamp": "2025-11-17T14:20:00Z"
  },
  "uazapi": {
    "success": true,
    "api": "uazapi",
    "messageId": "msg_XXXXXXXXXXXXX",
    "latency": 312,
    "timestamp": "2025-11-17T14:20:00Z"
  },
  "summary": {
    "successCount": 2,
    "failureCount": 0,
    "fastestAPI": "evolution",
    "fastestLatency": 245
  }
}
```

**File:** `server/routes.ts` (lines 2498-2521)

---

## 🔧 Configuração de Ambiente

**File:** `.env.example`

```bash
# Evolution API
EVOLUTION_API_URL=https://seu-evolution-api.com
EVOLUTION_API_KEY=sua-api-key-aqui

# UazAPI
UAZAPI_BASE_URL=https://quatro-cinco.uazapi.com
```

---

## 📊 Arquitetura de Envio

### Fluxo de Decisão

```
Cliente envia POST /api/whatsapp/send-message
    ↓
Backend valida parametros
    ↓
UnifiedSender verifica config (Supabase)
    ↓
┌─────────────────────────────────────┐
│  Qual API está configurada?         │
├─────────────────────────────────────┤
│ Evolution → tenta Evolution primeiro │
│            → fallback: UazAPI        │
├─────────────────────────────────────┤
│ UazAPI → tenta UazAPI primeiro      │
│          → fallback: Evolution      │
└─────────────────────────────────────┘
    ↓
API escolhida processa
    ↓
Retorna resultado (sucesso ou erro)
    ↓
Responde ao cliente (status pending)
    ↓
Background: Processa e sincroniza
```

### Senders Implementados

**Evolution API Sender**
- File: `server/utils/senders/evolution-sender.ts`
- Base URL: `{EVOLUTION_API_URL}/message/sendText/{instanceNumber}`
- Auth: API Key via header

**UazAPI Sender**
- File: `server/utils/senders/uazapi-sender.ts`
- Base URL: `{UAZAPI_BASE_URL}/send/text`
- Auth: Token via header (armazenado em Supabase)

---

## 🎨 Integração Frontend

**File:** `client/src/lib/api.ts`

```typescript
export const whatsappAPI = {
  sendMessage: async (data) => {
    return await apiRequest("/api/whatsapp/send-message", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  sendMedia: async (data) => {
    return await apiRequest("/api/whatsapp/send-media", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },
};
```

**File:** `client/src/pages/chat.tsx`

```typescript
// Enviar texto
const sendMessageMutation = useMutation({
  mutationFn: (content: string) =>
    whatsappAPI.sendMessage({
      instanceNumber,
      recipientNumber,
      text: content,
    }),
  onSuccess: () => {
    setMessage("");
    // Invalidar cache para atualizar UI
  },
  onError: (error) => {
    toast({ variant: "destructive", title: "Erro", description: error.message });
  },
});

// Enviar mídia
const sendMediaMutation = useMutation({
  mutationFn: (file: string) =>
    whatsappAPI.sendMedia({
      instanceNumber,
      recipientNumber,
      type: "image",
      file: file,
      text: "Legenda",
    }),
});
```

---

## ✅ Validações Implementadas

### Backend

1. **Parâmetros Obrigatórios**
   - `instanceNumber` deve estar presente
   - `recipientNumber` deve estar presente
   - `text`/`file` deve estar presente

2. **Formato de Números**
   - Instância: `55[DDD][0-9]{8,9}` (formato brasileiro)
   - Destinatário: `\d{8,15}` (apenas dígitos)

3. **Estado da Instância**
   - Instância deve existir no banco
   - Instância deve estar conectada (status = "open")

4. **Tipo de Mídia**
   - Valida se tipo está em: image, video, audio, document, ptt, myaudio, sticker

### Frontend

- Verificação de conversa selecionada
- Verificação de conteúdo não vazio
- Toast de erro com mensagem descritiva

---

## 🔄 Retry e Failover

### Estratégia Automática

1. **Tentativa Primária**
   - Tenta a API configurada
   - Registra latência e resultado

2. **Failover Automático**
   - Se falhar, tenta a outra API automaticamente
   - Sem necessidade de retentativa manual

3. **Cache de Configuração**
   - Config é cached por 5 minutos
   - Reduz queries em 50-200ms por requisição

4. **Logs Detalhados**
   - Registra qual API foi usada
   - Mostra latência de cada tentativa
   - Masks tokens (segurança)

---

## 📈 Performance

| Métrica | Valor |
|---------|-------|
| **Cache Config TTL** | 5 minutos |
| **Timeout por API** | 30 segundos |
| **Latência Evolution** | ~200-300ms |
| **Latência UazAPI** | ~250-350ms |
| **Fallback automático** | ✅ Sim |
| **Async processing** | ✅ Sim |

---

## 🚨 Tratamento de Erros

### Possíveis Erros

```
400 Bad Request
├─ "Campos obrigatórios faltando"
├─ "Número do destinatário inválido"
├─ "Número da instância inválido"
├─ "Tipo de mídia inválido"
└─ "Instância sem status de conexão"

404 Not Found
└─ "Instância não encontrada"

500 Internal Server Error
├─ "Erro ao processar no Evolution API"
├─ "Erro ao processar no UazAPI"
└─ "Ambas as APIs falharam"
```

### Resposta de Erro

```json
{
  "success": false,
  "error": "Descrição do erro",
  "timestamp": "2025-11-17T14:20:00Z"
}
```

---

## 📝 Exemplo Completo - Enviar Mensagem

### Request
```bash
curl -X POST http://localhost:5051/api/whatsapp/send-message \
  -H "Authorization: Bearer seu-token-jwt" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceNumber": "5511999999999",
    "recipientNumber": "5511988888888",
    "text": "Olá! Esta é uma mensagem de teste."
  }'
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Mensagem sendo processada",
  "messageId": "pending-1731858523456",
  "status": "pending"
}
```

### Logs do Backend
```
📨 Fetching messages:
  instanceId: 61ea3cdd-57d7-4aea-9d79-1d6d6ebffc2c
  timestamp: 2025-11-17T14:20:00.000Z

📊 Checking send config for instance...
✅ Config retrieved from cache (5min TTL)

🔀 Evolution API selected

📤 Sending via Evolution API
  URL: https://eve.seubone.com/message/sendText/5511999999999
  Recipient: 5511988888888
  Timeout: 30000ms

✅ Message sent successfully (Evolution)
  MessageID: 3EB012345678901234567890
  Latency: 245ms
  Timestamp: 2025-11-17T14:20:01.245Z
```

---

## 🔐 Segurança

- ✅ JWT Bearer Token obrigatório
- ✅ Validação de entrada (tipo e formato)
- ✅ Token masking nos logs (primeiros 10 chars apenas)
- ✅ Timeout contra requisições hanging
- ✅ Rate limiting não implementado (considerar adicionar)

---

## 📚 Arquivos Relacionados

| Arquivo | Função |
|---------|--------|
| `server/routes.ts` | Endpoints HTTP |
| `server/utils/send-strategy.ts` | Lógica de decisão de API |
| `server/utils/senders/evolution-sender.ts` | Evolution API client |
| `server/utils/senders/uazapi-sender.ts` | UazAPI client |
| `client/src/lib/api.ts` | API client frontend |
| `client/src/pages/chat.tsx` | Interface de envio |
| `.env.example` | Variáveis de ambiente |

---

**Última Atualização:** 17/11/2025
**Versão:** 1.0
