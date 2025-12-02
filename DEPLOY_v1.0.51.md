# 🚀 Deploy Guide - v1.0.51 (Easypanel/Docker)

**Data**: 2025-12-02
**Versão**: 1.0.51
**Commit**: `b899dcc`
**Tag**: `v1.0.51`

---

## 📋 **O que mudou em v1.0.51?**

### ✅ Correções e Melhorias:

1. **Database Setup Automatizado**: Script completo para configurar banco em produção
2. **Migration Standalone**: Versão sem FK para public."Instances" (compatível com banco standalone)
3. **Documentação Completa**: Guias detalhados para setup e troubleshooting do banco
4. **Fix Bot Status Maintenance**: Corrigido erro "database simonia does not exist"
5. **Gitignore Update**: Permite commits de scripts/*.sh para facilitar deployment

### 📦 Novos Arquivos:

- `scripts/setup-production-db.sh` - Script automatizado de setup do banco
- `server/migrations/create-instance-contact-status-table-standalone.sql` - Migration sem FK
- `docs/DATABASE_SETUP.md` - Guia completo de setup do banco de dados
- `FIX_DATABASE_ERROR.md` - Guia rápido de correção (5 minutos)

---

## 🔧 **Pré-requisitos**

### 1. Banco de Dados PostgreSQL

O banco de dados "simonia" precisa ser criado e as tabelas inicializadas **ANTES** do primeiro deploy.

**Opção A - Script Automatizado** (Recomendado):
```bash
# No VPS, após fazer pull do código:
./scripts/setup-production-db.sh
```

**Opção B - Manual**:
```bash
# 1. Criar banco
PGPASSWORD='sua_senha' psql -h 31.97.255.54 -U postgres -p 5432 -d postgres -c "CREATE DATABASE simonia;"

# 2. Executar schema do Drizzle
npm run db:push

# 3. Executar migrations críticas
psql ... -f server/migrations/create-instance-bot-status-table.sql
psql ... -f server/migrations/create-instance-contact-status-table-standalone.sql
```

**📖 Guia Detalhado**: [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)
**🚑 Correção Rápida**: [FIX_DATABASE_ERROR.md](FIX_DATABASE_ERROR.md)

### 2. Variáveis de Ambiente

Copiar `.env.production.example` e preencher:

```bash
# No Easypanel: Settings → Environment Variables
DATABASE_URL=postgresql://user:password@host:5432/simonia
EVOLUTION_DB_HOST=31.97.255.54
EVOLUTION_DB_PORT=5432
EVOLUTION_DB_NAME=evolution
EVOLUTION_DB_USER=postgres
EVOLUTION_DB_PASSWORD=xxxxx
JWT_SECRET=<gerar com: openssl rand -base64 48>
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
ALLOWED_ORIGINS=https://simonia-simonia.ialm8c.easypanel.host
FRONTEND_URL=https://simonia-simonia.ialm8c.easypanel.host
NODE_ENV=production
PORT=5051
```

---

## 🐳 **Deploy no Easypanel**

### Método 1: Git Push (Recomendado)

```bash
# 1. Push para o repositório
git push origin main
git push origin v1.0.51

# 2. No Easypanel:
#    - Services → Your App → Deploy
#    - Selecionar branch/tag: v1.0.51
#    - Click "Deploy"
```

### Método 2: Docker Build Local

```bash
# 1. Build da imagem
docker build -t monitoramento-ia:1.0.51 .

# 2. Tag para registry
docker tag monitoramento-ia:1.0.51 registry.easypanel.host/monitoramento-ia:1.0.51

# 3. Push para registry
docker push registry.easypanel.host/monitoramento-ia:1.0.51

# 4. Deploy no Easypanel
# Settings → Image → registry.easypanel.host/monitoramento-ia:1.0.51
```

---

## ⚙️ **Setup do Banco de Dados (Primeiro Deploy)**

Se é o primeiro deploy ou se você está vendo erro "database simonia does not exist":

### Opção 1: Script Automatizado (5 minutos)

```bash
# SSH no VPS
ssh usuario@seu-vps.com
cd /path/to/Monitoramento-de-IA

# Carregar variáveis de ambiente
export $(grep -v '^#' .env.production | xargs)

# Executar script
chmod +x scripts/setup-production-db.sh
./scripts/setup-production-db.sh

# Reiniciar aplicação
docker restart <container_name>
```

### Opção 2: Manual

Seguir o guia completo em [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)

---

## ✅ **Checklist Pós-Deploy**

### 1. Verificar Health Check
```bash
curl https://simonia-simonia.ialm8c.easypanel.host/health
# Esperado: {"status":"ok","timestamp":"2025-12-02T..."}
```

### 2. Verificar Logs
No Easypanel: **Logs** → Procurar por:
- ✅ `✅ Environment variables validated`
- ✅ `✅ Bot status maintenance job started (every 60s)`
- ✅ `🔄 Instance count changed: 0 → X`
- ✅ `serving on port 5051`
- ❌ **Sem** `database "simonia" does not exist`
- ❌ **Sem** `relation "instance_bot_status" does not exist`

### 3. Verificar Banco de Dados

```bash
# Conectar ao banco
PGPASSWORD='sua_senha' psql -h 31.97.255.54 -U postgres -p 5432 -d simonia

# Verificar tabelas
\dt

# Deve listar:
# - instance_bot_status
# - instance_contact_status
# - users
# - ias
# - conversations
# - messages
```

### 4. Testar WebSocket
```javascript
// No browser console
const ws = new WebSocket('wss://simonia-simonia.ialm8c.easypanel.host/ws?token=YOUR_TOKEN');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onerror = (e) => console.error('❌ WebSocket error:', e);
```

### 5. Verificar Instâncias
```bash
curl https://simonia-simonia.ialm8c.easypanel.host/api/whatsapp/instances \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🐛 **Troubleshooting**

### Problema: "database simonia does not exist"
**Causa**: Banco não foi criado e migrations não foram executadas
**Solução**: Ver [FIX_DATABASE_ERROR.md](FIX_DATABASE_ERROR.md)

**Solução Rápida**:
```bash
# Executar script automatizado
./scripts/setup-production-db.sh
```

**Solução Manual**:
```bash
# 1. Criar banco
PGPASSWORD='sua_senha' psql -h host -U postgres -p 5432 -d postgres -c "CREATE DATABASE simonia;"

# 2. Criar schema do Drizzle
npm run db:push

# 3. Executar migrations
psql ... -f server/migrations/create-instance-bot-status-table.sql
psql ... -f server/migrations/create-instance-contact-status-table-standalone.sql
```

---

### Problema: "relation instance_bot_status does not exist"
**Causa**: Migrations SQL não foram executadas
**Solução**:
```bash
psql -h host -U postgres -p 5432 -d simonia \
  -f server/migrations/create-instance-bot-status-table.sql
```

---

### Problema: "foreign key constraint violation" na tabela instance_contact_status
**Causa**: Migration original tenta criar FK para public."Instances" que não existe
**Solução**: Use a migration standalone:
```bash
psql -h host -U postgres -p 5432 -d simonia \
  -f server/migrations/create-instance-contact-status-table-standalone.sql
```

---

### Problema: "init-db.sh: not found"
**Causa**: Dockerfile não copiou scripts/ (apenas em v1.0.4)
**Solução**: Verificar que v1.0.51 foi deployado

---

### Problema: "CORS policy: Missing origin header"
**Causa**: Versão antiga (v1.0.4 ou anterior)
**Solução**: Deploy v1.0.51

---

### Problema: "relation public.Instance does not exist"
**Causa**: Código usando Supabase em vez de Evolution DB
**Solução**: Deploy v1.0.51 (herda correção de v1.0.5)

---

### Problema: "Invalid environment variables"
**Causa**: Variáveis não configuradas no Easypanel
**Solução**: Copiar todas as variáveis do `.env.production.example`

---

## 📊 **Versionamento**

| Versão | Data | Commits | Status | Principais Mudanças |
|--------|------|---------|--------|---------------------|
| 1.0.4 | 2025-12-01 | e72e827 | ❌ Problemas Docker | - |
| 1.0.5 | 2025-12-01 | 29607ab, 5a04cfd | ⚠️ Setup manual necessário | Correções críticas de deployment |
| **1.0.51** | **2025-12-02** | **b899dcc** | ✅ **Estável + Setup Automatizado** | **Database setup automatizado** |

---

## 🔄 **Migração de v1.0.5 para v1.0.51**

Se você já está rodando v1.0.5:

```bash
# 1. Pull das mudanças
git pull origin main
git fetch --tags
git checkout v1.0.51

# 2. Setup do banco (se ainda não foi feito)
./scripts/setup-production-db.sh

# 3. Rebuild e restart
docker build -t monitoramento-ia:1.0.51 .
docker stop monitoramento-ia
docker run -d --name monitoramento-ia ... monitoramento-ia:1.0.51

# 4. Verificar logs
docker logs -f monitoramento-ia
```

---

## 🔄 **Rollback (Se Necessário)**

```bash
# 1. Reverter para v1.0.5
git checkout v1.0.5

# 2. Rebuild
docker build -t monitoramento-ia:1.0.5 .

# 3. Deploy
git push origin main

# OU no Easypanel:
# Deploy → Select Previous Version
```

---

## 📝 **Notas Importantes**

1. **Setup do banco é obrigatório** - Use o script automatizado ou guia manual
2. **Migration standalone é importante** - Use a versão sem FK para evitar problemas
3. **Sempre configurar `.env.production`** antes do primeiro deploy
4. **CORS agora aceita requests sem Origin** - Necessário para healthchecks
5. **WebSocket funciona com token na URL** - Browser API limitation
6. **Banco 'simonia' deve existir** antes de iniciar
7. **Tabelas críticas**: instance_bot_status, instance_contact_status devem existir

---

## 🎯 **Próximos Passos**

Após deploy bem-sucedido:

1. ✅ Verificar que job de bot-status-maintenance está rodando sem erros
2. ✅ Testar envio de mensagens
3. ✅ Verificar polling de instâncias
4. ✅ Validar WebSocket real-time
5. ✅ Monitorar logs por 24h
6. ✅ Criar backup do banco

---

## 📚 **Documentação Adicional**

- [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) - Guia completo de setup do banco
- [FIX_DATABASE_ERROR.md](FIX_DATABASE_ERROR.md) - Correção rápida de erros de banco
- [.claude/plans/zesty-sprouting-kite.md](.claude/plans/zesty-sprouting-kite.md) - Plano detalhado da implementação

---

**Autor**: Claude Code
**Contato**: <noreply@anthropic.com>
**Repositório**: https://github.com/your-repo/Monitoramento-de-IA
