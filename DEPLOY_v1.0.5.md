# 🚀 Deploy Guide - v1.0.5 (Easypanel/Docker)

**Data**: 2025-12-01
**Versão**: 1.0.5
**Commit**: `5a04cfd`
**Tag**: `v1.0.5`

---

## 📋 **O que mudou em v1.0.5?**

### ✅ Correções Críticas:

1. **Dockerfile**: Agora copia `scripts/` (fix init-db.sh not found)
2. **CORS**: Permite requisições sem Origin header (healthchecks funcionando)
3. **Polling**: Usa Evolution DB (não Supabase) - fix "relation Instance does not exist"
4. **WebSocket**: Aceita token na URL (browsers não suportam headers customizados)
5. **Docs**: Criado `.env.production.example` com todas as variáveis obrigatórias

---

## 🔧 **Pré-requisitos**

### 1. Banco de Dados PostgreSQL

O banco de dados "simonia" precisa ser criado e as tabelas inicializadas **ANTES** do primeiro deploy.

**Opção A - Script Automatizado** (Recomendado):
```bash
# No VPS, executar:
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
git push origin v1.0.5

# 2. No Easypanel:
#    - Services → Your App → Deploy
#    - Selecionar branch/tag: v1.0.5
#    - Click "Deploy"
```

### Método 2: Docker Build Local

```bash
# 1. Build da imagem
docker build -t monitoramento-ia:1.0.5 .

# 2. Tag para registry
docker tag monitoramento-ia:1.0.5 registry.easypanel.host/monitoramento-ia:1.0.5

# 3. Push para registry
docker push registry.easypanel.host/monitoramento-ia:1.0.5

# 4. Deploy no Easypanel
# Settings → Image → registry.easypanel.host/monitoramento-ia:1.0.5
```

---

## ✅ **Checklist Pós-Deploy**

### 1. Verificar Health Check
```bash
curl https://simonia-simonia.ialm8c.easypanel.host/health
# Esperado: {"status":"ok","timestamp":"2025-12-01T..."}
```

### 2. Verificar Logs
No Easypanel: **Logs** → Procurar por:
- ✅ `✅ Environment variables validated`
- ✅ `🔄 Instance count changed: 0 → X`
- ✅ `serving on port 5051`
- ❌ **Sem** `init-db.sh: not found`
- ❌ **Sem** `CORS policy: Missing origin header`

### 3. Testar WebSocket
```javascript
// No browser console
const ws = new WebSocket('wss://simonia-simonia.ialm8c.easypanel.host/ws?token=YOUR_TOKEN');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onerror = (e) => console.error('❌ WebSocket error:', e);
```

### 4. Verificar Instâncias
```bash
curl https://simonia-simonia.ialm8c.easypanel.host/api/whatsapp/instances \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🐛 **Troubleshooting**

### Problema: "init-db.sh: not found"
**Causa**: Dockerfile não copiou scripts/
**Solução**: Verificar que v1.0.5 foi deployado (não v1.0.4)

### Problema: "CORS policy: Missing origin header"
**Causa**: Versão antiga (v1.0.4 ou anterior)
**Solução**: Deploy v1.0.5

### Problema: "relation public.Instance does not exist"
**Causa**: Código usando Supabase em vez de Evolution DB
**Solução**: Deploy v1.0.5 (commit 29607ab + 5a04cfd)

### Problema: "database simonia does not exist"
**Causa**: Banco não foi criado e migrations não foram executadas
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

**📖 Guia Completo**: Ver [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)

### Problema: "Invalid environment variables"
**Causa**: Variáveis não configuradas no Easypanel
**Solução**: Copiar todas as variáveis do `.env.production.example`

---

## 📊 **Versionamento**

| Versão | Data | Commits | Status |
|--------|------|---------|--------|
| 1.0.4 | - | e72e827 | ❌ Problemas Docker |
| **1.0.5** | **2025-12-01** | **29607ab, 5a04cfd** | ✅ **Estável** |

---

## 🔄 **Rollback (Se Necessário)**

```bash
# 1. Reverter para v1.0.3
git revert 5a04cfd 29607ab
git commit -m "revert: rollback to v1.0.3"

# 2. Deploy
git push origin main

# OU no Easypanel:
# Deploy → Select Previous Version
```

---

## 📝 **Notas Importantes**

1. **Não usar v1.0.4** - Tem problemas críticos de deployment
2. **Sempre configurar `.env.production`** antes do primeiro deploy
3. **CORS agora aceita requests sem Origin** - Necessário para healthchecks
4. **WebSocket funciona com token na URL** - Browser API limitation
5. **Banco 'simonia' deve existir** antes de iniciar

---

## 🎯 **Próximos Passos**

Após deploy bem-sucedido:

1. ✅ Testar envio de mensagens
2. ✅ Verificar polling de instâncias
3. ✅ Validar WebSocket real-time
4. ✅ Monitorar logs por 24h
5. ✅ Criar backup do banco

---

**Autor**: Claude Code
**Contato**: <noreply@anthropic.com>
**Repositório**: https://github.com/your-repo/Monitoramento-de-IA
