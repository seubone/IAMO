# 🗄️ Guia de Migração do Banco de Dados

## ⚠️ IMPORTANTE: A Tabela `ias` NÃO Existe Ainda!

A tabela `ias` está apenas no código TypeScript (Drizzle ORM), mas **NÃO foi criada no banco de dados**.

Você precisa executar as migrações SQL para criá-la.

---

## 🚀 Como Criar a Tabela `ias`

### Opção 1: Script Automático (RECOMENDADO) ✅

**Pré-requisitos:**
- Variáveis de ambiente configuradas:
  ```bash
  export SUPABASE_URL=https://seu-projeto.supabase.co
  export SUPABASE_KEY=sua_chave_api_aqui
  ```

**Executar:**
```bash
cd /c/projeto/MONITORAMENT_2/Monitoramento-de-IA
npx tsx server/migrations/run-all-migrations.ts
```

**O que faz:**
1. ✅ Cria a tabela `ias` com todos os campos
2. ✅ Adiciona campos estendidos (N8N, pausa, prefixos)
3. ✅ Cria a tabela `bot_instances`
4. ✅ Cria índices e triggers

**Resultado esperado:**
```
🚀 Starting Database Migrations
📍 Supabase URL: https://...
============================================================
📝 Running: Create IAs Table
✅ Migration executed successfully
...
✅ All migrations completed successfully!
```

---

### Opção 2: Manual no Supabase Dashboard

**Passo 1: Abra Supabase**
1. Vá para: https://app.supabase.com
2. Selecione seu projeto

**Passo 2: Abra SQL Editor**
1. Clique em **SQL Editor** (lado esquerdo)
2. Clique em **New Query**

**Passo 3: Copie o SQL**
Copie o conteúdo de: `server/migrations/create-ias-table.sql`

**Passo 4: Execute**
1. Cole no editor
2. Clique em **Run** (botão verde no canto superior direito)
3. Aguarde a confirmação

**Passo 5: Repita para extend-ias-table.sql**
Faça o mesmo para os arquivos:
- `server/migrations/extend-ias-table.sql`
- `server/migrations/create-bot-instances-table.sql`

---

### Opção 3: Linha de Comando (Supabase CLI)

Se você tem o Supabase CLI instalado:

```bash
# Conectar ao projeto
supabase projects list
supabase db push  # Se tiver um diretório migrations configurado

# Ou executar arquivo SQL diretamente
cat server/migrations/create-ias-table.sql | supabase db remote-commit
```

---

## 📋 Arquivos de Migração

Todos os arquivos estão em: `server/migrations/`

### 1️⃣ `create-ias-table.sql` (Criar Tabela)

Cria a tabela `ias` com campos:
- ✅ id, name, status, tags
- ✅ ai_name, consultant_name
- ✅ Todos os campos de N8N
- ✅ Campos de pausa (pause_until, pause_reason)
- ✅ Formatação de mensagens
- ✅ Metadata

**Também cria:**
- Enums: `ia_status`, `ia_category`
- 7 índices para performance
- Triggers automáticos
- RLS policies para Supabase

### 2️⃣ `extend-ias-table.sql` (Estender Campos)

Se a tabela já existe, adiciona os novos campos sem perder dados.

**O que adiciona:**
- Campos que podem estar faltando
- Índices adicionais
- Função de retomada automática

### 3️⃣ `create-bot-instances-table.sql` (Bots por Instância)

Cria tabela separada para gerenciar bots em instâncias WhatsApp.

---

## ✅ Verificar se Funcionou

### No Supabase Dashboard

1. Vá para **Table Editor**
2. Procure por `ias` na lista de tabelas
3. Clique em `ias`
4. Você deve ver a estrutura com todos os campos

### Via SQL Query

Execute no SQL Editor:

```sql
-- Verificar se a tabela existe
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'ias';

-- Ver estrutura da tabela
\d ias

-- Contar registros
SELECT COUNT(*) FROM ias;
```

---

## 🔍 Solução de Problemas

### Erro: "Table already exists"

Significa que a tabela `ias` já existe. Isso é bom!

Execute apenas:
```bash
npx tsx server/migrations/run-all-migrations.ts
```

Se quiser pular a primeira migração, execute apenas:
```sql
-- Conteúdo de extend-ias-table.sql
```

### Erro: "Permission denied"

Você pode estar usando uma chave sem permissões suficientes.

Certifique-se que:
1. `SUPABASE_URL` está correto
2. `SUPABASE_KEY` é uma chave de **service_role** ou **admin** (não `anon`)
3. Você tem permissões de administrador no projeto Supabase

Para obter a chave correta:
1. Vá para Supabase Dashboard
2. Projeto → Configurações → API
3. Copie a chave de `service_role`

### Erro: "Column ... already exists"

Significa que o campo já foi adicionado. Isso é normal!

O SQL `CREATE TABLE IF NOT EXISTS` e `ALTER TABLE ADD COLUMN IF NOT EXISTS` evitam erros ao executar múltiplas vezes.

### Nada acontece

Se não receber confirmação:

1. Verifique se as variáveis estão configuradas:
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_KEY
   ```

2. Se estiverem vazias, configure:
   ```bash
   export SUPABASE_URL=sua_url_aqui
   export SUPABASE_KEY=sua_chave_aqui
   ```

3. Tente novamente:
   ```bash
   npx tsx server/migrations/run-all-migrations.ts
   ```

---

## 📊 Estrutura Final da Tabela `ias`

```sql
id                               UUID PRIMARY KEY
name                            TEXT (obrigatório)
status                          ia_status (active, paused, inactive)
tags                            TEXT ARRAY
description                     TEXT

-- IA Names
ai_name                         VARCHAR(100)        -- "Maria Luzia"
consultant_name                 VARCHAR(100)        -- "Maria luzia"

-- Configuration
parameters                      JSONB
status_history                  JSONB

-- N8N Integration
n8n_workflow_id                 VARCHAR(255)
n8n_workflow_name               VARCHAR(255)
n8n_webhook_url                 TEXT
n8n_trigger_type                VARCHAR(50)
n8n_last_execution_timestamp    TIMESTAMP
n8n_config                      JSONB

-- Pause Schedule
pause_until                     TIMESTAMP           -- Quando retomar
pause_reason                    VARCHAR(255)        -- Por que foi pausada

-- Message Formatting
message_prefix_template         TEXT (default: "*{name}:*\n")
use_ai_prefix                   BOOLEAN (default: true)
use_consultant_prefix           BOOLEAN (default: true)

-- Additional
avatar_url                      TEXT
category                        ia_category (sales, support, marketing, billing, onboarding, other)
model_version                   VARCHAR(50)
performance_score               DECIMAL(5,2)

-- Metadata
last_modified_by                VARCHAR(255)
last_modified_at                TIMESTAMP
created_at                      TIMESTAMP (obrigatório)
updated_at                      TIMESTAMP (obrigatório)
```

---

## 🎯 Próximos Passos Após Migração

1. **Verificar a tabela foi criada** ✅
2. **Compilar o projeto:**
   ```bash
   npm run build
   ```

3. **Iniciar o servidor:**
   ```bash
   npm run dev
   ```

4. **Integrar o componente IAConfigPanel** em uma página

5. **Testar no navegador**

---

## 🆘 Precisa de Ajuda?

Se a migração não funcionar:

### Plano B: Criar Manualmente

1. **Abra:** https://app.supabase.com
2. **Projeto → SQL Editor**
3. **Crie uma nova query**
4. **Copie e cole o conteúdo de:**
   ```
   server/migrations/create-ias-table.sql
   ```
5. **Clique em Run**
6. **Repita para os outros arquivos**

### Se Ainda Não Funcionar

Entre em contato com suporte do Supabase ou tire dúvidas!

---

## 📝 Checklist

- [ ] Variáveis `SUPABASE_URL` e `SUPABASE_KEY` configuradas
- [ ] Executou `run-all-migrations.ts` OU criou manualmente
- [ ] Verificou que tabela `ias` existe no Supabase
- [ ] Rodou `npm run build` com sucesso
- [ ] Servidor inicia sem erros

**Uma vez pronto, você terá:**
✅ Tabela `ias` com todos os campos
✅ Tabela `bot_instances` para bots
✅ Índices e triggers automáticos
✅ Ready para usar o IAConfigPanel
