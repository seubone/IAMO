# Guia: Criar Instâncias Evolution API

Este documento descreve como criar e gerenciar instâncias WhatsApp via Evolution API integrado ao projeto.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Pré-requisitos](#pré-requisitos)
- [Criando uma Instância via UI](#criando-uma-instância-via-ui)
- [API REST](#api-rest)
- [Gerenciamento de Instâncias](#gerenciamento-de-instâncias)
- [Estrutura Técnica](#estrutura-técnica)

## 🎯 Visão Geral

A funcionalidade permite criar, gerenciar e conectar instâncias WhatsApp através da Evolution API. As instâncias são automaticamente sincronizadas com o banco de dados Supabase para controle de IAs e bots.

## 📋 Pré-requisitos

### Configuração de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no `.env`:

```env
# Evolution API
EVOLUTION_API_URL=https://your-evolution-api.com
EVOLUTION_API_KEY=your-api-key-here
```

## 🚀 Criando uma Instância via UI

### Por Interface Gráfica

1. **Abra a página de Chat** (`/chat`)
2. **Clique no botão "+" (Plus)** na barra lateral, ao lado dos botões de seleção de instância
3. **Preencha o formulário:**
   - **Nome da Instância** *(obrigatório)* - Ex: "minha-instancia"
   - **Número do WhatsApp** *(opcional)* - Se deixado em branco, você receberá um QR Code
   - **Tipo de Integração** - Escolha entre:
     - `WHATSAPP-BAILEYS` - Para contas pessoais (padrão)
     - `WHATSAPP-BUSINESS` - Para contas comerciais
   - **Opções adicionais:**
     - Gerar QR Code
     - Sempre Online
     - Marcar como Lido
     - Ler Status
     - Rejeitar Chamadas

4. **Clique em "Criar Instância"**
5. **Se QR Code foi gerado:**
   - Escaneie o código com seu celular
   - Aguarde a conexão ser estabelecida

## 🔌 API REST

### Criar Instância

```http
POST https://eve.seubone.com/instance/create
Content-Type: application/json
apikey: 429683C4C977415CAAFCCE10F7D57E11

{
  "instanceName": "minha-instancia",
  "token": "<string>",
  "qrcode": true,
  "number": "551199999999",
  "integration": "WHATSAPP-BAILEYS",
  "rejectCall": false,
  "msgCall": "<string>",
  "groupsIgnore": false,
  "alwaysOnline": true,
  "readMessages": true,
  "readStatus": true,
  "syncFullHistory": false,
  "proxyHost": "<string>",
  "proxyPort": "<string>",
  "proxyProtocol": "http",
  "proxyUsername": "<string>",
  "proxyPassword": "<string>",
  "webhook": {
    "url": "<string>",
    "byEvents": false,
    "base64": false,
    "headers": {},
    "events": []
  }
}
```

**Resposta (201 Created):**
```json
{
  "success": true,
  "instance": {
    "instanceId": "uuid-da-instancia",
    "instanceName": "minha-instancia",
    "instanceNumber": "551199999999",
    "status": "connecting",
    "qrcode": {
      "base64": "data:image/png;base64,..."
    }
  },
  "message": "Instância criada com sucesso"
}
```

### Listar Instâncias

```http
GET /api/instances
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "success": true,
  "count": 2,
  "instances": [
    {
      "instance": {
        "instanceName": "minha-instancia",
        "instanceId": "uuid-1",
        "instanceNumber": "551199999999",
        "status": "connected",
        "profileName": "Seu Nome",
        "profilePictureUrl": "https://..."
      }
    }
  ]
}
```

### Conectar Instância

```http
GET /api/instances/{instanceId}/connect
Authorization: Bearer {token}
```

### Obter Estado de Conexão

```http
GET /api/instances/{instanceId}/connection-state
Authorization: Bearer {token}
```

### Reiniciar Instância

```http
PUT /api/instances/{instanceId}/restart
Authorization: Bearer {token}
```

### Definir Presença

```http
POST /api/instances/{instanceId}/presence
Authorization: Bearer {token}
Content-Type: application/json

{
  "presence": "available"
}
```

Valores aceitos: `available`, `composing`, `recording`, `paused`

### Fazer Logout

```http
DELETE /api/instances/{instanceId}/logout
Authorization: Bearer {token}
```

### Deletar Instância

```http
DELETE /api/instances/{instanceId}
Authorization: Bearer {token}
```

## 🛠️ Gerenciamento de Instâncias

### Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `server/services/evolution-instances.ts` | Service com lógica de integração com Evolution API |
| `server/routes/instances.routes.ts` | Rotas HTTP para gerenciar instâncias |
| `client/src/components/CreateInstanceDialog.tsx` | Componente UI para criar instâncias |
| `client/src/components/ChatListSidebar.tsx` | Barra lateral com botão de criar instância |

### Fluxo de Criação

```
Frontend (CreateInstanceDialog)
    ↓
POST /api/instances
    ↓
Backend (instances.routes.ts)
    ↓
evolution-instances.ts → Evolution API
    ↓
Supabase (bot_instances)
    ↓
Resposta com QR Code (se aplicável)
```

## 📊 Estrutura Técnica

### Service: `evolution-instances.ts`

Exporta as seguintes funções:

```typescript
// Verificar configuração
isEvolutionApiConfigured(): boolean

// Validar dados
validateCreateInstancePayload(data: unknown): CreateEvolutionInstanceRequest

// Normalizar número
normalizePhoneNumber(number: string): string

// Operações
createInstance(payload: CreateEvolutionInstanceRequest): Promise<EvolutionInstanceResponse>
fetchInstances(): Promise<EvolutionInstance[]>
connectInstance(instance: string): Promise<any>
restartInstance(instance: string): Promise<any>
getInstanceConnectionState(instance: string): Promise<any>
logoutInstance(instance: string): Promise<any>
deleteInstance(instance: string): Promise<any>
setPresence(instance: string, presence: string): Promise<any>
```

### Componente: `CreateInstanceDialog.tsx`

Props:
```typescript
interface CreateInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

Estados:
- Formulário com validação
- QR Code display se gerado
- Loading states
- Toast notifications para sucesso/erro

## 🔐 Segurança

- Todas as rotas requerem autenticação JWT (`authMiddleware`)
- Evolution API Key é lida apenas do servidor (não exposta ao cliente)
- Instâncias são automaticamente registradas no Supabase após criação
- Validação de dados com Zod

## 📝 Exemplos cURL

### Criar Instância
```bash
curl --request POST \
  --url https://eve.seubone.com/instance/create \
  --header 'Content-Type: application/json' \
  --header 'apikey: 429683C4C977415CAAFCCE10F7D57E11' \
  --data '{
    "instanceName": "teste",
    "token": "<string>",
    "qrcode": true,
    "number": "<string>",
    "integration": "WHATSAPP-BAILEYS",
    "rejectCall": true,
    "msgCall": "<string>",
    "groupsIgnore": true,
    "alwaysOnline": true,
    "readMessages": true,
    "readStatus": true,
    "syncFullHistory": true,
    "proxyHost": "<string>",
    "proxyPort": "<string>",
    "proxyProtocol": "<string>",
    "proxyUsername": "<string>",
    "proxyPassword": "<string>",
    "webhook": {
      "url": "<string>",
      "byEvents": true,
      "base64": true,
      "headers": {
        "authorization": "<string>",
        "Content-Type": "<string>"
      },
      "events": [
        "APPLICATION_STARTUP"
      ]
    },
    "rabbitmq": {
      "enabled": true,
      "events": [
        "APPLICATION_STARTUP"
      ]
    },
    "sqs": {
      "enabled": true,
      "events": [
        "APPLICATION_STARTUP"
      ]
    },
    "chatwootAccountId": 123,
    "chatwootToken": "<string>",
    "chatwootUrl": "<string>",
    "chatwootSignMsg": true,
    "chatwootReopenConversation": true,
    "chatwootConversationPending": true,
    "chatwootImportContacts": true,
    "chatwootNameInbox": "<string>",
    "chatwootMergeBrazilContacts": true,
    "chatwootImportMessages": true,
    "chatwootDaysLimitImportMessages": 123,
    "chatwootOrganization": "<string>",
    "chatwootLogo": "<string>"
  }'
```

### Listar Instâncias
```bash
curl --request GET \
  --url http://localhost:5000/api/instances \
  --header 'Authorization: Bearer {token}'
```

### Deletar Instância
```bash
curl --request DELETE \
  --url http://localhost:5000/api/instances/instance-uuid \
  --header 'Authorization: Bearer {token}'
```

## 🐛 Troubleshooting

### "Evolution API não está configurada"
- Verifique se `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` estão no `.env`
- Reinicie o servidor após atualizar variáveis de ambiente

### "QR Code não aparece"
- Certifique-se de que `qrcode: true` foi enviado no payload
- Verifique se a Evolution API está respondendo corretamente

### Instância não conecta
- Verifique o `connectionState` via GET `/api/instances/{id}/connection-state`
- Tente reconectar via `GET /api/instances/{id}/connect`
- Se persistir, faça logout e tente novamente

## 📚 Referências

- [Evolution API Documentation](https://docs.evolution-api.com)
- [Zod Validation](https://zod.dev)
- [React Query](https://tanstack.com/query)

---

**Última atualização:** 2025-11-14
