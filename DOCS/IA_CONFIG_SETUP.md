# IA Configuration Setup Guide

## 🎯 Overview

Sistema completo de gerenciamento de configurações de IAs com suporte a:
- ✅ Nomes de IA e Consultor com prefixos diferenciados
- ✅ Integração com workflows do N8N
- ✅ Agendamento de pausa com retomada automática
- ✅ Formatação customizável de mensagens
- ✅ Interface intuitiva no frontend

---

## 📊 Estrutura do Banco de Dados

### Tabela: `ias` (Estendida)

A tabela `ias` foi estendida com novos campos para suportar as funcionalidades.

**Campos Adicionados:**

#### IA Names (com prefixos)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `ai_name` | VARCHAR(100) | Nome da IA com iniciais maiúsculas (ex: "Maria Luzia") |
| `consultant_name` | VARCHAR(100) | Nome do Consultor com inicial do sobrenome minúscula (ex: "Maria luzia") |

#### N8N Workflow Configuration
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `n8n_workflow_id` | VARCHAR(255) | ID do workflow no N8N |
| `n8n_workflow_name` | VARCHAR(255) | Nome do workflow |
| `n8n_webhook_url` | TEXT | URL do webhook para triggers |
| `n8n_trigger_type` | VARCHAR(50) | Tipo: webhook, schedule, manual, etc |
| `n8n_last_execution_timestamp` | TIMESTAMP | Última execução do workflow |
| `n8n_config` | JSONB | Configuração adicional do N8N |

#### Pause Schedule
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `pause_until` | TIMESTAMP | Quando retomar se pausada |
| `pause_reason` | VARCHAR(255) | Motivo da pausa |

#### Message Formatting
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `message_prefix_template` | TEXT | Template customizável (default: `*{name}:*\n`) |
| `use_ai_prefix` | BOOLEAN | Usar prefixo em mensagens da IA |
| `use_consultant_prefix` | BOOLEAN | Usar prefixo em mensagens do consultor |

#### Additional Configuration
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `description` | TEXT | Descrição detalhada da IA |
| `avatar_url` | TEXT | URL do avatar/foto |
| `category` | VARCHAR(50) | Categoria: sales, support, marketing, billing, onboarding |
| `model_version` | VARCHAR(50) | Versão do modelo de IA |
| `performance_score` | DECIMAL(5,2) | Score de performance (0-100) |
| `last_modified_by` | VARCHAR(255) | ID do usuário que modificou |
| `last_modified_at` | TIMESTAMP | Quando foi modificado |

### Índices Criados

```sql
idx_ias_status                  -- Para filtrar por status
idx_ias_ai_name                 -- Para buscar por nome da IA
idx_ias_n8n_workflow_id         -- Para vincular com N8N
idx_ias_pause_until             -- Para IAs pausadas com agendamento
idx_ias_category                -- Para filtrar por categoria
```

### Triggers Criados

- `resume_paused_ias()` - Retoma automaticamente IAs que tiveram sua pausa agendada expirada
- `update_ias_modified_at()` - Atualiza timestamp de modificação automaticamente

---

## 🚀 Migração do Banco de Dados

### Executar a Migration

**Opção 1: Script TypeScript**
```bash
npx tsx server/migrations/run-migration.ts
```

**Opção 2: Supabase Dashboard**
1. Vá para SQL Editor
2. Cole o conteúdo de `server/migrations/extend-ias-table.sql`
3. Clique em "Run"

**Arquivo:** `server/migrations/extend-ias-table.sql`

---

## 🔐 Padrão de Nomes

### IA vs Consultor

O sistema diferencia automaticamente entre mensagens de IA e Consultor através dos nomes:

**IA:** `"Maria Luzia"` (iniciais maiúsculas)
```
*Maria Luzia:*
Olá! Como posso ajudar?
```

**Consultor:** `"Maria luzia"` (inicial do sobrenome minúscula)
```
*Maria luzia:*
Vou verificar isso para você.
```

### Geração Automática

O nome do consultor é **gerado automaticamente** a partir do nome da IA:

```typescript
generateConsultantNameFromAI("Maria Luzia") // → "Maria luzia"
generateConsultantNameFromAI("João Silva") // → "João silva"
```

---

## 💬 Formatação de Mensagens

### Templates Customizáveis

Por padrão:
```
*{name}:*\n
```

Outras opções:
```
[{name}]\n           // [Maria Luzia]\nOlá!
{name}: {message}    // Maria Luzia: Olá!
→ {name}: {message}  // → Maria Luzia: Olá!
```

### Controle por Tipo

Cada IA pode ter configurações diferentes:
- `use_ai_prefix` - Usar prefixo em mensagens da IA
- `use_consultant_prefix` - Usar prefixo em mensagens do consultor

---

## 🛠️ Configuração N8N

### Campos Suportados

- **Workflow ID**: Identificador único do workflow no N8N
- **Webhook URL**: URL para triggers do webhook
- **Trigger Type**: webhook, schedule, manual, trigger_node, other
- **Last Execution**: Timestamp da última execução
- **Config**: JSONB com configurações adicionais

### Exemplo de Uso

```typescript
n8nWorkflowId: "abc123def456"
n8nWorkflowName: "Atendimento de Vendas"
n8nWebhookUrl: "https://n8n.example.com/webhook/sales-flow"
n8nTriggerType: "webhook"
n8nConfig: {
  timeout: 30000,
  retryAttempts: 3,
  notifyOnCompletion: true
}
```

---

## ⏸️ Agendamento de Pausa

### Pausar uma IA

```bash
curl -X POST http://localhost:3000/api/ias/:id/pause \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pauseUntil": "2024-01-20T10:00:00Z",
    "reason": "Manutenção programada"
  }'
```

### Retomar uma IA

```bash
curl -X POST http://localhost:3000/api/ias/:id/resume \
  -H "Authorization: Bearer TOKEN"
```

### Retomada Automática

IAs podem ser resumidas automaticamente pela função trigger:
```sql
SELECT * FROM resume_paused_ias();
```

---

## 🎨 Frontend - Componente IAConfigPanel

### Localização

`client/src/components/IAConfigPanel.tsx`

### Props

```typescript
interface IAConfigPanelProps {
  iaId: string;           // ID da IA a configurar
  onClose?: () => void;   // Callback ao fechar
}
```

### Funcionalidades

✅ Editar nome da IA
✅ Preview automático do nome do consultor
✅ Configurar N8N workflow
✅ Agendar pausa com data/hora
✅ Customizar template de prefixo
✅ Preview em tempo real das mensagens
✅ Salvar todas as configurações

### Integração Exemplo

```tsx
import { IAConfigPanel } from "@/components/IAConfigPanel";

export function MyPage() {
  return (
    <IAConfigPanel
      iaId="550e8400-e29b-41d4-a716-446655440000"
      onClose={() => console.log("Closed")}
    />
  );
}
```

---

## 🔌 API Endpoints

### GET `/api/ias/:id`
Recuperar configuração completa da IA

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "IA Vendas",
  "status": "active",
  "aiName": "Maria Luzia",
  "consultantName": "Maria luzia",
  "description": "IA para atendimento de vendas",
  "category": "sales",
  "n8nWorkflowId": "abc123",
  "n8nWorkflowName": "Sales Flow",
  "pauseUntil": null,
  "pauseReason": null,
  "messagePrefixTemplate": "*{name}:*\n",
  "useAiPrefix": true,
  "useConsultantPrefix": true,
  "modelVersion": "gpt-4",
  "performanceScore": 95.5
}
```

### PATCH `/api/ias/:id`
Atualizar configuração (campos individuais ou múltiplos)

**Request:**
```json
{
  "aiName": "Maria Luzia",
  "description": "Nova descrição",
  "n8nWorkflowId": "xyz789",
  "messagePrefixTemplate": "*{name}:*\n",
  "useAiPrefix": true
}
```

### POST `/api/ias/:id/pause`
Pausar uma IA com agendamento

**Request:**
```json
{
  "pauseUntil": "2024-01-20T10:00:00Z",
  "reason": "Manutenção"
}
```

**Response:**
```json
{
  "success": true,
  "message": "IA pausada até 20/01/2024 10:00",
  "data": { /* ia object */ }
}
```

### POST `/api/ias/:id/resume`
Retomar uma IA pausada

**Response:**
```json
{
  "success": true,
  "message": "IA retomada com sucesso",
  "data": { /* ia object */ }
}
```

### GET `/api/ias/:id/config`
Obter configuração estruturada da IA

**Response:**
```json
{
  "id": "...",
  "name": "...",
  "status": "active",
  "aiName": "Maria Luzia",
  "consultantName": "Maria luzia",
  "n8n": {
    "workflowId": "abc123",
    "workflowName": "Sales Flow",
    "webhookUrl": "https://...",
    "triggerType": "webhook"
  },
  "pause": {
    "until": null,
    "reason": null
  },
  "messages": {
    "prefixTemplate": "*{name}:*\n",
    "useAiPrefix": true,
    "useConsultantPrefix": true
  }
}
```

### GET `/api/ias/:id/preview`
Obter preview de como as mensagens serão formatadas

**Response:**
```json
{
  "aiMessage": "*Maria Luzia:*\nOlá! Como posso ajudar?",
  "consultantMessage": "*Maria luzia:*\nOlá! Como posso ajudar?",
  "template": "*{name}:*\n",
  "aiName": "Maria Luzia",
  "consultantName": "Maria luzia"
}
```

---

## 📦 Tipos TypeScript

### IAConfigFormData

```typescript
interface IAConfigFormData {
  id: string;
  name: string;
  aiName?: string;
  consultantName?: string;
  description?: string;
  category?: 'sales' | 'support' | 'marketing' | 'billing' | 'onboarding' | 'other';
  avatarUrl?: string;
  status: 'active' | 'paused' | 'inactive';

  // N8N
  n8nWorkflowId?: string;
  n8nWorkflowName?: string;
  n8nWebhookUrl?: string;
  n8nTriggerType?: string;

  // Pause
  pauseUntil?: string;
  pauseReason?: string;

  // Messages
  messagePrefixTemplate?: string;
  useAiPrefix?: boolean;
  useConsultantPrefix?: boolean;

  // Other
  modelVersion?: string;
  performanceScore?: number;
  tags?: string[];
}
```

**Arquivo:** `shared/ia-config.types.ts`

---

## 🔐 Segurança

✅ Todas as rotas requerem autenticação JWT
✅ Validação de formato de nomes
✅ Sanitização de inputs
✅ Permissões baseadas em RBAC
✅ Auditoria de mudanças
✅ Timestamps de modificação

---

## 📋 Checklist de Implementação

- [x] Migração SQL criada
- [x] Schema TypeScript atualizado
- [x] Tipos criados (shared e client)
- [x] Componente IAConfigPanel criado
- [x] Rotas de API implementadas
- [x] Lógica de prefixos integrada
- [x] Compilação validada
- [ ] **Executar migração no banco de dados**
- [ ] **Integrar IAConfigPanel em uma página**
- [ ] **Testar no navegador**

---

## 🎓 Exemplos de Uso

### Configurar uma IA

```typescript
const updateIA = async () => {
  await fetch(`/api/ias/${iaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aiName: 'Carlos Silva',
      n8nWorkflowId: 'workflow_xyz',
      category: 'support',
      description: 'Suporte técnico 24/7'
    })
  });
};
```

### Pausar uma IA

```typescript
const pauseIA = async (until: Date) => {
  await fetch(`/api/ias/${iaId}/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pauseUntil: until.toISOString(),
      reason: 'Manutenção do servidor'
    })
  });
};
```

### Formatar mensagem com prefixo

```typescript
import { formatMessageWithAIPrefix } from '@/types/ia-config';

const message = "Olá! Como posso ajudar?";
const formatted = formatMessageWithAIPrefix(
  message,
  "Maria Luzia",
  "*{name}:*\n"
);
// Result: "*Maria Luzia:*\nOlá! Como posso ajudar?"
```

---

## 📚 Documentação Relacionada

- [BOT_INSTANCES_SETUP.md](./BOT_INSTANCES_SETUP.md) - Configuração de bots por instância
- [UAZAPI_DATABASE_SETUP.md](./UAZAPI_DATABASE_SETUP.md) - Configuração do Uazapi
- [INDEX.md](./INDEX.md) - Índice geral da documentação

---

## 🐛 Troubleshooting

### Erro: "Column 'ai_name' not found"

Você precisa executar a migração:
```bash
npx tsx server/migrations/run-migration.ts
```

### Nomes não aparecem customizados

Verifique se `useAiPrefix` e `useConsultantPrefix` estão como `true`.

### N8N webhook não funciona

Valide:
- A URL do webhook está correta
- O workflow existe no N8N
- As credenciais estão corretas
- O firewall permite a conexão

---

## 🚀 Próximos Passos

1. **Executar migração** no Supabase
2. **Integrar IAConfigPanel** em uma página (settings, admin, etc)
3. **Implementar lógica** de aplicação de prefixos nas mensagens
4. **Testar fluxo completo** de configuração e uso
5. **Monitorar performance** da IA

---

## 📞 Suporte

Para dúvidas ou issues, consulte:
- Documentação dos tipos em `shared/ia-config.types.ts`
- Componente em `client/src/components/IAConfigPanel.tsx`
- Rotas em `server/routes/ia-config.routes.ts`
