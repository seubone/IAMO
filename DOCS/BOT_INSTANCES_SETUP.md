# Bot Instances Setup Guide

## 📋 Overview

O sistema de **Bot Instances** permite gerenciar IAs/Bots associados a instâncias do WhatsApp, com suporte a formatação customizável de mensagens e diferenciação automática entre mensagens de IA e consultor.

## 🗄️ Banco de Dados

### Tabela: `bot_instances`

A tabela `bot_instances` armazena a configuração de cada bot/IA vinculado a uma instância.

**Localização:** Supabase (banco remoto)

**Campos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGSERIAL PRIMARY KEY | ID único da configuração |
| `instance_id` | UUID UNIQUE NOT NULL | ID da instância (vinculado a `uazapi_instances`) |
| `instance_number` | VARCHAR(20) NOT NULL | Número da instância (ex: 5511999999999) |
| `instance_remote_jid` | VARCHAR(100) | JID remoto da instância |
| `has_bot_enabled` | BOOLEAN DEFAULT false | Se o bot está habilitado |
| `bot_name` | VARCHAR(100) | Nome da IA (ex: "Maria Luzia") |
| `consultant_name` | VARCHAR(100) | Nome do consultor (auto-gerado em minúsculo) |
| `bot_activity` | VARCHAR(255) | Função/atividade do bot |
| `message_prefix_template` | TEXT DEFAULT '*{name}:*\n' | Template customizável de prefixo |
| `use_prefix_for_bot` | BOOLEAN DEFAULT true | Usar prefixo em mensagens do bot |
| `use_prefix_for_consultant` | BOOLEAN DEFAULT true | Usar prefixo em mensagens do consultor |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data da última atualização |

### Índices

```sql
CREATE INDEX idx_bot_instances_instance_number ON public.bot_instances(instance_number);
CREATE INDEX idx_bot_instances_enabled ON public.bot_instances(has_bot_enabled) WHERE has_bot_enabled = true;
CREATE INDEX idx_bot_instances_instance_id ON public.bot_instances(instance_id);
```

## 🚀 Instalação da Tabela

### Opção 1: Executar via Script TypeScript (Recomendado)

```bash
# Certifique-se de ter as variáveis de ambiente configuradas
export SUPABASE_URL=sua_url_aqui
export SUPABASE_KEY=sua_chave_aqui

# Execute o script de migração
npx tsx server/migrations/run-migration.ts
```

### Opção 2: Executar Manualmente no Supabase

1. Vá para o **Supabase Dashboard**
2. Navegue até **SQL Editor**
3. Clique em **New Query**
4. Copie o conteúdo de `server/migrations/create-bot-instances-table.sql`
5. Cole no editor SQL
6. Clique em **Run**

### Opção 3: Usar Supabase CLI

```bash
# Criar nova migração
supabase migration new create_bot_instances_table

# Copiar o conteúdo de create-bot-instances-table.sql para a migração criada

# Executar migração
supabase migration up
```

## 📝 Estrutura dos Dados

### Padrão de Nomes

- **IA/Bot:** `"Maria Luzia"` (iniciais maiúsculas)
- **Consultor:** `"Maria luzia"` (inicial do sobrenome em minúsculo)

O nome do consultor é **gerado automaticamente** a partir do nome da IA.

### Template de Prefixo

O template é customizável por instância usando `{name}` como placeholder:

```
Padrão:     *{name}:*\n
Exemplo:    [{name}]\n
Simples:    {name}:
```

## 🔌 API Endpoints

### GET `/api/bot-config/:instanceNumber`

Recupera a configuração do bot para uma instância.

**Exemplo:**
```bash
curl -X GET http://localhost:3000/api/bot-config/5511999999999 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "instance_id": "550e8400-e29b-41d4-a716-446655440000",
  "instance_number": "5511999999999",
  "has_bot_enabled": true,
  "bot_name": "Maria Luzia",
  "consultant_name": "Maria luzia",
  "bot_activity": "Atendimento de vendas",
  "message_prefix_template": "*{name}:*\n",
  "use_prefix_for_bot": true,
  "use_prefix_for_consultant": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### POST `/api/bot-config`

Cria ou atualiza a configuração do bot.

**Request:**
```json
{
  "instance_id": "550e8400-e29b-41d4-a716-446655440000",
  "instance_number": "5511999999999",
  "has_bot_enabled": true,
  "bot_name": "Maria Luzia",
  "bot_activity": "Atendimento de vendas",
  "message_prefix_template": "*{name}:*\n",
  "use_prefix_for_bot": true,
  "use_prefix_for_consultant": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuração do bot salva com sucesso",
  "data": { /* bot config object */ }
}
```

### DELETE `/api/bot-config/:instanceNumber`

Deleta a configuração do bot para uma instância.

**Exemplo:**
```bash
curl -X DELETE http://localhost:3000/api/bot-config/5511999999999 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** 204 No Content

### GET `/api/bot-config/:instanceNumber/preview`

Obtém um preview de como as mensagens serão formatadas.

**Example:**
```bash
curl -X GET http://localhost:3000/api/bot-config/5511999999999/preview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "botMessage": "*Maria Luzia:*\nOlá! Como posso ajudar?",
  "consultantMessage": "*Maria luzia:*\nVou verificar isso para você.",
  "template": "*{name}:*\n",
  "botName": "Maria Luzia",
  "consultantName": "Maria luzia"
}
```

## 💻 Frontend - Interface de Configuração

### Componente: `BotConfigDialog`

Localização: `client/src/components/BotConfigDialog.tsx`

**Funcionalidades:**
- Toggle para habilitar/desabilitar o bot
- Input do nome do bot com validação de formato
- Preview auto-gerado do nome do consultor
- Input da atividade do bot
- Configuração customizável de prefixos
- Preview em tempo real das mensagens

**Uso:**
```tsx
<BotConfigDialog
  instanceNumber="5511999999999"
  instanceId="550e8400-e29b-41d4-a716-446655440000"
  instanceName="Lá de Vendas Maria"
/>
```

### Integração no `InstanceSettingsDialog`

O `BotConfigDialog` está integrado como uma aba adicional no `InstanceSettingsDialog`:

```tsx
<Tabs defaultValue="token">
  <TabsList>
    <TabsTrigger value="token">Token Uazapi</TabsTrigger>
    <TabsTrigger value="bot">Bot/IA</TabsTrigger>
  </TabsList>

  <TabsContent value="bot">
    <BotConfigDialog {...props} />
  </TabsContent>
</Tabs>
```

## 📦 Backend - Funções Utilitárias

### `bot-instances-supabase.ts`

Localização: `server/bot-instances-supabase.ts`

**Funções disponíveis:**

#### `generateConsultantName(botName: string): string`
Gera o nome do consultor automaticamente.
```typescript
generateConsultantName("Maria Luzia") // → "Maria luzia"
```

#### `formatMessageWithPrefix(message: string, name: string, template: string): string`
Formata uma mensagem com o prefixo.
```typescript
formatMessageWithPrefix(
  "Olá!",
  "Maria Luzia",
  "*{name}:*\n"
) // → "*Maria Luzia:*\nOlá!"
```

#### `getBotConfigByInstanceNumber(instanceNumber: string): Promise<BotInstanceConfig | null>`
Recupera a configuração do bot.

#### `upsertBotConfig(config: BotInstanceConfig): Promise<BotInstanceConfig>`
Cria ou atualiza a configuração.

#### `deleteBotConfig(instanceNumber: string): Promise<boolean>`
Deleta a configuração.

#### `isBotEnabledForInstance(instanceNumber: string): Promise<boolean>`
Verifica se o bot está habilitado.

## 🔐 Segurança

- Todas as rotas requerem autenticação JWT (`authMiddleware`)
- RLS policies habilitadas para usuários autenticados
- Validação de formato de nome do bot
- Sanitização de inputs no frontend e backend
- Foreign key constraint previne configurações órfãs

## 📊 Tipos TypeScript

### `BotInstanceConfig`
```typescript
interface BotInstanceConfig {
  id?: number;
  instance_id: string;
  instance_number: string;
  instance_remote_jid?: string | null;
  has_bot_enabled: boolean;
  bot_name?: string | null;
  consultant_name?: string | null;
  bot_activity?: string | null;
  message_prefix_template: string;
  use_prefix_for_bot: boolean;
  use_prefix_for_consultant: boolean;
  created_at?: string;
  updated_at?: string;
}
```

## 🚀 Escalabilidade

A tabela `bot_instances` separada foi projetada para suportar:

1. **Múltiplas IAs em diferentes instâncias**
   - Cada instância tem sua própria configuração
   - Templates customizáveis por instância

2. **Expansão futura para:**
   - Múltiplos bots por instância (adicionar `parent_bot_id`)
   - Histórico de configurações (criar `bot_instances_history`)
   - Métricas de performance por bot
   - Escalonamento automático entre bots

3. **Performance:**
   - Índices estratégicos para queries frequentes
   - TTL cache implementado no backend (5 minutos)
   - RLS queries otimizadas

## 📝 Próximos Passos

1. ✅ Criar tabela `bot_instances`
2. ✅ Implementar CRUD no Supabase
3. ✅ Criar rotas da API
4. ✅ Implementar UI de configuração
5. ⏳ Integrar prefixos no envio de mensagens
6. ⏳ Adicionar histórico de alterações (future)
7. ⏳ Implementar métricas de bots (future)

## 🐛 Troubleshooting

### Erro: "Table bot_instances not found"

Execute a migração:
```bash
npx tsx server/migrations/run-migration.ts
```

### Erro: "SUPABASE_URL and SUPABASE_KEY are required"

Defina as variáveis de ambiente:
```bash
export SUPABASE_URL=sua_url
export SUPABASE_KEY=sua_chave
```

### Erro ao salvar configuração

Verifique:
- Se a instância existe em `uazapi_instances`
- Se o formato do nome do bot é válido (Nome Sobrenome com maiúsculas)
- Se tem autenticação válida

## 📚 Documentação Relacionada

- [UAZAPI_DATABASE_SETUP.md](./UAZAPI_DATABASE_SETUP.md)
- [SQL_SUPABASE_SETUP.md](./SQL_SUPABASE_SETUP.md)
- [INDEX.md](./INDEX.md)
