# ⚡ Quick Setup: Contact Status Table

## TL;DR - 3 Passos Rápidos

### 1️⃣ Copiar SQL
Abra o arquivo: `server/migrations/create-instance-contact-status-table.sql`

### 2️⃣ Executar no Supabase
1. Acesse: https://app.supabase.com/
2. Selecione seu projeto
3. Vá para: **SQL Editor**
4. Click: **New Query**
5. Cole o SQL inteiro
6. Click: **Run**

### 3️⃣ Pronto! ✅
A tabela foi criada e os endpoints estão prontos para usar.

---

## ✅ Verificar se Funcionou

### Via Supabase Dashboard
1. Acesse: **Tables** no menu esquerdo
2. Procure por: `instance_contact_status`
3. Se aparecer, está OK! ✅

### Via API (depois que o servidor estiver rodando)
```bash
curl -X GET "http://localhost:5049/api/instances/5511999999999/contacts" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Deve retornar: 200 OK com lista de contatos
```

---

## 🔄 Alternativas de Migração

### Opção 1: Via Script TypeScript (com Node.js 18+)
```bash
npm install -g tsx
npx tsx server/migrations/run-contact-status-migration.ts
```

### Opção 2: Via Script Node.js
```bash
node server/migrations/run-contact-status-migration.mjs
```

> ⚠️ Nota: Os scripts tentam usar RPC, mas a forma mais confiável ainda é **colar no SQL Editor**.

---

## 📊 O que foi criado

### Tabela: `instance_contact_status`
```
✅ Colunas: 14
✅ Índices: 6
✅ Políticas RLS: 4
✅ Triggers: 1
✅ Funções: 2
```

### Capacidades
- ✅ Pausar/retomar contatos com duração automática
- ✅ Desativar/ativar contatos indefinidamente
- ✅ Auto-resume após expiração (job a cada 60s)
- ✅ Rastreamento completo (motivo, timestamps)
- ✅ Múltiplas instâncias por usuário
- ✅ Segurança com RLS policies

---

## 🚀 APIs Disponíveis

### Listar Contatos
```bash
GET /api/instances/:instanceNumber/contacts
```

### Pausar Contato (1 hora)
```bash
POST /api/instances/:instanceNumber/contacts/:contactJid/pause
Body: { "duration": 3600000, "reason": "Teste" }
```

### Retomar Contato
```bash
POST /api/instances/:instanceNumber/contacts/:contactJid/resume
```

### Desativar Contato
```bash
POST /api/instances/:instanceNumber/contacts/:contactJid/deactivate
Body: { "duration": null, "reason": "Desativado" }  // null = indefinido
```

### Ativar Contato
```bash
POST /api/instances/:instanceNumber/contacts/:contactJid/activate
```

### Estatísticas
```bash
GET /api/instances/:instanceNumber/contacts/stats
```

---

## 📚 Documentação Completa

Para mais detalhes, veja:
- `MIGRATION_CONTACT_STATUS.md` - Setup detalhado
- `CONTACT_STATUS_IMPLEMENTATION.md` - Documentação técnica
- `BOT_PAUSE_AUTO_RESUME.md` - Auto-resume feature

---

## ❓ Troubleshooting

### "Table already exists"
✅ Perfeito! A tabela já foi criada. Você pode usar os endpoints agora.

### "Permission denied"
❌ Verifique se você está usando a chave certa do Supabase.

### "RPC function exec_sql not found"
⚠️ Normal. Use o SQL Editor do Supabase (método recomendado).

### Endpoints retornam 401 Unauthorized
❌ Faltou token de autenticação. Use `-H "Authorization: Bearer YOUR_TOKEN"`

---

## ✨ Próximas Etapas

1. ✅ Executar a migração (você está aqui)
2. ⏭️ Testar os endpoints
3. ⏭️ Integrar com frontend (UI para pausar/desativar contatos)
4. ⏭️ Configurar alertas (webhook quando expirar)

---

**Status**: Pronto para usar! 🚀
