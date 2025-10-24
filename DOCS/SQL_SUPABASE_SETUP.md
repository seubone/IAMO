# 📋 Setup SQL da Tabela UAZapi no Supabase

## 📍 Localização do SQL

Arquivo: [`create_uazapi_instances.sql`](../create_uazapi_instances.sql)

## 🚀 Como Usar

### Opção 1: Via Dashboard Supabase (Mais Fácil)

1. **Abrir Supabase Dashboard**
   - Ir para: https://app.supabase.com/
   - Selecionar projeto: `svfucusuhnwmwyojmxgr`

2. **Acessar SQL Editor**
   - Clique em **SQL Editor** (sidebar esquerda)
   - Clique em **New Query**

3. **Copiar e Colar SQL**
   ```
   - Abrir arquivo: create_uazapi_instances.sql
   - Copiar TODO o conteúdo
   - Colar no SQL Editor do Supabase
   - Clique em RUN ▶️
   ```

4. **Confirmar Sucesso**
   ```
   ✅ Success - Completed in XXms
   ```

### Opção 2: Via CLI (Mais Rápido)

Se você tem Supabase CLI instalado:

```bash
# 1. Fazer login
supabase login

# 2. Executar SQL arquivo
supabase db execute --file create_uazapi_instances.sql
```

### Opção 3: Via psql (PostgreSQL)

Se você tem acesso direto ao PostgreSQL:

```bash
# 1. Conectar ao banco
psql postgresql://postgres:SENHA@SUPABASE_HOST:5432/postgres

# 2. Executar arquivo
\i create_uazapi_instances.sql

# 3. Verificar
\d uazapi_instances
```

---

## ✅ O que o SQL Faz

### 1. Criar Tabela
```sql
CREATE TABLE uazapi_instances (
  instance_number TEXT PRIMARY KEY,    -- Identificador único
  api_token TEXT NOT NULL,             -- Token da API
  created_at TIMESTAMP,                -- Data de criação
  updated_at TIMESTAMP                 -- Data de atualização
);
```

### 2. Adicionar Índices
- `idx_uazapi_instances_created_at` - Para queries por data de criação
- `idx_uazapi_instances_updated_at` - Para queries por data de atualização

### 3. Adicionar Documentação
- Comentários na tabela
- Comentários em cada coluna
- Facilita entender o propósito

---

## 🔍 Verificar se Funcionou

Depois de executar o SQL, você pode verificar:

### 1. Via SQL Editor Supabase

```sql
-- Ver todas as tabelas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Ver estrutura da tabela uazapi_instances
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'uazapi_instances'
ORDER BY ordinal_position;

-- Contar registros
SELECT COUNT(*) FROM uazapi_instances;
```

### 2. Via Table Editor Supabase

1. Clique em **Table Editor** (sidebar)
2. Procure por `uazapi_instances` na lista
3. Deve aparecer como tabela vazia

---

## 📝 Exemplo de Dados

Depois da tabela criada, você pode inserir tokens:

### Inserir Token

```sql
INSERT INTO uazapi_instances (instance_number, api_token)
VALUES ('5511999999999', 'abc123xyz...')
ON CONFLICT (instance_number)
DO UPDATE SET
  api_token = 'abc123xyz...',
  updated_at = CURRENT_TIMESTAMP;
```

### Buscar Token

```sql
SELECT api_token FROM uazapi_instances
WHERE instance_number = '5511999999999';
```

### Atualizar Token

```sql
UPDATE uazapi_instances
SET api_token = 'novo-token-aqui'
WHERE instance_number = '5511999999999';
```

### Deletar Token

```sql
DELETE FROM uazapi_instances
WHERE instance_number = '5511999999999';
```

---

## ⚠️ Troubleshooting

### ❌ "Table already exists"

**Problema:** A tabela já foi criada antes.

**Solução:** Tudo bem! O SQL tem `IF NOT EXISTS`, então é seguro executar novamente.

### ❌ "Permission denied"

**Problema:** Usuário não tem permissão para criar tabelas.

**Solução:**
1. Conecte com usuário `postgres` (admin)
2. Ou peça ao admin do Supabase para executar

### ❌ "Column already exists"

**Problema:** A coluna já existe (execução parcial anterior).

**Solução:** Tudo bem! Significa tabela parcialmente criada. O resto do SQL vai completar.

---

## 📊 Estrutura Final da Tabela

```
uazapi_instances
├── instance_number (TEXT) - PRIMARY KEY
│   └── Exemplo: 5511999999999
├── api_token (TEXT) - NOT NULL
│   └── Exemplo: eyJhbGciOiJIUzI1NiIs...
├── created_at (TIMESTAMP WITH TIME ZONE)
│   └── Padrão: CURRENT_TIMESTAMP
└── updated_at (TIMESTAMP WITH TIME ZONE)
    └── Padrão: CURRENT_TIMESTAMP

Índices:
├── idx_uazapi_instances_created_at (created_at DESC)
└── idx_uazapi_instances_updated_at (updated_at DESC)
```

---

## 🔗 Integração com Aplicação

Depois que a tabela for criada no Supabase:

1. ✅ Backend usa `storage.getUazapiInstance()` para buscar token
2. ✅ Backend usa `storage.createUazapiInstance()` para salvar token
3. ✅ Frontend usa `InstanceSettingsDialog` para configurar
4. ✅ Tokens persistem e sincronizam entre dispositivos

**Status:** Tabela já está no schema Drizzle ([shared/schema.ts:108-113](../shared/schema.ts#L108-L113))

---

## 📚 Documentação Relacionada

- **[UAZAPI_DATABASE_SETUP.md](./UAZAPI_DATABASE_SETUP.md)** - Documentação completa sobre uso
- **[DEV_STARTUP_GUIDE.md](./DEV_STARTUP_GUIDE.md)** - Como iniciar desenvolvimento

---

**Última atualização:** 2024-10-24
**Versão:** 1.0
**Status:** ✅ Pronto para usar
