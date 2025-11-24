# 🔧 Instance N8N Workflows Configuration

**Data:** 2025-11-24
**Versão:** v1.0.35+
**Objetivo:** Associar workflows N8N com instâncias do Evolution WhatsApp

---

## 📋 Overview

Este sistema permite associar múltiplos workflows do N8N com cada instância do Evolution WhatsApp. Cada instância pode ter seus próprios workflows configurados, permitindo automação de diferentes processos para cada instância.

### ✨ Principais Recursos

- ✅ **Múltiplos workflows por instância** - Cada instância pode ter vários workflows
- ✅ **Ativação/Desativação independente** - Controle granular de workflows
- ✅ **Webhook triggers** - Disparo automático via webhook
- ✅ **Gatilho manual** - Teste e gatilho direto via API
- ✅ **Rastreamento de execução** - Log de última execução e erros
- ✅ **Configuração customizável** - JSONB config por workflow

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: `instance_n8n_workflows`

```sql
CREATE TABLE instance_n8n_workflows (
  id BIGSERIAL PRIMARY KEY,

  -- Referência da instância
  instance_id UUID NOT NULL,
  instance_number VARCHAR(20) NOT NULL,

  -- Configuração do workflow
  workflow_id VARCHAR(255) NOT NULL,
  workflow_name VARCHAR(255) NOT NULL,
  webhook_url TEXT,
  trigger_type VARCHAR(50) DEFAULT 'webhook', -- webhook, schedule, manual, trigger_node, other

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP,
  last_error_message TEXT,
  last_error_at TIMESTAMP,

  -- Configuração customizada
  config JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(instance_id, workflow_id),
  UNIQUE(instance_number, workflow_id)
);
```

### Índices

```
- idx_instance_n8n_workflows_instance_id
- idx_instance_n8n_workflows_instance_number
- idx_instance_n8n_workflows_workflow_id
- idx_instance_n8n_workflows_is_active
- idx_instance_n8n_workflows_trigger_type
```

---

## 🚀 Setup Inicial

### 1. Criar Tabela no Supabase

Executar o script de migration:

```bash
npx tsx server/migrations/run-instance-workflows-migration.ts
```

Ou manualmente via Supabase Dashboard:
1. Vá para: **SQL Editor**
2. Cole o conteúdo de: `server/migrations/create-instance-n8n-workflows-table.sql`
3. Clique em **Run**

### 2. Verificar Imports

Os seguintes arquivos já estão atualizados:
- ✅ `server/routes.ts` - Rota registrada em `/api/instances`
- ✅ `server/routes/instance-workflows.routes.ts` - Endpoints criados
- ✅ `server/services/instance-workflows.ts` - Serviço de dados
- ✅ `shared/instance-workflow.types.ts` - Tipos TypeScript

---

## 📡 API Endpoints

### 1. Listar Workflows de uma Instância

```http
GET /api/instances/:instanceNumber/workflows
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "instance_id": "550e8400-e29b-41d4-a716-446655440000",
      "instance_number": "5511999999999",
      "workflow_id": "workflow-001",
      "workflow_name": "Auto Reply Bot",
      "webhook_url": "https://n8n.example.com/webhook/abc123",
      "trigger_type": "webhook",
      "is_active": true,
      "last_triggered_at": "2025-11-24T10:30:00Z",
      "config": {},
      "created_at": "2025-11-24T08:00:00Z",
      "updated_at": "2025-11-24T10:30:00Z"
    }
  ],
  "count": 1
}
```

### 2. Listar Apenas Workflows Ativos

```http
GET /api/instances/:instanceNumber/workflows/active
Authorization: Bearer <token>
```

**Response:** Mesmo formato acima, apenas workflows com `is_active: true`

### 3. Criar Novo Workflow para Instância

```http
POST /api/instances/:instanceNumber/workflows
Authorization: Bearer <token>
Content-Type: application/json

{
  "instance_id": "550e8400-e29b-41d4-a716-446655440000",
  "workflow_id": "workflow-001",
  "workflow_name": "Auto Reply Bot",
  "webhook_url": "https://n8n.example.com/webhook/abc123",
  "trigger_type": "webhook",
  "config": {
    "max_retries": 3,
    "timeout_ms": 5000
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow associated with instance successfully",
  "data": { /* workflow object */ }
}
```

### 4. Obter Workflow Específico

```http
GET /api/instances/:instanceNumber/workflows/:workflowId
Authorization: Bearer <token>
```

### 5. Atualizar Workflow

```http
PATCH /api/instances/:instanceNumber/workflows/:workflowId
Authorization: Bearer <token>
Content-Type: application/json

{
  "workflow_name": "Updated Bot Name",
  "webhook_url": "https://n8n.example.com/webhook/new-url",
  "trigger_type": "schedule",
  "is_active": false,
  "config": { /* new config */ }
}
```

### 6. Deletar Workflow

```http
DELETE /api/instances/:instanceNumber/workflows/:workflowId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow dissociated from instance successfully"
}
```

### 7. Disparo Manual de Workflow

```http
POST /api/instances/:instanceNumber/workflows/:workflowId/trigger
Authorization: Bearer <token>
Content-Type: application/json

{
  "payload": {
    "message": "Test message",
    "custom_field": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow triggered successfully",
  "data": {
    "workflow_id": "workflow-001",
    "instance_number": "5511999999999",
    "response": { /* N8N webhook response */ },
    "duration_ms": 245
  }
}
```

### 8. Ativar/Desativar Workflow (Toggle)

```http
POST /api/instances/:instanceNumber/workflows/:workflowId/toggle
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow activated successfully",
  "data": { /* updated workflow */ }
}
```

---

## 📦 TypeScript Types

### `InstanceN8NWorkflow`

```typescript
interface InstanceN8NWorkflow {
  id: number;
  instance_id: string;
  instance_number: string;
  workflow_id: string;
  workflow_name: string;
  webhook_url?: string;
  trigger_type: 'webhook' | 'schedule' | 'manual' | 'trigger_node' | 'other';
  is_active: boolean;
  last_triggered_at?: string;
  last_error_message?: string;
  last_error_at?: string;
  config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

### `CreateInstanceN8NWorkflowRequest`

```typescript
interface CreateInstanceN8NWorkflowRequest {
  instance_id: string;
  instance_number: string;
  workflow_id: string;
  workflow_name: string;
  webhook_url?: string;
  trigger_type?: 'webhook' | 'schedule' | 'manual' | 'trigger_node' | 'other';
  config?: Record<string, any>;
}
```

---

## 💻 Backend Service

### `InstanceWorkflowsService`

Arquivo: `server/services/instance-workflows.ts`

**Métodos Disponíveis:**

```typescript
// Criar workflow
static async createWorkflow(data: CreateInstanceN8NWorkflowRequest): Promise<InstanceN8NWorkflow>

// Obter workflows de uma instância
static async getInstanceWorkflows(instanceId: string): Promise<InstanceN8NWorkflow[]>
static async getInstanceWorkflowsByNumber(instanceNumber: string): Promise<InstanceN8NWorkflow[]>

// Obter workflow específico
static async getWorkflow(instanceId: string, workflowId: string): Promise<InstanceN8NWorkflow | null>

// Atualizar workflow
static async updateWorkflow(
  instanceId: string,
  workflowId: string,
  data: UpdateInstanceN8NWorkflowRequest
): Promise<InstanceN8NWorkflow>

// Deletar workflow
static async deleteWorkflow(instanceId: string, workflowId: string): Promise<void>

// Log de execução
static async logExecution(
  instanceNumber: string,
  workflowId: string,
  status: 'pending' | 'success' | 'failed' | 'timeout',
  response?: Record<string, any>,
  error?: string,
  durationMs?: number
): Promise<void>

// Obter workflows ativos
static async getActiveWorkflows(instanceNumber: string): Promise<InstanceN8NWorkflow[]>

// Verificar se há workflows ativos
static async hasActiveWorkflows(instanceNumber: string): Promise<boolean>

// Deletar todos os workflows de uma instância
static async deleteInstanceWorkflows(instanceNumber: string): Promise<void>
```

---

## 🔗 Integração com N8N

### Webhook Setup no N8N

1. **Criar Webhook Node:**
   - Adicione um nó "Webhook" no seu workflow N8N
   - Configure como "Receive" e HTTP method POST
   - Copie a URL gerada

2. **Associar no Sistema:**
   ```bash
   POST /api/instances/5511999999999/workflows
   {
     "instance_id": "550e8400-e29b-41d4-a716-446655440000",
     "workflow_id": "workflow-001",
     "workflow_name": "Auto Reply Bot",
     "webhook_url": "https://n8n.example.com/webhook/abc123",
     "trigger_type": "webhook"
   }
   ```

3. **Verificar Execução:**
   - Verifique logs em: `last_triggered_at`, `last_error_message`

### Trigger Types

- **webhook** - Disparado por POST request para webhook_url
- **schedule** - Disparado em horário programado (configurar no N8N)
- **manual** - Disparado manualmente via `/trigger` endpoint
- **trigger_node** - Usa "Trigger" node do N8N
- **other** - Tipo customizado

---

## 📊 Exemplo de Uso Completo

### Cenário: Configurar auto-resposta para uma instância

```bash
# 1. Criar workflow
curl -X POST http://localhost:5000/api/instances/5511999999999/workflows \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "instance_id": "550e8400-e29b-41d4-a716-446655440000",
    "workflow_id": "auto-reply-001",
    "workflow_name": "Auto Reply - Business Hours",
    "webhook_url": "https://n8n.example.com/webhook/auto-reply-abc123",
    "trigger_type": "webhook",
    "config": {
      "message": "Obrigado pela mensagem! Responderemos em breve.",
      "active_hours": "09:00-18:00"
    }
  }'

# 2. Listar workflows
curl -X GET http://localhost:5000/api/instances/5511999999999/workflows \
  -H "Authorization: Bearer <token>"

# 3. Testar disparo manual
curl -X POST http://localhost:5000/api/instances/5511999999999/workflows/auto-reply-001/trigger \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "test": true,
      "message": "Teste de auto-reply"
    }
  }'

# 4. Desativar workflow
curl -X POST http://localhost:5000/api/instances/5511999999999/workflows/auto-reply-001/toggle \
  -H "Authorization: Bearer <token>"
```

---

## 🔍 Monitoramento

### Logs de Execução

Cada workflow mantém:
- `last_triggered_at` - Última execução bem-sucedida
- `last_error_message` - Última mensagem de erro
- `last_error_at` - Quando o último erro ocorreu

### Querys Úteis

**Ver workflows ativos:**
```sql
SELECT * FROM instance_n8n_workflows
WHERE instance_number = '5511999999999' AND is_active = true;
```

**Ver histórico de erros:**
```sql
SELECT * FROM instance_n8n_workflows
WHERE instance_number = '5511999999999' AND last_error_message IS NOT NULL
ORDER BY last_error_at DESC;
```

**Ver execuções recentes:**
```sql
SELECT * FROM instance_n8n_workflows
WHERE instance_number = '5511999999999'
ORDER BY last_triggered_at DESC;
```

---

## ⚠️ Considerações Importantes

### RLS (Row Level Security)

Os endpoints já incluem autenticação via `authMiddleware`. Certifique-se de que:
1. ✅ Usuário está autenticado
2. ✅ Token JWT é válido
3. ✅ RLS policy permite acesso ao usuário

### Limites

- **Máximo de workflows por instância:** Sem limite (verificar capacidade do servidor)
- **Timeout de webhook:** 30 segundos (configurável)
- **Payload máximo:** 10MB

### Boas Práticas

1. **Validação de Webhook:**
   - Sempre validar URL do webhook antes de salvar
   - Testar disparo manual antes de usar em produção

2. **Tratamento de Erros:**
   - Configurar alertas para `last_error_message`
   - Implementar retry logic nos webhooks

3. **Performance:**
   - Usar indexes existentes para queries
   - Limpar workflows antigos/inativos periodicamente

---

## 📝 Próximas Melhorias

### v1.0.36

- [ ] Frontend UI para gerenciar workflows
- [ ] Validação de webhook URL antes de salvar
- [ ] Histórico de execuções em tabela separada
- [ ] Retry automático de falhas

### v1.0.37

- [ ] Integração com alertas (Slack, Email)
- [ ] Webhook signature verification
- [ ] Rate limiting por workflow
- [ ] Analytics de execução

### v1.0.38

- [ ] Múltiplas versões de workflows
- [ ] Rollback de versão
- [ ] Testing framework para workflows
- [ ] Simulação de execução

---

## 🔗 Arquivos Relacionados

| Arquivo | Propósito |
|---------|----------|
| `server/routes/instance-workflows.routes.ts` | Endpoints API |
| `server/services/instance-workflows.ts` | Lógica de negócios |
| `shared/instance-workflow.types.ts` | Tipos TypeScript |
| `server/migrations/create-instance-n8n-workflows-table.sql` | Schema SQL |
| `server/migrations/run-instance-workflows-migration.ts` | Script de migration |

---

## ❓ FAQ

**P: Posso ter múltiplos webhooks na mesma instância?**
R: Sim! Você pode associar vários workflows, cada um com seu próprio webhook.

**P: O que acontece se um webhook falhar?**
R: O erro é registrado em `last_error_message` e `last_error_at`. Não há retry automático (implemente no N8N).

**P: Como vincular isso com instâncias Evolution?**
R: Use `instance_id` e `instance_number` da tabela `Instance` do Evolution.

**P: Preciso alterar o frontend?**
R: Não imediatamente. Os endpoints já funcionam via curl/Postman. UI será adicionado em v1.0.36.

---

**Status:** ✅ Implementado e Pronto para Uso
**Commit:** (será adicionado)
**Branch:** main
