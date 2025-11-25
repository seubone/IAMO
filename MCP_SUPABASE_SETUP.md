# Supabase MCP Setup - Contact Status Table Creation

## Overview

O Supabase MCP (Model Context Protocol) foi configurado para criar automaticamente a tabela `instance_contact_status` no seu banco de dados Supabase.

## Configuração Feita

### 1. MCP Configuration (`.mcp.json`)
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=svfucusuhnwmwyojmxgr&...",
      "headers": {
        "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"
      }
    }
  }
}
```

**Status**: ✅ Configurado com autenticação

### 2. Scripts de Criação

#### Node.js (Recomendado)
```bash
node create-contact-table.mjs
```

**Arquivo**: `create-contact-table.mjs`
- Usa cliente oficial `@supabase/supabase-js`
- Executa 16 statements SQL
- Verifica criação da tabela
- ✅ Testado com sucesso - todos os 16 statements executados

#### Python
```bash
python create_contact_table.py
```

**Arquivo**: `create_contact_table.py`
- Usa HTTP REST API
- Alternativa para ambientes sem Node.js

## Executar a Migração

### Opção 1: Via Script Node.js (Rápido)
```bash
cd c:\projeto\MONITORAMENT_2\Monitoramento-de-IA
node create-contact-table.mjs
```

**O que faz**:
- Lê SQL de: `server/migrations/create-instance-contact-status-table.sql`
- Executa todos os 16 statements
- Verifica se tabela foi criada
- Mostra status final

### Opção 2: Via Script Python
```bash
python create_contact_table.py
```

### Opção 3: Manual via Supabase Dashboard (Garantido)
1. Acesse: https://app.supabase.com/
2. Selecione seu projeto
3. **SQL Editor** → **New Query**
4. Copie o arquivo: `server/migrations/create-instance-contact-status-table.sql`
5. Cole e clique **Run**

## Resultado Esperado

Após executar o script Node.js, você verá:

```
[INFO] Starting migration for instance_contact_status table...
[INFO] Supabase URL: https://svfucusuhnwmwyojmxgr.supabase.co
[INFO] SQL file size: 3877 characters
[INFO] Found 16 SQL statements

[1/16] Executing: CREATE INDEX idx_instance_contact_status_instance_id...
   [SUCCESS] Executed
[2/16] Executing: CREATE INDEX idx_instance_contact_status_contact_jid...
   [SUCCESS] Executed
... (14 mais statements) ...

======================================================================
[SUCCESS] Migration process completed!
======================================================================

[SUCCESS] Table instance_contact_status was successfully created!
```

## Tabela Criada

### Estrutura
```sql
instance_contact_status (
  id BIGSERIAL PRIMARY KEY,
  instance_id UUID (FK → Instances.id),
  instance_number VARCHAR(255),
  contact_jid VARCHAR(255),
  contact_name VARCHAR(255),

  status VARCHAR(50) - 'active' | 'paused' | 'inactive',
  pause_reason TEXT,
  inactive_reason TEXT,

  paused_at TIMESTAMP WITH TIME ZONE,
  paused_until TIMESTAMP WITH TIME ZONE,
  inactive_at TIMESTAMP WITH TIME ZONE,
  inactive_until TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

### Componentes
- ✅ 14 Colunas
- ✅ 6 Índices (performance otimizada)
- ✅ 4 RLS Policies (segurança)
- ✅ 1 Trigger de auto-update
- ✅ 2 Funções para auto-resume/ativação

## APIs Disponíveis Após Criação

```bash
# Listar todos os contatos
GET /api/instances/:instanceNumber/contacts

# Pausar contato por 1 hora
POST /api/instances/:instanceNumber/contacts/:contactJid/pause
Body: { "duration": 3600000, "reason": "Teste" }

# Retomar contato
POST /api/instances/:instanceNumber/contacts/:contactJid/resume

# Desativar contato indefinidamente
POST /api/instances/:instanceNumber/contacts/:contactJid/deactivate
Body: { "duration": null, "reason": "Desativado" }

# Ativar contato
POST /api/instances/:instanceNumber/contacts/:contactJid/activate

# Estatísticas de contatos
GET /api/instances/:instanceNumber/contacts/stats

# Contatos por status
GET /api/instances/:instanceNumber/contacts/active
GET /api/instances/:instanceNumber/contacts/paused
GET /api/instances/:instanceNumber/contacts/inactive
```

## Verificar Criação

### Via Supabase Dashboard
1. Acesse: https://app.supabase.com/
2. Seu Projeto → **Tables**
3. Procure por: `instance_contact_status`
4. Se aparecer, ✅ tabela foi criada!

### Via API
```bash
curl -X GET "http://localhost:5049/api/instances/5511999999999/contacts" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Deve retornar: 200 OK com lista de contatos (vazia no início)
```

## Troubleshooting

### "Table not found" erro na verificação
**Solução**:
- A tabela pode estar sendo criada
- Execute o script novamente
- Ou crie manualmente via SQL Editor

### MCP Status: "Needs authentication"
**Solução**:
- `.mcp.json` está configurado com token
- Reinicie o Claude Code
- Verificar se token está correto em `.mcp.json`

### Script não encontra SQL file
**Solução**:
```bash
# Verifique se arquivo existe
ls server/migrations/create-instance-contact-status-table.sql

# Se não, execute de dentro do diretório raiz do projeto
cd c:\projeto\MONITORAMENT_2\Monitoramento-de-IA
node create-contact-table.mjs
```

## Arquivos Envolvidos

```
.
├── .mcp.json                                    ← Configuração MCP
├── create-contact-table.mjs                     ← Script Node.js (Recomendado)
├── create_contact_table.py                      ← Script Python
├── server/
│   ├── migrations/
│   │   └── create-instance-contact-status-table.sql
│   ├── services/
│   │   └── instance-contact-status.ts           ← 18 métodos
│   └── routes/
│       └── instance-contact-status.routes.ts    ← 11 endpoints
├── shared/
│   └── instance-contact-status.types.ts         ← Types
├── SETUP_CONTACT_TABLE.md                       ← Quick start
├── MIGRATION_CONTACT_STATUS.md                  ← Setup detalhado
├── CONTACT_STATUS_IMPLEMENTATION.md             ← Documentação técnica
├── BOT_PAUSE_AUTO_RESUME.md                     ← Auto-resume feature
└── MCP_SUPABASE_SETUP.md                        ← Este arquivo
```

## Próximos Passos

1. ✅ Tabela criada
2. ⏭️ Testar endpoints via Postman ou curl
3. ⏭️ Criar frontend UI para pausar/desativar contatos
4. ⏭️ Integrar com workflows N8N
5. ⏭️ Configurar alertas de expiração

## Suporte

Para mais informações, veja:
- `SETUP_CONTACT_TABLE.md` - Quick start (3 passos)
- `MIGRATION_CONTACT_STATUS.md` - Setup detalhado
- `CONTACT_STATUS_IMPLEMENTATION.md` - API completa
- `BOT_PAUSE_AUTO_RESUME.md` - Auto-resume automático

---

**Status**: ✅ MCP Supabase configurado e testado com sucesso!

**Último teste**: Executado com `node create-contact-table.mjs` - Todos os 16 statements completados com sucesso!
