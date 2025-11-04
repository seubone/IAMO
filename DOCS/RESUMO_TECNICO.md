# 📊 Resumo Técnico - Sistema de Configuração de IAs

## Visão Geral

Sistema completo de gerenciamento de inteligências artificiais com suporte a:
- Configuração N8N workflows
- Agendamento de pausa com retomada automática
- Formatação customizável de mensagens
- Diferentes nomes para IA e Consultor

---

## Arquitetura

### Frontend (React)

```
client/src/
├── pages/
│   └── ia-admin.tsx              # Página de administração
├── components/
│   ├── IAConfigPanel.tsx         # Formulário de edição
│   └── InstanceSettingsDialog.tsx # Integração
└── types/
    └── ia-config.ts             # Tipos TypeScript
```

### Backend (Express)

```
server/
├── routes/
│   └── ia-config.routes.ts       # Endpoints de API
├── migrations/
│   ├── create-ias-table.sql      # Criar tabela
│   ├── extend-ias-table.sql      # Estender campos
│   ├── create-bot-instances-table.sql
│   └── run-all-migrations.ts     # Script automático
└── routes.ts                     # Registro de rotas
```

### Banco de Dados (PostgreSQL/Supabase)

```
public.ias                        # Tabela principal
├── Basic Info (id, name, status, tags)
├── Names (ai_name, consultant_name)
├── N8N Config (workflow_id, webhook_url, etc)
├── Pause Schedule (pause_until, pause_reason)
├── Messages (prefix_template, use_ai_prefix, etc)
└── Metadata (created_at, updated_at, etc)

public.bot_instances              # Instâncias de bots
├── Foreign key (instance_id)
├── Bot config (name, activity)
└── Message formatting
```

---

## Database Schema

### Tabela: `ias`

| Campo | Tipo | Descrição |
|-------|------|----------|
| `id` | VARCHAR(36) | UUID primária |
| `name` | TEXT | Nome da IA |
| `status` | ia_status | active, paused, inactive |
| `ai_name` | VARCHAR(100) | "Maria Luzia" (maiúsculo) |
| `consultant_name` | VARCHAR(100) | "Maria luzia" (minúsculo) |
| `n8n_workflow_id` | VARCHAR(255) | ID do workflow |
| `n8n_workflow_name` | VARCHAR(255) | Nome do workflow |
| `n8n_webhook_url` | TEXT | URL para triggers |
| `n8n_trigger_type` | VARCHAR(50) | webhook, schedule, manual |
| `n8n_last_execution_timestamp` | TIMESTAMP | Última execução |
| `n8n_config` | JSONB | Config adicional |
| `pause_until` | TIMESTAMP | Quando retomar |
| `pause_reason` | VARCHAR(255) | Por que pausou |
| `message_prefix_template` | TEXT | Template customizável |
| `use_ai_prefix` | BOOLEAN | Usar prefixo IA |
| `use_consultant_prefix` | BOOLEAN | Usar prefixo Consultor |
| `description` | TEXT | Descrição |
| `avatar_url` | TEXT | URL do avatar |
| `category` | ia_category | sales, support, etc |
| `model_version` | VARCHAR(50) | Versão do modelo |
| `performance_score` | DECIMAL(5,2) | Score 0-100 |
| `last_modified_by` | VARCHAR(255) | Quem modificou |
| `last_modified_at` | TIMESTAMP | Quando modificou |
| `created_at` | TIMESTAMP | Criado em |
| `updated_at` | TIMESTAMP | Atualizado em |

### Índices

```sql
idx_ias_status              -- Para filtrar por status
idx_ias_ai_name             -- Para buscar por nome
idx_ias_category            -- Para filtrar categoria
idx_ias_n8n_workflow_id     -- Para vincular N8N
idx_ias_pause_until         -- Para pausas agendadas
idx_ias_created_at          -- Para ordenação
idx_ias_updated_at          -- Para ordenação
```

### Triggers & Functions

```sql
update_ias_updated_at()         -- Atualiza timestamp automaticamente
resume_paused_ias()              -- Retoma IAs quando pause_until expira
update_bot_instances_updated_at() -- Para tabela bot_instances
```

### RLS Policies (Segurança)

- `Allow authenticated users to read ias`
- `Allow authenticated users to insert ias`
- `Allow authenticated users to update ias`
- `Allow authenticated users to delete ias`

---

## API Endpoints

### GET `/api/ias/:id`
Obter configuração básica da IA

**Response:**
```json
{
  "id": "uuid",
  "name": "IA Vendas",
  "aiName": "Maria Luzia",
  "consultantName": "Maria luzia",
  "status": "active",
  "n8nWorkflowId": "abc123",
  ...
}
```

### PATCH `/api/ias/:id`
Atualizar configuração

**Request:**
```json
{
  "aiName": "Maria Luzia",
  "consultantName": "Maria luzia",
  "n8nWorkflowId": "abc123",
  "pauseUntil": "2024-01-20T10:00:00Z",
  "messagePrefixTemplate": "*{name}:*\n",
  "useAiPrefix": true
}
```

### POST `/api/ias/:id/pause`
Pausar IA com agendamento

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
  "data": { /* IA object */ }
}
```

### POST `/api/ias/:id/resume`
Retomar IA pausada

### GET `/api/ias/:id/config`
Obter configuração estruturada

**Response:**
```json
{
  "id": "...",
  "name": "...",
  "aiName": "Maria Luzia",
  "consultantName": "Maria luzia",
  "n8n": {
    "workflowId": "abc123",
    "webhookUrl": "...",
    "triggerType": "webhook"
  },
  "pause": {
    "until": null,
    "reason": null
  },
  "messages": {
    "prefixTemplate": "*{name}:*\n",
    "useAiPrefix": true
  }
}
```

### GET `/api/ias/:id/preview`
Preview de formatação de mensagens

**Response:**
```json
{
  "aiMessage": "*Maria Luzia:*\nOlá! Como posso ajudar?",
  "consultantMessage": "*Maria luzia:*\nVou verificar...",
  "template": "*{name}:*\n",
  "aiName": "Maria Luzia",
  "consultantName": "Maria luzia"
}
```

---

## Frontend Components

### IAConfigPanel

**Props:**
```typescript
interface IAConfigPanelProps {
  iaId: string;
  onClose?: () => void;
}
```

**Funcionalidades:**
- Form para editar nome da IA
- Auto-geração de nome do Consultor
- Configuração N8N (ID, webhook, trigger)
- Agendamento de pausa com datetime picker
- Seletor de template de prefixo (5 opções)
- Checkboxes para usar/não usar prefixos
- Preview em tempo real de mensagens

**Validações:**
- Nome da IA deve ter 2+ palavras
- Cada palavra deve começar com maiúscula

### IAAdminPage

**Funcionalidades:**
- Listar todas as IAs em tabela
- Filtro por status (active, paused, inactive)
- Botão para criar nova IA
- Botão para editar (abre IAConfigPanel)
- Botão para deletar com confirmação
- Informações de status, category, workflow

---

## TypeScript Types

### Arquivo: `shared/ia-config.types.ts`

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

interface N8NWorkflowConfig {
  workflowId: string;
  workflowName: string;
  webhookUrl: string;
  triggerType: 'webhook' | 'schedule' | 'manual' | 'trigger_node' | 'other';
  lastExecutionTimestamp?: Date;
  config?: Record<string, any>;
}

interface IAPauseSchedule {
  until: Date;
  reason: string;
}
```

### Funções Utilitárias

```typescript
// Gera nome do Consultor a partir do nome da IA
function generateConsultantNameFromAI(aiName: string): string {
  // "Maria Luzia" → "Maria luzia"
  // Lowercasa a primeira letra do último nome
}

// Formata mensagem com prefixo
function formatMessageWithAIPrefix(
  message: string,
  name: string,
  template: string
): string {
  // Substitui {name} no template e prepend à mensagem
}
```

---

## Fluxo de Funcionamento

### 1. Criar IA

```
User clicks "Nova IA"
    ↓
Dialog com campo de nome
    ↓
POST /api/ias { name: "..." }
    ↓
Cria IA com status "active"
    ↓
Retorna à lista
```

### 2. Editar IA

```
User clicks "Editar"
    ↓
GET /api/ias/:id (carrega dados)
    ↓
IAConfigPanel exibe formulário
    ↓
User altera campos
    ↓
Preview em tempo real de mensagens
    ↓
User clicks "Salvar"
    ↓
PATCH /api/ias/:id { ...updated fields }
    ↓
Toast de sucesso
    ↓
Invalidate queries e recarrega lista
```

### 3. Pausar IA

```
User seleciona data/hora em "Agendamento de Pausa"
    ↓
POST /api/ias/:id/pause { pauseUntil, reason }
    ↓
Server atualiza: status = "paused", pause_until = data
    ↓
Trigger resume_paused_ias() roda periodicamente
    ↓
Quando pause_until chegar, IA auto-retoma
```

### 4. Formatação de Mensagens

```
User configura: aiName = "Maria Luzia"
    ↓
Frontend gera: consultantName = "Maria luzia"
    ↓
User seleciona template: "*{name}:*\n"
    ↓
Quando mensagem é enviada:
  IA: "*Maria Luzia:*\nOlá! Como posso ajudar?"
  Consultor: "*Maria luzia:*\nVou verificar..."
```

---

## Performance & Otimizações

### Índices
- 7 índices principais para queries rápidas
- Índice específico para pausas agendadas (WHERE status = 'paused')

### Query Patterns

```sql
-- Buscar IAs ativas
SELECT * FROM ias WHERE status = 'active'

-- Buscar IAs com workflow específico
SELECT * FROM ias WHERE n8n_workflow_id = 'abc123'

-- Buscar IAs pausadas que devem retomar
SELECT * FROM ias WHERE status = 'paused' AND pause_until <= NOW()

-- Buscar por categoria
SELECT * FROM ias WHERE category = 'sales'
```

### Caching

Frontend usa React Query com:
- Automatic stale-time management
- Invalidation on mutations
- Optimistic updates (próximo passo)

---

## Segurança

### Autenticação
- JWT tokens obrigatórios em todas as rotas
- Verificação no middleware `authMiddleware`

### Permissões
- Middleware `requirePermission("ias:update")`
- Middleware `requirePermission("ias:read")`
- Suportado por RBAC (Role-Based Access Control)

### RLS (Row Level Security)
- Supabase RLS policies habilitadas
- Apenas usuários autenticados podem acessar
- Políticas para SELECT, INSERT, UPDATE, DELETE

### Sanitização
- Inputs validados com Zod
- Nomes de IA validados (2+ palavras, maiúsculas)
- URLs validadas

---

## Monitoring & Auditoria

### Campos de Auditoria

```typescript
last_modified_by: string    // ID do usuário que modificou
last_modified_at: TIMESTAMP // Quando foi modificado
created_at: TIMESTAMP       // Criado em
updated_at: TIMESTAMP       // Atualizado em (auto)
status_history: JSONB       // Histórico de mudanças
```

### Logging

API logs:
- Erro ao atualizar IA
- Erro ao pausar IA
- Sucesso em operações

---

## Próximas Melhorias (Sugeridas)

1. **Webhooks**
   - Notificar quando IA é pausada
   - Notificar quando IA retoma

2. **Integração com N8N**
   - Validar URL do webhook automaticamente
   - Testar conexão antes de salvar

3. **Dashboard**
   - Gráficos de performance
   - Histórico de execuções N8N

4. **Backup/Restore**
   - Exportar configuração de IA em JSON
   - Importar configuração previamente salva

5. **Alertas**
   - Email quando IA falha N8N workflow
   - Slack integration

---

## Checklist de Deploy

- [ ] SQL executado no Supabase
- [ ] `npm run build` sem erros
- [ ] `npm run dev` inicia sem erros
- [ ] Frontend carrega em http://localhost:3000
- [ ] Consegue criar nova IA
- [ ] Consegue editar IA
- [ ] Preview de mensagens funciona
- [ ] Pode agendar pausa
- [ ] API endpoints respondem (testar com Postman/curl)
- [ ] RLS policies estão ativas
- [ ] Deployment em produção

---

## Referências

- [Documentação Supabase](https://supabase.com/docs)
- [PostgreSQL JSON](https://www.postgresql.org/docs/current/datatype-json.html)
- [N8N Docs](https://docs.n8n.io)
- [React Query](https://tanstack.com/query/latest)
- [Express.js](https://expressjs.com)

---

**Implementação concluída com sucesso! 🎉**
