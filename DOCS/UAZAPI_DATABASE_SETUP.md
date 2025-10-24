# UAZapi Database Setup & Token Management

## Overview

A tabela `uazapi_instances` armazena os tokens da API UAZapi para cada instância do WhatsApp. Os tokens são vinculados ao número da instância e usados automaticamente ao enviar mensagens via UAZapi.

## Tabela: `uazapi_instances`

### Estrutura

```sql
CREATE TABLE uazapi_instances (
  instance_number TEXT PRIMARY KEY,      -- Número da instância (ex: 5511999999999)
  api_token TEXT NOT NULL,               -- Token da API UAZapi
  created_at TIMESTAMP DEFAULT NOW(),    -- Data de criação
  updated_at TIMESTAMP DEFAULT NOW()     -- Data da última atualização
);
```

### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `instance_number` | TEXT | ✅ SIM | Número único da instância WhatsApp em formato brasileiro (55XXYYYYYYYY) |
| `api_token` | TEXT | ✅ SIM | Token de autenticação fornecido pela UAZapi |
| `created_at` | TIMESTAMP | ✅ SIM | Timestamp automático de quando o registro foi criado |
| `updated_at` | TIMESTAMP | ✅ SIM | Timestamp automático da última atualização |

## Como Funciona

### 1️⃣ Configurar Token via UI

**Localização:** Página `/chat` → Clique em ⚙️ Settings → Configure Token

1. Abra a página de chat (`/chat`)
2. Selecione uma instância WhatsApp
3. Clique no ícone de **Configurações** (⚙️)
4. Cole o token da UAZapi no campo "Token da API Uazapi"
5. Clique em **Salvar**

**Screenshot:**
```
┌─────────────────────────────────────────┐
│ Configurar Instância Uazapi             │
│                                         │
│ Número da Instância:                   │
│ [5511999999999]                         │
│                                         │
│ Token da API Uazapi:                    │
│ [•••••••••••••••••]                     │
│                                         │
│ [Salvar]  [Deletar Token]              │
└─────────────────────────────────────────┘
```

### 2️⃣ Fluxo Backend

```
Usuário clica "Salvar"
         ↓
POST /api/uazapi/instances
   {
     "instanceNumber": "5511999999999",
     "apiToken": "abc123xyz..."
   }
         ↓
storage.createUazapiInstance()
         ↓
INSERT INTO uazapi_instances (instance_number, api_token)
VALUES ('5511999999999', 'abc123xyz...')
         ↓
✅ Token salvo!
```

### 3️⃣ Usar Token ao Enviar Mensagem

```
Usuário digita mensagem e envia
         ↓
POST /api/whatsapp/send-message
   {
     "instanceNumber": "5511999999999",
     "recipientNumber": "5512345678901",
     "text": "Olá!"
   }
         ↓
storage.getUazapiInstance("5511999999999")
         ↓
SELECT api_token FROM uazapi_instances
WHERE instance_number = '5511999999999'
         ↓
const uazapiInstance = { apiToken: "abc123xyz..." }
         ↓
fetch("https://quatro-cinco.uazapi.com/send/text", {
  headers: { "token": uazapiInstance.apiToken }
})
         ↓
✅ Mensagem enviada!
```

## Endpoints da API

### GET `/api/uazapi/instances/:number`

Buscar token de uma instância específica.

**Autenticação:** ✅ JWT Required

**Parâmetros:**
- `number` (path): Número da instância (ex: 5511999999999)

**Resposta:**
```json
{
  "instanceNumber": "5511999999999",
  "apiToken": "abc123xyz...",
  "createdAt": "2024-10-24T10:30:00Z",
  "updatedAt": "2024-10-24T11:45:00Z"
}
```

**Erros:**
- `404` - Instância não encontrada
- `401` - Não autenticado

---

### POST `/api/uazapi/instances`

Criar ou atualizar token de uma instância.

**Autenticação:** ✅ JWT Required

**Body:**
```json
{
  "instanceNumber": "5511999999999",
  "apiToken": "abc123xyz..."
}
```

**Resposta:**
```json
{
  "instanceNumber": "5511999999999",
  "apiToken": "abc123xyz...",
  "createdAt": "2024-10-24T10:30:00Z",
  "updatedAt": "2024-10-24T12:00:00Z"
}
```

**Erros:**
- `400` - Dados inválidos (instanceNumber ou apiToken vazio)
- `401` - Não autenticado

---

### DELETE `/api/uazapi/instances/:number`

Deletar token de uma instância.

**Autenticação:** ✅ JWT Required + Role `admin` ou `operator`

**Parâmetros:**
- `number` (path): Número da instância

**Resposta:**
- `204` - Token deletado com sucesso

**Erros:**
- `404` - Instância não encontrada
- `401` - Não autenticado
- `403` - Permissão negada (role insuficiente)

---

## Adicionar Token Manualmente via SQL

Se precisar adicionar tokens diretamente no banco de dados (sem passar pela UI):

### 1. Conectar no PostgreSQL

```bash
psql postgresql://usuario:senha@host:5432/monitor_ia
```

### 2. Inserir Token

```sql
INSERT INTO uazapi_instances (instance_number, api_token)
VALUES ('5511999999999', 'seu-token-uazapi-aqui')
ON CONFLICT (instance_number)
DO UPDATE SET
  api_token = 'seu-token-uazapi-aqui',
  updated_at = NOW();
```

### 3. Verificar Inserção

```sql
SELECT * FROM uazapi_instances WHERE instance_number = '5511999999999';
```

### 4. Deletar Token

```sql
DELETE FROM uazapi_instances WHERE instance_number = '5511999999999';
```

---

## Troubleshooting

### ❌ "Token não configurado para esta instância"

**Causa:** Token não foi salvo no banco de dados.

**Solução:**
1. Vá para `/chat`
2. Selecione a instância
3. Clique em ⚙️ Settings
4. Cole o token e clique **Salvar**

### ❌ "Erro ao enviar mensagem via Uazapi"

**Causa:** Token inválido ou expirado.

**Solução:**
1. Verifique se o token está correto
2. Regenere o token na plataforma UAZapi
3. Atualize o token na interface

### ❌ "Instância não encontrada"

**Causa:** Número da instância não existe no banco.

**Solução:**
1. Verifique o número da instância (deve estar em formato brasileiro: 55XXYYYYYYYY)
2. Insira o token primeiro via UI ou SQL

### ❌ Não consigo acessar a página de Configurações

**Causa:** Falta de autenticação.

**Solução:**
1. Faça login no sistema
2. Verifique se seu role permite configurar tokens (admin ou operator)

---

## Migração do Banco de Dados

### Como foi criada a tabela

A tabela `uazapi_instances` foi criada usando **Drizzle ORM** e **PostgreSQL**.

1. Schema definido em: [`shared/schema.ts:108-113`](../shared/schema.ts#L108-L113)
2. Sincronizado com banco via: `npm run db:push`
3. Sem histórico de migrações (push direto)

### Recriar a tabela (se necessário)

```bash
# 1. Drop da tabela (cuidado - deleta dados!)
DROP TABLE uazapi_instances;

# 2. Recriar via Drizzle
npm run db:push
```

---

## Segurança

### ✅ Boas Práticas

- ✅ Tokens armazenados em banco PostgreSQL (não em localStorage)
- ✅ Autenticação JWT necessária para acessar/modificar tokens
- ✅ Apenas admin/operator podem deletar tokens
- ✅ Tokens nunca aparecem em logs (use console.error com cuidado)
- ✅ HTTPS obrigatório em produção

### ⚠️ Evitar

- ❌ Colocar tokens em localStorage
- ❌ Enviar tokens em query parameters
- ❌ Logar tokens em console.log()
- ❌ Versionear tokens no Git (.env é ignorado)

---

## Desenvolvimento Local

### Setup Inicial

```bash
# 1. Clonar projeto
git clone <repo>
cd Monitoramento-de-IA

# 2. Instalar dependências
npm install

# 3. Configurar .env
cp .env.example .env
# Editar DATABASE_URL com credenciais PostgreSQL

# 4. Criar banco de dados (se necessário)
createdb monitor_ia

# 5. Sincronizar schema
npm run db:push

# 6. Iniciar servidor
npm run dev
```

### Testar API Local

```bash
# 1. Obter JWT token (login primeiro)
# Depois usar token nas requisições:

# Salvar token
curl -X POST http://localhost:5051/api/uazapi/instances \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceNumber": "5511999999999",
    "apiToken": "seu-token-uazapi"
  }'

# Buscar token
curl -X GET http://localhost:5051/api/uazapi/instances/5511999999999 \
  -H "Authorization: Bearer SEU_TOKEN_JWT"

# Deletar token
curl -X DELETE http://localhost:5051/api/uazapi/instances/5511999999999 \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

---

## Referências

- **UAZapi Docs:** https://quatro-cinco.uazapi.com/docs
- **Drizzle ORM:** https://orm.drizzle.team/
- **PostgreSQL:** https://www.postgresql.org/docs/

---

**Última atualização:** 2024-10-24
**Versão:** 1.0
