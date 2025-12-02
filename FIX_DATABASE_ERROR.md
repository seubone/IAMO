# Fix: "database simonia does not exist"

Se você está vendo este erro nos logs:
```
[bot-status] Failed to auto-resume expired pauses: database "simonia" does not exist
[bot-status-maintenance] Maintenance failed: Failed to auto-resume expired pauses
```

## Solução Rápida (5 minutos)

### 1. SSH no VPS

```bash
ssh usuario@31.97.255.54
cd /path/to/Monitoramento-de-IA
```

### 2. Configurar variáveis de ambiente

```bash
# Carregar .env.production
export $(grep -v '^#' .env.production | xargs)

# Verificar
echo $DATABASE_URL
```

### 3. Executar script de setup

```bash
# Dar permissão
chmod +x scripts/setup-production-db.sh

# Executar
./scripts/setup-production-db.sh
```

**Esperado**:
```
✅ All critical tables verified successfully!
🎉 Database setup complete!
```

### 4. Reiniciar aplicação

```bash
# Docker
docker restart <container_name>

# OU via Docker Compose
docker-compose restart

# OU via Systemctl
systemctl restart monitoramento-ia
```

### 5. Verificar logs

```bash
# Docker
docker logs -f <container_name>

# Procurar por:
# ✅ "Bot status maintenance job started"
# ❌ Sem mais erros de "database does not exist"
```

---

## Solução Manual (se script falhar)

### Passo 1: Criar banco

```bash
PGPASSWORD='15190b6802844e6781b2' psql \
  -h 31.97.255.54 \
  -U postgres \
  -p 5432 \
  -d postgres \
  -c "CREATE DATABASE simonia;"
```

### Passo 2: Criar tabelas do Drizzle

```bash
npm run db:push
```

### Passo 3: Criar tabela instance_bot_status

```bash
PGPASSWORD='15190b6802844e6781b2' psql \
  -h 31.97.255.54 \
  -U postgres \
  -p 5432 \
  -d simonia \
  -f server/migrations/create-instance-bot-status-table.sql
```

### Passo 4: Criar tabela instance_contact_status

```bash
PGPASSWORD='15190b6802844e6781b2' psql \
  -h 31.97.255.54 \
  -U postgres \
  -p 5432 \
  -d simonia \
  -f server/migrations/create-instance-contact-status-table-standalone.sql
```

### Passo 5: Verificar

```bash
PGPASSWORD='15190b6802844e6781b2' psql \
  -h 31.97.255.54 \
  -U postgres \
  -p 5432 \
  -d simonia \
  -c "\dt"
```

**Tabelas esperadas**:
- ✅ instance_bot_status
- ✅ instance_contact_status
- ✅ users
- ✅ ias
- ✅ conversations
- ✅ messages

---

## Troubleshooting

### Erro: "psql: command not found"

**Solução**:
```bash
# Ubuntu/Debian
apt install postgresql-client

# Alpine (Docker)
apk add postgresql-client

# MacOS
brew install postgresql
```

---

### Erro: "permission denied to create database"

**Solução**: Use o usuário postgres ou um usuário com permissão CREATEDB.

---

### Erro: "npm run db:push fails"

**Causa**: DATABASE_URL não está setada.

**Solução**:
```bash
# Exportar manualmente
export DATABASE_URL='postgresql://postgres:15190b6802844e6781b2@31.97.255.54:5432/simonia?sslmode=disable'

# Tentar novamente
npm run db:push
```

---

### Script não executa

**Verificar permissões**:
```bash
chmod +x scripts/setup-production-db.sh
ls -la scripts/setup-production-db.sh
```

---

## Verificação Final

Execute no PostgreSQL:

```sql
-- Conectar
psql -h 31.97.255.54 -U postgres -p 5432 -d simonia

-- Verificar tabelas
\dt

-- Contar registros
SELECT COUNT(*) FROM instance_bot_status;
SELECT COUNT(*) FROM instance_contact_status;

-- Verificar schema
\d instance_bot_status
\d instance_contact_status
```

---

## Arquivos Criados

Esta correção criou os seguintes arquivos:

1. **scripts/setup-production-db.sh** - Script automatizado de setup
2. **server/migrations/create-instance-contact-status-table-standalone.sql** - Migration sem FK
3. **docs/DATABASE_SETUP.md** - Guia detalhado
4. **FIX_DATABASE_ERROR.md** - Este guia rápido

---

## Documentação Completa

Para mais detalhes, consulte:
- [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) - Guia completo de setup
- [DEPLOY_v1.0.5.md](DEPLOY_v1.0.5.md) - Guia de deployment

---

## Contato

Se o problema persistir, abra uma issue com:
- Logs completos do erro
- Output do comando `psql -c "\dt"`
- Conteúdo da variável DATABASE_URL (sem senha)
