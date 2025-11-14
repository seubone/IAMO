# Setup: Criar e Gerenciar Instâncias WhatsApp

## Resumo Executivo

Este guia descreve como configurar e criar instâncias WhatsApp via Evolution API. **O QR Code é OBRIGATÓRIO** - será sempre gerado ao criar uma instância.

## Pré-requisitos

### 1. Configurar Credenciais (`.env`)

```env
# Evolution API Credentials
EVOLUTION_API_URL=https://seu-evolution-api.com
EVOLUTION_API_KEY=sua-chave-de-api-aqui
```

### 2. Verificar Configuração no Backend

Reinicie o servidor após atualizar o `.env`:

```bash
npm run dev:server
```

## Fluxo: Criar Nova Instância

### Via Interface Gráfica

1. **Navegue para** `/chat`
2. **Clique no botão "+"** (criar instância) na sidebar
3. **Preencha o formulário:**
   - Nome da Instância (obrigatório)
   - Número do WhatsApp (opcional)
   - Tipo de Integração (Baileys ou Business)
   - Configurações avançadas (aba "Avançado")

4. **Clique em "Criar Instância"**
   - Sistema gerará automaticamente um QR Code
   - QR Code será exibido na tela

5. **Escaneie o QR Code:**
   - Abra WhatsApp no celular
   - Escaneie o código
   - Aguarde a conexão

### Via API REST

```bash
curl -X POST http://localhost:5000/api/instances \
  -H "Authorization: Bearer {seu-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "bot-vendas-001",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true,
    "alwaysOnline": true,
    "readMessages": true,
    "readStatus": true,
    "rejectCall": false
  }'
```

## Gerar QR Code em Instâncias Desconectadas

Quando uma instância fica desconectada, você pode gerar um novo QR Code para reconectar:

### Via Interface

1. Localize a instância desconectada na lista
2. Clique no botão "Gerar QR Code"
3. Um novo dialog aparecerá com o QR Code
4. Escaneie para reconectar

### Via API

```bash
curl -X GET http://localhost:5000/api/instances/{instanceId}/connect \
  -H "Authorization: Bearer {seu-token}"
```

## Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/instances` | Criar instância (com QR Code automático) |
| GET | `/api/instances` | Listar todas as instâncias |
| GET | `/api/instances/{id}/connect` | Gerar QR Code / Conectar |
| PUT | `/api/instances/{id}/restart` | Reiniciar instância |
| DELETE | `/api/instances/{id}/logout` | Fazer logout |
| DELETE | `/api/instances/{id}` | Deletar instância |
| GET | `/api/instances/{id}/connection-state` | Obter estado da conexão |
| POST | `/api/instances/{id}/presence` | Definir presença |

## Componentes Frontend

### CreateInstanceDialog
Componente para criar novas instâncias com:
- Abas (Básico e Avançado)
- Geração automática de QR Code
- Validação de formulário
- Toast notifications

**Localização:** `client/src/components/CreateInstanceDialog.tsx`

### RegenerateQRCodeDialog
Componente para gerar QR Code em instâncias desconectadas:
- Dialog modal
- Geração de novo QR Code
- Instruções de conexão

**Localização:** `client/src/components/RegenerateQRCodeDialog.tsx`

## APIs Centralizadas

### evolutionInstancesAPI
Todas as operações com instâncias Evolution:

```typescript
import { evolutionInstancesAPI } from "@/lib/apis";

// Criar instância
const response = await evolutionInstancesAPI.create({
  instanceName: "meu-bot",
  integration: "WHATSAPP-BAILEYS",
  qrcode: true,
});

// Listar instâncias
const instances = await evolutionInstancesAPI.list();

// Gerar QR Code
const qrCode = await evolutionInstancesAPI.connect(instanceId);
```

**Localização:** `client/src/lib/apis.ts`

## Configurações Avançadas

### Comportamento da Instância

| Configuração | Descrição | Padrão |
|-------------|-----------|---------|
| Sempre Online | Status sempre disponível | true |
| Marcar como Lido | Marca mensagens como lidas | true |
| Ler Status | Acesso a stories | true |
| Rejeitar Chamadas | Rejeita calls automaticamente | false |

## Tratamento de Erros

### "Evolution API não está configurada"
**Solução:** Verifique se `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` estão no `.env` e reinicie o servidor.

### "QR Code não foi gerado"
**Solução:** Verifique conectividade com a Evolution API e se as credenciais estão corretas.

### "Instância não conecta"
**Solução:**
1. Verifique o status com: `GET /api/instances/{id}/connection-state`
2. Gere um novo QR Code: `GET /api/instances/{id}/connect`
3. Se persistir, faça logout e tente novamente

## Estrutura de Arquivos

```
Criação de Instâncias:
├── server/
│   ├── services/evolution-instances.ts (Lógica)
│   └── routes/instances.routes.ts (API REST)
│
├── client/
│   ├── src/components/
│   │   ├── CreateInstanceDialog.tsx (Criar nova)
│   │   └── RegenerateQRCodeDialog.tsx (Gerar QR Code)
│   │
│   └── src/lib/
│       └── apis.ts (Cliente HTTP centralizado)
│
└── docs/
    └── SETUP_INSTANCIAS.md (Este arquivo)
```

## Fluxo de Dados

```
User Interface
    ↓
CreateInstanceDialog.tsx
    ↓
evolutionInstancesAPI.create()
    ↓
POST /api/instances
    ↓
BackendRoutes (instances.routes.ts)
    ↓
evolution-instances.ts Service
    ↓
Evolution API (Remote)
    ↓
QR Code Response
    ↓
Dialog exibe QR Code
    ↓
User escaneia com celular
    ↓
Instância conectada
```

## Best Practices

1. **Sempre gere QR Code** - Não deixe instância desconectada sem QR Code
2. **Monitore conexão** - Verifique status regularmente com `connection-state`
3. **Nome descritivo** - Use nomes que identifiquem claramente a instância
4. **Integração correta** - Escolha o tipo certo (Baileys vs Business)
5. **Teste webhook** - Se usar, teste a conexão antes de usar em produção

## FAQ

**P: Preciso informar o número do WhatsApp?**
R: Não, é opcional. Sem o número, o sistema gera um QR Code para você.

**P: Posso criar múltiplas instâncias?**
R: Sim, crie quantas precisar. Cada uma terá seu próprio QR Code.

**P: O QR Code expira?**
R: Sim, após alguns minutos. Se expirar, gere um novo.

**P: Posso alterar configurações após criar?**
R: Sim, use o endpoint PATCH da IA associada na tabela `bot_instances`.

---

**Última atualização:** 2025-11-14
