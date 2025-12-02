# Database Setup Guide - Production

Este guia detalha como configurar o banco de dados PostgreSQL "simonia" em produção, incluindo a criação do banco e execução de todas as migrations necessárias.

## Problema que este guia resolve

Se você encontrou o erro:
```
database "simonia" does not exist
[bot-status] Failed to auto-resume expired pauses
```

Este guia mostrará como criar o banco e todas as tabelas necessárias.

---

## Pré-requisitos

1. **PostgreSQL 12+** instalado e rodando
2. **Cliente psql** instalado (`apt install postgresql-client` ou `brew install postgresql`)
3. **Acesso ao servidor** PostgreSQL (via SSH ou Docker)
4. **Credenciais** de administrador do PostgreSQL
5. **Variável DATABASE_URL** configurada no .env.production

---

## Opção 1: Script Automatizado (Recomendado)

### Passo 1: Preparar ambiente

```bash
# SSH no VPS
ssh usuario@seu-servidor.com

# Navegar para o diretório do projeto
cd /path/to/Monitoramento-de-IA

# Carregar variáveis de ambiente
export $(grep -v '^#' .env.production | xargs)

# Verificar se DATABASE_URL está setado
echo $DATABASE_URL
```

### Passo 2: Dar permissão e executar script

```bash
# Dar permissão de execução
chmod +x scripts/setup-production-db.sh

# Executar script
./scripts/setup-production-db.sh
```

### Passo 3: Verificar sucesso

O script deve exibir:
```
✅ All critical tables verified successfully!
🎉 Database setup complete!
```

### Passo 4: Reiniciar aplicação

```bash
# Docker
docker restart <container_name>

# Systemctl
systemctl restart monitoramento-ia

# Docker Compose
docker-compose restart
```

---

## Opção 2: Setup Manual

Use esta opção se o script automatizado falhar ou se você preferir fazer passo a passo.

### Passo 1: Criar o banco de dados

```bash
# Conectar ao PostgreSQL
PGPASSWORD='sua_senha' psql -h 31.97.255.54 -U postgres -p 5432 -d postgres

# Criar banco
CREATE DATABASE simonia;

# Verificar
\l

# Sair
\q
```

**Via Docker** (se PostgreSQL está em container):
```bash
docker exec -it <postgres_container> psql -U postgres -c "CREATE DATABASE simonia;"
```

---

### Passo 2: Criar tabelas do Drizzle Schema

As tabelas definidas em [shared/schema.ts](../shared/schema.ts) são gerenciadas pelo Drizzle ORM.

```bash
# Navegar para o diretório do projeto
cd /path/to/Monitoramento-de-IA

# Executar push do schema
npm run db:push
```

**Tabelas criadas**:
- `users` - Usuários com RBAC
- `ias` - Instâncias de IA
- `tickets` - Tickets de erro
- `actions` - Audit log de ações
- `conversations` - Conversas
- `messages` - Mensagens
- `metrics` - Métricas
- `settings` - Configurações globais
- `uazapi_instances` - Instâncias Uazapi
- `contact_metadata` - Metadados de contatos

---

### Passo 3: Executar migrations SQL manuais

Algumas tabelas não estão no schema do Drizzle e precisam ser criadas manualmente.

#### 3.1. instance_bot_status

Esta tabela gerencia o status de pausa/ativação dos bots por instância.

```bash
PGPASSWORD='sua_senha' psql \
  -h 31.97.255.54 \
  -U postgres \
  -p 5432 \
  -d simonia \
  -f server/migrations/create-instance-bot-status-table.sql
```

**Verificar**:
```sql
\d instance_bot_status
```

---

#### 3.2. instance_contact_status

Esta tabela gerencia o status de contatos individuais.

**IMPORTANTE**: Use a versão **standalone** que não tem FK para a tabela Instances do Supabase.

```bash
PGPASSWORD='sua_senha' psql \
  -h 31.97.255.54 \
  -U postgres \
  -p 5432 \
  -d simonia \
  -f server/migrations/create-instance-contact-status-table-standalone.sql
```

**Verificar**:
```sql
\d instance_contact_status
```

---

### Passo 4: Verificar todas as tabelas

```bash
PGPASSWORD='sua_senha' psql \
  -h 31.97.255.54 \
  -U postgres \
  -p 5432 \
  -d simonia \
  -c "\dt"
```

**Tabelas críticas esperadas**:
- ✅ `instance_bot_status`
- ✅ `instance_contact_status`
- ✅ `users`
- ✅ `ias`
- ✅ `conversations`
- ✅ `messages`
- ✅ `tickets`
- ✅ `actions`
- ✅ `metrics`
- ✅ `settings`

---

### Passo 5: Reiniciar aplicação

```bash
# Docker
docker restart monitoramento-ia

# Docker Compose
docker-compose restart monitoramento-ia

# Systemctl
sudo systemctl restart monitoramento-ia
```

---

### Passo 6: Verificar logs

```bash
# Docker
docker logs -f monitoramento-ia

# Systemctl
journalctl -u monitoramento-ia -f
```

**Procurar por**:
- ✅ `✅ Bot status maintenance job started (every 60s)`
- ✅ Sem erros `database "simonia" does not exist`
- ✅ Sem erros `relation "instance_bot_status" does not exist`

---

## Troubleshooting

### Erro: "permission denied to create database"

**Solução**: Use um usuário com permissões de superuser ou CREATEDB:

```sql
-- Conectar como postgres
psql -U postgres

-- Dar permissão ao usuário
ALTER USER seu_usuario CREATEDB;
```

---

### Erro: "role authenticated does not exist"

**Causa**: As RLS policies esperam um role "authenticated" que existe no Supabase mas não no PostgreSQL standalone.

**Solução**: A versão standalone da migration já remove as RLS policies. Use:
```bash
server/migrations/create-instance-contact-status-table-standalone.sql
```

---

### Erro: "relation Instances does not exist"

**Causa**: A migration original tem uma FK para `public."Instances"` que só existe no banco do Supabase/Evolution.

**Solução**: Use a versão standalone que remove essa FK:
```bash
server/migrations/create-instance-contact-status-table-standalone.sql
```

---

### Erro: "npm run db:push fails"

**Causa**: DATABASE_URL não está configurado ou está incorreto.

**Solução**:
```bash
# Verificar
echo $DATABASE_URL

# Exportar manualmente
export DATABASE_URL='postgresql://user:password@host:port/simonia'

# Tentar novamente
npm run db:push
```

---

## Migrações Adicionais (Opcional)

Se sua aplicação usa outras features, você pode precisar de migrations adicionais:

### Bot Instances
```bash
psql ... -f server/migrations/create-bot-instances-table.sql
```

### User Profiles (Supabase)
```bash
psql ... -f server/migrations/create-user-profiles-table.sql
```

### N8N Workflows
```bash
psql ... -f server/migrations/create-instance-n8n-workflows-table.sql
```

### Message Indexes (Performance)
```bash
psql ... -f server/migrations/add-message-indexes.sql
```

---

## Estrutura das Tabelas Principais

### instance_bot_status

Gerencia status de IA por instância (ativo, pausado, inativo).

```sql
CREATE TABLE instance_bot_status (
  id BIGSERIAL PRIMARY KEY,
  instance_id UUID NOT NULL,
  instance_number VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  pause_reason VARCHAR(255),
  paused_until TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### instance_contact_status

Gerencia status de IA por contato individual.

```sql
CREATE TABLE instance_contact_status (
  id BIGSERIAL PRIMARY KEY,
  instance_id UUID NOT NULL,
  instance_number VARCHAR(255) NOT NULL,
  contact_jid VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  pause_reason TEXT,
  paused_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instance_id, contact_jid),
  UNIQUE(instance_number, contact_jid)
);
```

---

## Manutenção do Banco

### Backup

```bash
# Dump completo
pg_dump -h 31.97.255.54 -U postgres -d simonia > simonia_backup.sql

# Dump apenas estrutura (schema)
pg_dump -h 31.97.255.54 -U postgres -d simonia --schema-only > simonia_schema.sql
```

### Restore

```bash
# Restaurar backup completo
psql -h 31.97.255.54 -U postgres -d simonia < simonia_backup.sql
```

### Verificar tamanho do banco

```sql
SELECT pg_size_pretty(pg_database_size('simonia'));
```

---

## Referências

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

---

## Contato

Se você encontrar problemas não cobertos neste guia, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.
