# Setup: Criar Tabela `uazapi_instances` no Supabase

## ⚠️ Problema Atual
Você está recebendo o erro:
```
error: relation "uazapi_instances" does not exist
```

Isso acontece porque a tabela `uazapi_instances` não foi criada no banco Supabase.

---

## ✅ Solução: Criar Tabela Manualmente

### Passo 1: Acesse o Supabase SQL Editor

1. Vá para [https://app.supabase.com](https://app.supabase.com)
2. Faça login com sua conta
3. Selecione seu projeto
4. No menu lateral, clique em **"SQL Editor"**
5. Clique no botão **"New Query"**

### Passo 2: Copie e Execute o SQL

Copie todo o SQL abaixo e cole no Supabase SQL Editor:

```sql
-- Migration: Create uazapi_instances table in Supabase
-- Create uazapi_instances table
CREATE TABLE IF NOT EXISTS public.uazapi_instances (
  id BIGSERIAL PRIMARY KEY,
  instance_id UUID UNIQUE NOT NULL,
  instance_number VARCHAR(20) UNIQUE,
  api_token TEXT,
  send_api VARCHAR(20) DEFAULT 'evolution' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_send_api CHECK (send_api IN ('evolution', 'uazapi'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_uazapi_instances_instance_id ON public.uazapi_instances(instance_id);
CREATE INDEX IF NOT EXISTS idx_uazapi_instances_instance_number ON public.uazapi_instances(instance_number);

-- Enable RLS (Row Level Security)
ALTER TABLE public.uazapi_instances ENABLE ROW LEVEL SECURITY;

-- Allow all users to read
CREATE POLICY "Enable read access for all users" ON public.uazapi_instances
  FOR SELECT USING (true);

-- Allow all users to insert/update
CREATE POLICY "Enable insert for authenticated users" ON public.uazapi_instances
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.uazapi_instances
  FOR UPDATE USING (true);

-- Verification query
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'uazapi_instances'
ORDER BY ordinal_position;
```

### Passo 3: Executar a Query

1. Clique no botão **"RUN"** (ou pressione `Ctrl+Enter`)
2. Aguarde a execução completar
3. Você deverá ver uma mensagem de sucesso e a estrutura da tabela listada

### Passo 4: Reiniciar o Backend

Após criar a tabela, reinicie o servidor backend:

```bash
# Parar o servidor (Ctrl+C)
# Depois iniciar novamente
npm run dev
```

---

## 🔍 Verificar se a Tabela foi Criada

Para verificar se a tabela foi criada corretamente, execute esta query no Supabase:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'uazapi_instances';
```

Você deve ver:
```
table_name
---
uazapi_instances
```

---

## 📊 Estrutura da Tabela

A tabela terá as seguintes colunas:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | BIGSERIAL | ID único (chave primária) |
| `instance_id` | UUID | ID da instância Evolution |
| `instance_number` | VARCHAR(20) | Número da instância (ex: 5511999999999) |
| `api_token` | TEXT | Token Uazapi (opcional) |
| `send_api` | VARCHAR(20) | API de envio ('evolution' ou 'uazapi') |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

---

## 🛠️ Próximos Passos

Depois que a tabela for criada:

1. ✅ O servidor pode enviar mensagens via Evolution mesmo sem Uazapi
2. ✅ Você pode opcionalmente salvar o token Uazapi
3. ✅ Você pode escolher qual API usar como padrão

---

## ❓ Dúvidas?

Se ainda tiver erros:

1. Verifique que o SQL executou sem erros no Supabase
2. Reinicie o servidor backend (`npm run dev`)
3. Tente enviar uma mensagem novamente
4. Verifique os logs do servidor para mensagens de erro

---

## 📝 Arquivo de Migration Incluído

O arquivo SQL também está salvo em:
```
server/migrations/create-uazapi-instances-table.sql
```

Você pode usar como referência ou reutilizar em outra instância Supabase.
