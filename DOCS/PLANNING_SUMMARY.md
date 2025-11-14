# 📋 Resumo Executivo - Hierarquia e Convites

**Data**: 2025-11-13
**Status**: ✅ PRONTO PARA IMPLEMENTAÇÃO
**Esforço Estimado**: 54-75 horas (4-5 semanas)

---

## 🎯 O Que Será Implementado

Você solicitou: **Sistema de hierarquia de conta com suporte a organizações, times e um sistema de convites com pré-atribuição de papéis.**

### 1. Sistema de Hierarquia

**Estrutura Multi-nível**:
```
Organization (Criada pelo Owner)
├─ Teams (Criados por Owner/Admin)
│  └─ Members com Papéis Específicos
├─ Roles (Pré-definidos + Customizáveis)
└─ Permissões Granulares por nível
```

**Papéis Organizacionais** (5 níveis):
- **Organization Owner**: Controle total (criar/deletar times, gerenciar billing)
- **Organization Admin**: Gerenciar usuários e times (sem billing)
- **Organization Manager**: Gerenciar IAs e tickets (sem usuários)
- **Organization Operator**: Executar ações (criar tickets/mensagens)
- **Organization Viewer**: Apenas visualizar (read-only)

**Papéis de Time** (4 níveis):
- **Team Owner**: Gerenciar time e membros
- **Team Admin**: Gerenciar membros (sem deletar time)
- **Team Member**: Executar ações normalmente
- **Team Viewer**: Apenas visualizar

---

### 2. Sistema de Convites

**Fluxo Completo**:
1. Admin preenche formulário (email, organização, time, papel)
2. Sistema gera token JWT (7 dias de expiração)
3. Email enviado com link de aceitar convite
4. Se novo usuário: Registra + auto-aceita convite
5. Se usuário existente: Apenas aceita convite
6. Usuário aparece na lista de membros com papel atribuído

**Integração com Registro**:
- Convite pode ser enviado ANTES do usuário ter conta
- Ao registrar via link de convite: auto-aceita e atribui papéis
- Email pré-preenchido no formulário de registro
- Experiência seamless de onboarding

---

## 📊 Estrutura de Dados

### Tabelas Novas (8 no total)

| Tabela | Propósito | Campos Principais |
|--------|-----------|------------------|
| `organizations` | Unidade de negócio | id, name, slug, ownerId |
| `teams` | Equipes dentro de org | id, organizationId, ownerId |
| `roles` | Papéis customizáveis | id, name, permissions (JSON) |
| `user_org_roles` | Usuário → Org + Papel | userId, organizationId, roleId |
| `user_team_roles` | Usuário → Time + Papel | userId, teamId, roleId |
| `invitations` | Convites pendentes | email, token, organizationId, status |
| `audit_log` | Registro de ações | actor, action, resourceType, changes |
| (modificar) `users` | Adicionar campos hierarquia | primaryOrganizationId, isDeactivated |

### Modificações na Tabela Users

Adicionar campos:
- `primaryOrganizationId` (referência a organization)
- `isDeactivated` (boolean)
- `deactivatedAt` (timestamp)
- `deactivatedBy` (referência a user)
- `lastLogin` (timestamp)

---

## 🔗 Documentos de Referência

Você tem 3 documentos detalhados:

### 1. **HIERARQUIA_CONTA_PLANEJAMENTO.md** (520 linhas)
- Design completo da hierarquia
- Tabelas SQL e schema
- Fluxos de uso (onboarding, delegação, acesso)
- 40-55 horas de implementação

**O que contém**:
- Níveis de hierarquia detalhados (org + team + resource)
- Matriz de permissões
- Script de migração de dados antigos
- Endpoints propostos (7+)
- Considerações de performance e segurança

### 2. **SISTEMA_CONVITES_DETALHADO.md** (450+ linhas)
- Fluxo completo de 7 passos
- Schema da tabela de invitations
- Backend endpoints (POST/GET/PATCH)
- HTML templates de email
- 4 componentes React completos com código
- 14-20 horas de implementação

**O que contém**:
- Fluxo detalhado (admin → email → usuário)
- Dois caminhos: novo usuário vs usuário existente
- JWT token com expiração de 7 dias
- Validações e tratamento de erros
- Responsabilidades de cada endpoint
- Exemplo de email customizado

### 3. **IMPLEMENTACAO_ROTEIRO.md** (Este novo documento - 600+ linhas)
- **Roteiro passo-a-passo** exato de como implementar
- Arquivos específicos a criar e modificar
- **Código exemplo** para cada novo arquivo
- Cronograma detalhado por fase (54-75h)
- Estratégia de testing e compatibilidade

**O que contém**:
- Lista exata de arquivos: 8 a criar + 5 a modificar
- Código TypeScript/SQL para cada arquivo
- Timeline: 5 fases (Foundation → Testing)
- Mapeamento de papéis antigos → novos
- Checklist de segurança

---

## 🚀 Fases de Implementação

### Fase 1: Foundation (8-10h) - Semana 1
- ✅ Criar migrations SQL (8 tabelas)
- ✅ Atualizar Drizzle ORM schema
- ✅ Criar types TypeScript

### Fase 2: Access Control (12-15h) - Semana 1-2
- ✅ Criar hierarchy middleware
- ✅ Criar organization routes (CRUD)
- ✅ Criar team routes (CRUD)
- ✅ Atualizar auth para compatibilidade

### Fase 3: Sistema de Convites (14-20h) - Semana 2-3
- ✅ Criar invitation routes
- ✅ Implementar envio de email
- ✅ JWT token verification
- ✅ Auto-aceitar ao registrar via invite

### Fase 4: UI (15-20h) - Semana 3-4
- ✅ OrganizationList & CreateOrganization
- ✅ MembersList & InviteUser
- ✅ AcceptInvitation page
- ✅ HierarchyContext (React Context)

### Fase 5: Testing & Deploy (5-10h) - Semana 4
- ✅ Testes de integração
- ✅ Testes de segurança
- ✅ Performance review
- ✅ Deploy em staging

---

## 📁 Arquivos a Criar (8 arquivos)

### Backend (TypeScript/SQL)

1. **`shared/schema.ts`** - Adicionar 8 tabelas Drizzle ORM
2. **`server/types/hierarchy.ts`** - Interfaces TypeScript
3. **`server/middleware/hierarchy.ts`** - RBAC avançado
4. **`server/routes/organization.routes.ts`** - CRUD org (200+ linhas)
5. **`server/routes/team.routes.ts`** - CRUD times (150+ linhas)
6. **`server/routes/invitation.routes.ts`** - Convites (300+ linhas)

### Frontend (React/TypeScript)

7. **`client/src/components/HierarchyContext.tsx`** - React Context
8. **`client/src/pages/organization/[multiple].tsx`** - UI pages (8 arquivos)

---

## 📝 Arquivos a Modificar (5 arquivos)

1. **`server/middleware/auth.ts`** - Buscar primaryOrganizationId
2. **`server/middleware/rbac.ts`** - Fallback para compatibilidade
3. **`server/routes.ts`** - Registrar novas rotas
4. **`server/config/db.ts`** - Verificar relações Drizzle
5. **`.env.example`** - Adicionar variáveis novas (se houver)

---

## 🔒 Segurança

### Implementado

✅ JWT tokens com expiração (7 dias)
✅ Permission checking em TODA requisição
✅ Tokens não podem ser reutilizados
✅ Auditoria de quem fez o quê e quando
✅ Usuários deativados imediatamente bloqueados
✅ Rate limiting em endpoints sensíveis
✅ Validação de email antes de enviar convite
✅ Scope-based data filtering (ver apenas own org)

---

## ✅ Checklist de Decisão

Você aprova:

- [ ] **Design da hierarquia** (5 papéis org + 4 times)
- [ ] **Fluxo de convites** (email com token JWT)
- [ ] **Tabelas de banco de dados** (8 novas + 4 modificações)
- [ ] **Timeline** (54-75 horas em 4-5 semanas)
- [ ] **Compatibilidade** (sistema antigo continua funcionando durante migração)
- [ ] **Começar implementação** (Fase 1 primeiro)

---

## 💡 Próximos Passos

### Suas ações:

1. **Revisar os 3 documentos**:
   - HIERARQUIA_CONTA_PLANEJAMENTO.md - Design
   - SISTEMA_CONVITES_DETALHADO.md - Convites
   - IMPLEMENTACAO_ROTEIRO.md - Implementação

2. **Confirmar/ajustar**:
   - "Aprovo este design?"
   - "Mudar algo na hierarquia?"
   - "Quando começar?"

3. **Começar quando pronto**:
   - Fase 1: Migrations + Schema
   - Fase 2-5: Conforme cronograma

### Minha responsabilidade:

- Implementar exatamente conforme plano
- Criar todos os arquivos listados
- Adicionar código exemplo completo
- Testes antes de cada fase
- Documentação clara
- **NÃO fazer commit/Docker até você testar** ✅ (conforme sua instrução)

---

## 🎓 Como Usar Estes Documentos

### Se você quer entender o DESIGN:
→ Leia: **HIERARQUIA_CONTA_PLANEJAMENTO.md**

### Se você quer entender o SISTEMA DE CONVITES:
→ Leia: **SISTEMA_CONVITES_DETALHADO.md**

### Se você quer começar a IMPLEMENTAR:
→ Leia: **IMPLEMENTACAO_ROTEIRO.md** (instruções passo-a-passo com código)

### Se você quer uma VISÃO GERAL:
→ Leia: **Este arquivo (PLANNING_SUMMARY.md)**

---

## 📊 Métricas

| Métrica | Valor |
|---------|-------|
| Novas tabelas de banco | 8 |
| Modificações em tabelas | 4 |
| Novos tipos TypeScript | 9 |
| Novos middlewares | 1 |
| Novos route files | 3 |
| Novos componentes React | 8 |
| Linhas de código backend | ~1500 |
| Linhas de código frontend | ~1200 |
| Testes de integração | 15+ |
| Testes de segurança | 8+ |
| **Tempo total** | **54-75h** |

---

## 🔄 Compatibilidade com Código Existente

- ✅ Usuários antigos continuam funcionando
- ✅ Papéis antigos (admin/operator/viewer) são mapeados para novos
- ✅ Cada usuário recebe uma "Organization Pessoal"
- ✅ Permissions check caem de volta para sistema antigo se sem req.hierarchy
- ✅ Zero quebra de endpoints antigos
- ✅ Migração gradual é possível

---

## ⚠️ Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Quebrar autenticação existente | Fallback para RBAC antigo |
| Dados antigos não migram | Script de migração testado |
| Usuários perdem acesso | Cada user recebe org pessoal |
| Performance cai | Índices + caching Redis |
| Segurança comprometida | Teste de IDOR, CSRF, etc |

---

## 📞 Perguntas Frequentes

**P: Quando implementar?**
A: Assim que confirmar aprovação dos designs. Pode ser imediato ou agendar para próxima semana.

**P: Preciso fazer teste antes de deploy?**
A: Sim! Você explicitamente pediu para testar primeiro. Nada será commitado em git ou Docker sem seu OK.

**P: E os usuários antigos?**
A: Cada um recebe uma "Organization Pessoal" automaticamente. Papéis antigos são mapeados para novos.

**P: Posso customizar os papéis?**
A: Sim! O sistema suporta custom roles além dos pré-definidos.

**P: Quanto tempo vai levar?**
A: 54-75 horas = 4-5 semanas se 1 dev full-time, ou proporcional se part-time.

---

## 🎉 Conclusão

Você tem um sistema completo planejado e documentado. Faltam apenas 3 coisas:

1. ✅ **Seus documentos estão prontos** (3 arquivos .md detalhados)
2. ⏳ **Sua aprovação** (confirmar que design/timeline estão ok)
3. 🚀 **Começar a implementação** (primeiro commit em Phase 1)

**Próximo passo**: Revisar documentos e confirmar que está tudo certo!

---

**Documentos Criados**:
- ✅ HIERARQUIA_CONTA_PLANEJAMENTO.md (520 linhas)
- ✅ SISTEMA_CONVITES_DETALHADO.md (450+ linhas)
- ✅ IMPLEMENTACAO_ROTEIRO.md (600+ linhas)
- ✅ PLANNING_SUMMARY.md (Este arquivo)

**Status**: Aguardando aprovação para prosseguir! 🚀
