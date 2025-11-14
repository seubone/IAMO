# 📊 Planejamento de Hierarquia de Conta - Monitor IA

## 1. Visão Geral

Proposta de sistema de hierarquia e controle de acesso baseado em organizações, equipes e papéis com permissões granulares.

---

## 2. Estrutura Atual vs. Proposta

### Atual (3 papéis simples)
```
├─ Admin (acesso total)
├─ Operator (read/create/update)
└─ Viewer (read-only)
```

### Proposta (Hierarquia Multi-nível)
```
Organization
├─ Owner (máximo poder)
├─ Admin (gerencia de times e usuários)
├─ Manager (gerencia de projeto/IA)
├─ Operator (executa ações)
└─ Viewer (apenas visualiza)

+ Team Level
├─ Team Owner
├─ Team Admin
├─ Team Member
└─ Team Viewer

+ Resource Level
├─ IA-specific permissions
├─ Project-specific permissions
└─ Custom role assignments
```

---

## 3. Níveis de Hierarquia Propostos

### 3.1 Nível Organizacional

| Papel | Escopo | Permissões |
|-------|--------|-----------|
| **Organization Owner** | Toda a org | Tudo (criar/deletar times, gerenciar billing, audit) |
| **Organization Admin** | Toda a org | Gerenciar usuários, times, permissões (sem billing) |
| **Organization Manager** | Projetos atribuídos | Gerenciar IAs, tickets, ações (sem usuários) |
| **Organization Operator** | Projetos atribuídos | Executar ações, criar tickets/mensagens |
| **Organization Viewer** | Projetos atribuídos | Apenas visualizar (read-only) |

### 3.2 Nível de Time (Team)

| Papel | Escopo | Permissões |
|-------|--------|-----------|
| **Team Owner** | Time específico | Gerenciar time, membros, removidos |
| **Team Admin** | Time específico | Gerenciar membros, permissões (sem deletar time) |
| **Team Lead** | Projetos do time | Supervisiona operações, aprova ações |
| **Team Member** | Projetos atribuídos | Executa ações normalmente |
| **Team Viewer** | Projetos atribuídos | Apenas visualiza |

### 3.3 Nível de Recurso (IA/Projeto)

| Permissão | Descrição |
|-----------|-----------|
| `ia:read` | Visualizar IA |
| `ia:update` | Editar configuração |
| `ia:manage` | Gerenciar (incluindo pause/resume) |
| `ia:delete` | Deletar IA |
| `ticket:read` | Visualizar tickets |
| `ticket:create` | Criar tickets |
| `ticket:update` | Atualizar tickets |
| `action:read` | Visualizar ações |
| `action:create` | Criar ações |
| `action:execute` | Executar ações |
| `conversation:read` | Visualizar conversas |
| `conversation:manage` | Gerenciar conversas |
| `user:read` | Visualizar usuários |
| `user:manage` | Gerenciar usuários |

---

## 4. Modelo de Dados Proposto

### 4.1 Novas Tabelas

```sql
-- Organization
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  description TEXT,
  avatar_url VARCHAR,
  owner_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Team
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  description TEXT,
  avatar_url VARCHAR,
  owner_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Role (customizável)
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  description TEXT,
  permissions JSON NOT NULL, -- ["IA:read", "ticket:create", ...]
  is_default BOOLEAN,
  is_custom BOOLEAN,
  created_at TIMESTAMP
);

-- User Organization Membership
CREATE TABLE user_org_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  UNIQUE(user_id, organization_id)
);

-- User Team Membership
CREATE TABLE user_team_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  UNIQUE(user_id, team_id)
);

-- Resource-level Permissions
CREATE TABLE resource_permissions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  resource_type VARCHAR, -- 'ia', 'project', etc
  resource_id UUID,
  permissions JSON, -- ["read", "update", "execute"]
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP
);

-- Invitation
CREATE TABLE invitations (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  team_id UUID REFERENCES teams(id),
  email VARCHAR NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  invited_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR, -- 'pending', 'accepted', 'rejected'
  expires_at TIMESTAMP,
  created_at TIMESTAMP
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  actor_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR NOT NULL, -- 'role_assigned', 'team_created', etc
  resource_type VARCHAR,
  resource_id UUID,
  changes JSON,
  timestamp TIMESTAMP
);
```

### 4.2 Alterações na Tabela Users

```sql
-- Adicionar campos:
ALTER TABLE users ADD COLUMN (
  primary_organization_id UUID REFERENCES organizations(id),
  is_super_admin BOOLEAN DEFAULT FALSE, -- Super admin global (raramente usado)
  last_login TIMESTAMP,
  is_deactivated BOOLEAN DEFAULT FALSE,
  deactivated_at TIMESTAMP,
  deactivated_by UUID REFERENCES users(id)
);
```

---

## 5. Fluxos de Uso

### 5.1 Onboarding de Novo Usuário

```
1. Usuário se registra (cria account pessoal)
2. Sistema cria Organization pessoal (padrão)
3. Usuário é atribuído como Organization Owner
4. Usuário pode:
   - Criar times dentro da org
   - Convidar outros usuários
   - Atribuir papéis
```

### 5.2 Convidando Usuário para Organização

```
1. Admin clica em "Convidar Usuário"
2. Insere email e seleciona papel
3. Sistema envia convite por email
4. Usuário clica no link (gera invite token)
5. Se não tem conta: registra + aceita invite
6. Se tem conta: apenas aceita convite
7. Usuário aparece na lista de membros
```

### 5.3 Delegando Permissões

```
1. Owner atribui "Team Admin" a usuário
2. Team Admin pode gerenciar membros da equipe
3. Owner atribui "Project Manager" para IA específica
4. Project Manager pode criar/editar ações dessa IA
5. Permission matrix é checada em cada requisição
```

### 5.4 Acesso a Recurso

```
Request: GET /api/ias/:id
↓
Middleware verifica:
1. Token válido?
2. Usuário está deativado?
3. Verificar permissão na organização
4. Verificar permissão no time (se aplicável)
5. Verificar permissão no recurso (se definida)
6. Retorna IA se todas as checks passarem
```

---

## 6. Implementação por Fase

### Fase 1: Foundation (Semana 1-2)
- ✅ Criar tabelas no banco
- ✅ Criar migrations
- ✅ Implementar modelos TypeScript
- ✅ Criar CRUD de Organizations
- ✅ Criar CRUD de Teams
- ✅ Criar CRUD de Roles

### Fase 2: Access Control (Semana 2-3)
- ✅ Implementar RBAC middleware melhorado
- ✅ Criar endpoints de assignment de papéis
- ✅ Implementar permission checking
- ✅ Criar audit log middleware
- ✅ Testes de permissões

### Fase 3: User Management UI (Semana 3-4)
- ✅ Dashboard de Organização
- ✅ Página de Membros
- ✅ Sistema de Convites
- ✅ Atribuição de Papéis
- ✅ Logs de Auditoria

### Fase 4: Advanced Features (Semana 4+)
- ✅ Custom Roles
- ✅ Resource-level permissions
- ✅ Team management
- ✅ Bulk operations
- ✅ API keys/tokens

---

## 7. Endpoints Propostos

### Organization Management
```
POST   /api/organizations                  # Criar org
GET    /api/organizations                  # Listar minhas orgs
GET    /api/organizations/:id              # Detalhes
PATCH  /api/organizations/:id              # Editar
DELETE /api/organizations/:id              # Deletar
GET    /api/organizations/:id/members      # Listar membros
POST   /api/organizations/:id/invite       # Convidar usuário
GET    /api/organizations/:id/audit        # Logs de auditoria
```

### Team Management
```
POST   /api/teams                          # Criar time
GET    /api/teams?org_id=xxx               # Listar times
GET    /api/teams/:id                      # Detalhes
PATCH  /api/teams/:id                      # Editar
DELETE /api/teams/:id                      # Deletar
GET    /api/teams/:id/members              # Listar membros
POST   /api/teams/:id/invite               # Convidar para time
```

### Role Management
```
GET    /api/roles?org_id=xxx               # Listar papéis da org
POST   /api/roles                          # Criar papel customizado
GET    /api/roles/:id                      # Detalhes
PATCH  /api/roles/:id                      # Editar papel
DELETE /api/roles/:id                      # Deletar papel customizado
```

### User Roles Assignment
```
POST   /api/users/:id/org-role             # Atribuir papel na org
POST   /api/users/:id/team-role            # Atribuir papel no time
DELETE /api/users/:id/org-role             # Remover papel na org
PATCH  /api/users/:id/deactivate           # Desativar usuário
GET    /api/users/invitations              # Meus convites pendentes
PATCH  /api/invitations/:id/accept         # Aceitar convite
```

---

## 8. Migração de Dados (Backward Compatibility)

### Mapeamento de Papéis Antigos → Novos

```
Old Role          →  New Role               →  Permissions
-------------------------------------------------------------
admin             →  Organization Owner     →  ["*"]
operator          →  Organization Operator  →  [IA:*, ticket:*, action:*, message:*]
viewer            →  Organization Viewer    →  [IA:read, ticket:read, ...]
(novo)            →  Organization Manager   →  [projeto específico]
(novo)            →  Team Lead              →  [supervisão de time]
```

### Script de Migração
```typescript
// 1. Criar organização padrão para cada usuário
// 2. Mapear role antigo → novo
// 3. Atribuir user_org_roles baseado em usuário existente
// 4. Manter compatibilidade com queries antigas
```

---

## 9. Segurança

### Checklist
- ✅ Permission checking em TODA requisição
- ✅ Auditar mudanças de papel
- ✅ Rate limit em endpoints sensíveis
- ✅ Supabase RLS policies sincronizadas
- ✅ Revogar acesso imediatamente ao desativar
- ✅ Encriptar dados sensíveis
- ✅ Logs de quem fez o quê e quando

### Rate Limiting Proposto
```
POST /organizations/:id/invite   - 10/min
POST /api/users/:id/org-role     - 30/min
GET  /api/organizations/:id/audit - 5/min
```

---

## 10. Exemplo de Fluxo Real

### Cenário: Empresa com múltiplos times

```
Company Organization
├─ Owner: CEO
├─ Admin: CTO
└─ Teams:
    ├─ Team: AI Ops
    │  ├─ Owner: Lead Engineer
    │  └─ Members: 3 Operators
    │
    ├─ Team: Quality Assurance
    │  ├─ Owner: QA Lead
    │  └─ Members: 2 Viewers
    │
    └─ IAs:
       ├─ IA-1 (ChatBot)
       │  └─ Assigned to: AI Ops team
       │
       └─ IA-2 (Analytics)
          └─ Assigned to: All teams (read-only for QA)
```

### Fluxo de Acesso
```
QA Viewer tenta acessar IA-1:
1. Token válido? ✅
2. Usuário ativo? ✅
3. Membro da org? ✅
4. Tem permissão "IA:read"? ❌ (tem apenas view read-only)
5. Recurso (IA-1) permite? ❌ (restrito ao AI Ops team)
6. Resposta: 403 Forbidden

AI Ops Operator tenta executar ação em IA-1:
1. Token válido? ✅
2. Usuário ativo? ✅
3. Membro da org? ✅
4. Tem permissão "action:execute"? ✅
5. Recurso (IA-1) permite? ✅
6. Resposta: 200 OK - Ação executada
```

---

## 11. Considerações de Performance

### Otimizações
- ✅ Cache de roles em Redis (TTL: 5min)
- ✅ Cache de permissions em memoria (invalidado ao mudar role)
- ✅ Eager loading de relacionamentos
- ✅ Índices no banco em org_id, user_id, role_id
- ✅ Paginação em listagens

### Queries
```sql
-- Otimizado com JOIN e cache
SELECT p.* FROM permissions p
WHERE p.user_id = $1 AND p.org_id = $2
-- Resultado cacheado por 5 minutos
```

---

## 12. Próximos Passos

### Decisões Necessárias
1. ✅ Aprovamos essa hierarquia?
2. ✅ Simplificar algo?
3. ✅ Adicionar novos papéis?
4. ✅ Quer custom roles desde o início?
5. ✅ Quer features de billing/enterprise?

### Para Começar
1. [ ] Revisar este documento
2. [ ] Feedback/ajustes
3. [ ] Criar migrations SQL
4. [ ] Implementar tabelas no banco
5. [ ] Criar endpoints CRUD
6. [ ] Implementar middleware RBAC
7. [ ] Testes de permissão
8. [ ] UI de gerenciamento

---

## 13. Arquivos que Serão Afetados/Criados

### Novos Arquivos
```
server/
├─ models/
│  ├─ organization.ts
│  ├─ team.ts
│  ├─ role.ts
│  ├─ invitation.ts
│  └─ audit-log.ts
├─ routes/
│  ├─ organization.routes.ts
│  ├─ team.routes.ts
│  ├─ role.routes.ts
│  └─ invitation.routes.ts
├─ middleware/
│  ├─ rbac-advanced.ts
│  └─ permission-checker.ts
└─ migrations/
   └─ 002-add-hierarchy.sql
```

### Arquivos Modificados
```
server/
├─ routes.ts (remover auth antigo, adicionar imports novos)
├─ middleware/rbac.ts (expandir para nova hierarquia)
├─ config/db-storage.ts (adicionar org/team methods)
├─ index.ts (registrar novos middlewares)
└─ types.ts (adicionar types novos)

shared/
└─ schema.ts (adicionar fields, relações)
```

---

## 14. Estimativa

| Fase | Esforço | Timeline |
|------|---------|----------|
| Foundation | 8-10h | Semana 1 |
| Access Control | 12-15h | Semana 2 |
| UI | 15-20h | Semana 3 |
| Testing | 5-10h | Semana 4 |
| **Total** | **40-55h** | **~4 semanas** |

---

## Decisão Necessária ✅

Você quer:
- [ ] A. Implementar toda essa hierarquia
- [ ] B. Versão simplificada (apenas org + times, sem resource-level)
- [ ] C. Apenas melhorar o sistema atual (add deactivation, audit, convites)
- [ ] D. Outra abordagem?

**Deixa seu feedback e começamos!** 🚀
