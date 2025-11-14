# 🗺️ Roteiro de Implementação - Hierarquia e Convites

**Status**: PRONTO PARA IMPLEMENTAÇÃO
**Documentos Relacionados**:
- [HIERARQUIA_CONTA_PLANEJAMENTO.md](./HIERARQUIA_CONTA_PLANEJAMENTO.md) - Design da hierarquia
- [SISTEMA_CONVITES_DETALHADO.md](./SISTEMA_CONVITES_DETALHADO.md) - Design do sistema de convites

---

## 📋 Resumo Executivo

Este documento fornece o **roteiro passo-a-passo** para implementar:
1. Sistema de hierarquia (Organizations → Teams → Resources)
2. Sistema de convites com pre-atribuição de papéis
3. Integração com RBAC existente
4. UI de gerenciamento

**Timeline**: 54-75 horas de trabalho (4-5 semanas)
**Fases**: 4 fases incrementais + testing

---

## 🏗️ Arquitetura Atual vs. Proposta

### ATUAL (3 papéis flat)
```
User
├─ role: "admin" | "operator" | "viewer"
└─ permissions: hard-coded no middleware
```

**Arquivo**: `shared/schema.ts:7-18`

### PROPOSTA (Hierarquia multi-nível)
```
Organization
├─ Teams
│  └─ Members com papéis
├─ Roles (pré-definidos + custom)
└─ Users com múltiplos papéis por contexto

+ Invitations
  ├─ Por email com token JWT
  └─ Auto-aceita ao registrar novo usuário
```

---

## 📁 Arquivos a Criar

### Novos Arquivos de Schema (Drizzle ORM)

#### 1. `shared/schema.ts` (MODIFICAR - adicionar ao final)

**Adicionar**:
```typescript
// Organizations table
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Teams table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Roles table (pré-definidos + custom)
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Organization Owner", "Team Member", etc
  description: text("description"),
  permissions: jsonb("permissions").notNull(), // ["ias:read", "ticket:create", ...]
  isDefault: boolean("is_default").default(false),
  isCustom: boolean("is_custom").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Organization Membership
export const userOrgRoles = pgTable("user_org_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => roles.id),
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

// User Team Membership
export const userTeamRoles = pgTable("user_team_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => roles.id),
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

// Invitations table (para sistema de convites)
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  roleId: varchar("role_id").notNull().references(() => roles.id),
  inviteToken: text("invite_token").notNull().unique(),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, expired
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: varchar("accepted_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  customMessage: text("custom_message"),
  metadata: jsonb("metadata"),
});

// Audit Log table
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id),
  actorId: varchar("actor_id").notNull().references(() => users.id),
  action: text("action").notNull(), // "role_assigned", "user_invited", "team_created", etc
  resourceType: text("resource_type"), // "organization", "team", "user", "role"
  resourceId: varchar("resource_id"),
  changes: jsonb("changes"), // { before: {...}, after: {...} }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Modificações ao users table**:
```typescript
// Adicionar ao users table:
primaryOrganizationId: varchar("primary_organization_id").references(() => organizations.id),
isSuperAdmin: boolean("is_super_admin").default(false), // Global super admin (raramente usado)
isDeactivated: boolean("is_deactivated").default(false),
deactivatedAt: timestamp("deactivated_at"),
deactivatedBy: varchar("deactivated_by").references(() => users.id),
lastLogin: timestamp("last_login"),
```

---

### Novos Arquivos de Tipos TypeScript

#### 2. `server/types/hierarchy.ts` (CRIAR)

```typescript
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  permissions: string[];
  isDefault: boolean;
  isCustom: boolean;
  createdAt: Date;
}

export interface UserOrgRole {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  assignedBy?: string;
  assignedAt: Date;
}

export interface UserTeamRole {
  id: string;
  userId: string;
  teamId: string;
  roleId: string;
  assignedBy?: string;
  assignedAt: Date;
}

export interface Invitation {
  id: string;
  organizationId: string;
  teamId?: string;
  email: string;
  roleId: string;
  inviteToken: string;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: "pending" | "accepted" | "rejected" | "expired";
  acceptedAt?: Date;
  acceptedBy?: string;
  customMessage?: string;
}

export interface AuditLogEntry {
  id: string;
  organizationId?: string;
  actorId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  changes?: Record<string, any>;
  createdAt: Date;
}

export interface HierarchyContext {
  organizationId: string;
  teamId?: string;
  userId: string;
  orgRole?: Role;
  teamRole?: Role;
  permissions: Set<string>;
}
```

---

### Novos Arquivos de Middleware

#### 3. `server/middleware/hierarchy.ts` (CRIAR)

```typescript
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";
import type { HierarchyContext } from "../types/hierarchy";

/**
 * Carrega contexto de hierarquia do usuário
 * Verifica organização e permissões
 */
export async function hierarchyMiddleware(
  req: AuthRequest & { hierarchy?: HierarchyContext },
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Autenticação necessária" });
  }

  try {
    // 1. Buscar organização primária do usuário
    const userOrgRole = await db.query.userOrgRoles.findFirst({
      where: (fields, { eq }) =>
        eq(fields.userId, req.user!.id) &&
        eq(fields.organizationId, req.query.orgId as string ?? req.body.organizationId)
    });

    if (!userOrgRole) {
      return res.status(403).json({ error: "Sem acesso a esta organização" });
    }

    // 2. Buscar role do usuário na organização
    const role = await db.query.roles.findFirst({
      where: (fields, { eq }) => eq(fields.id, userOrgRole.roleId)
    });

    if (!role) {
      return res.status(403).json({ error: "Papéis de usuário não encontrados" });
    }

    // 3. Se teamId foi fornecido, verificar acesso ao time
    const teamId = req.query.teamId as string | undefined;
    let teamRole = undefined;

    if (teamId) {
      const userTeamRole = await db.query.userTeamRoles.findFirst({
        where: (fields, { eq, and }) =>
          and(eq(fields.userId, req.user!.id), eq(fields.teamId, teamId))
      });

      if (userTeamRole) {
        teamRole = await db.query.roles.findFirst({
          where: (fields, { eq }) => eq(fields.id, userTeamRole.roleId)
        });
      }
    }

    // 4. Construir permissões combinadas
    const permissions = new Set<string>();
    role.permissions.forEach(p => permissions.add(p));
    if (teamRole) {
      teamRole.permissions.forEach(p => permissions.add(p));
    }

    // 5. Anexar ao request
    req.hierarchy = {
      organizationId: userOrgRole.organizationId,
      teamId,
      userId: req.user.id,
      orgRole: role,
      teamRole,
      permissions
    };

    next();
  } catch (error) {
    console.error("Erro ao carregar hierarquia:", error);
    return res.status(500).json({ error: "Erro ao carregar dados de hierarquia" });
  }
}

/**
 * Verifica se usuário tem permissão em contexto de organização
 */
export function requireHierarchyPermission(permission: string) {
  return (
    req: AuthRequest & { hierarchy?: HierarchyContext },
    res: Response,
    next: NextFunction
  ) => {
    if (!req.hierarchy) {
      return res.status(401).json({ error: "Contexto de hierarquia não carregado" });
    }

    if (req.hierarchy.permissions.has("*") || req.hierarchy.permissions.has(permission)) {
      return next();
    }

    return res.status(403).json({ error: `Permissão necessária: ${permission}` });
  };
}

/**
 * Requer um role específico na organização
 */
export function requireOrgRole(roleNames: string | string[]) {
  return (
    req: AuthRequest & { hierarchy?: HierarchyContext },
    res: Response,
    next: NextFunction
  ) => {
    if (!req.hierarchy) {
      return res.status(401).json({ error: "Contexto de hierarquia não carregado" });
    }

    const allowed = Array.isArray(roleNames) ? roleNames : [roleNames];
    if (allowed.includes(req.hierarchy.orgRole?.name ?? "")) {
      return next();
    }

    return res.status(403).json({ error: "Papel organizacional insuficiente" });
  };
}
```

---

### Novos Arquivos de Rotas

#### 4. `server/routes/organization.routes.ts` (CRIAR)

```typescript
import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { hierarchyMiddleware, requireHierarchyPermission, requireOrgRole } from "../middleware/hierarchy";

const router = Router();

/**
 * POST /api/organizations
 * Criar nova organização (usuário se torna owner)
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, slug, description, avatarUrl } = req.body;

    // Validar
    if (!name || !slug) {
      return res.status(400).json({ error: "Nome e slug são obrigatórios" });
    }

    // Criar organização
    const [org] = await db.insert(organizations).values({
      name,
      slug,
      description,
      avatarUrl,
      ownerId: req.user!.id,
    }).returning();

    // Criar role padrão "Organization Owner"
    const [ownerRole] = await db.insert(roles).values({
      organizationId: org.id,
      name: "Organization Owner",
      description: "Acesso total à organização",
      permissions: ["*"],
      isDefault: true,
      isCustom: false,
    }).returning();

    // Atribuir usuário como owner
    await db.insert(userOrgRoles).values({
      userId: req.user!.id,
      organizationId: org.id,
      roleId: ownerRole.id,
      assignedBy: req.user!.id,
    });

    // Registrar auditoria
    await auditLog(org.id, req.user!.id, "organization_created", "organization", org.id, {});

    res.status(201).json(org);
  } catch (error) {
    console.error("Erro ao criar organização:", error);
    res.status(500).json({ error: "Erro ao criar organização" });
  }
});

/**
 * GET /api/organizations
 * Listar organizações do usuário
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userOrgs = await db.query.userOrgRoles.findMany({
      where: (fields, { eq }) => eq(fields.userId, req.user!.id),
      with: {
        organization: true,
        role: true,
      },
    });

    res.json(userOrgs.map(uo => ({
      ...uo.organization,
      role: uo.role,
    })));
  } catch (error) {
    console.error("Erro ao listar organizações:", error);
    res.status(500).json({ error: "Erro ao listar organizações" });
  }
});

/**
 * GET /api/organizations/:id
 * Detalhes da organização
 */
router.get("/:id", authMiddleware, hierarchyMiddleware, async (req, res) => {
  try {
    const org = await db.query.organizations.findFirst({
      where: (fields, { eq }) => eq(fields.id, req.params.id),
      with: {
        teams: true,
        roles: true,
        members: {
          with: {
            user: true,
            role: true,
          },
        },
      },
    });

    if (!org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    res.json(org);
  } catch (error) {
    console.error("Erro ao buscar organização:", error);
    res.status(500).json({ error: "Erro ao buscar organização" });
  }
});

/**
 * GET /api/organizations/:id/members
 * Listar membros da organização
 */
router.get(
  "/:id/members",
  authMiddleware,
  hierarchyMiddleware,
  requireHierarchyPermission("user:read"),
  async (req, res) => {
    try {
      const members = await db.query.userOrgRoles.findMany({
        where: (fields, { eq }) => eq(fields.organizationId, req.params.id),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              createdAt: true,
            },
          },
          role: true,
        },
      });

      res.json(members);
    } catch (error) {
      console.error("Erro ao listar membros:", error);
      res.status(500).json({ error: "Erro ao listar membros" });
    }
  }
);

/**
 * POST /api/organizations/:id/invitations
 * Convidar usuário para organização
 */
router.post(
  "/:id/invitations",
  authMiddleware,
  hierarchyMiddleware,
  requireHierarchyPermission("user:manage"),
  async (req, res) => {
    try {
      const { email, roleId, teamId, customMessage } = req.body;

      // Validações
      if (!email || !roleId) {
        return res.status(400).json({ error: "Email e roleId são obrigatórios" });
      }

      // Verificar se já é membro
      const existingMember = await db.query.userOrgRoles.findFirst({
        where: (fields, { eq, and }) =>
          and(
            eq(fields.organizationId, req.params.id),
            // Verificar por email na tabela users
          ),
      });

      // Gerar token JWT com expiração 7 dias
      const inviteToken = jwt.sign(
        {
          email,
          organizationId: req.params.id,
          roleId,
          teamId,
        },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      // Criar convite
      const [invitation] = await db
        .insert(invitations)
        .values({
          organizationId: req.params.id,
          teamId,
          email,
          roleId,
          inviteToken,
          invitedBy: req.user!.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          customMessage,
        })
        .returning();

      // Enviar email
      await sendInvitationEmail(email, inviteToken, req.params.id, customMessage);

      // Registrar auditoria
      await auditLog(
        req.params.id,
        req.user!.id,
        "user_invited",
        "invitation",
        invitation.id,
        { email, roleId }
      );

      res.status(201).json(invitation);
    } catch (error) {
      console.error("Erro ao convidar usuário:", error);
      res.status(500).json({ error: "Erro ao convidar usuário" });
    }
  }
);

export default router;
```

#### 5. `server/routes/team.routes.ts` (CRIAR)

```typescript
// Implementar CRUD para Teams
// Endpoints:
// - POST /api/teams - Criar time
// - GET /api/teams?orgId=xxx - Listar times
// - GET /api/teams/:id - Detalhes
// - PATCH /api/teams/:id - Editar
// - DELETE /api/teams/:id - Deletar
// - GET /api/teams/:id/members - Listar membros
// - POST /api/teams/:id/members/:userId - Adicionar membro
```

#### 6. `server/routes/invitation.routes.ts` (CRIAR)

```typescript
// Implementar endpoints de convites
// Endpoints:
// - POST /api/invitations/:token/accept - Aceitar convite
// - POST /api/invitations/:token/reject - Rejeitar convite
// - GET /api/invitations/pending - Meus convites pendentes
// - GET /api/organizations/:id/invitations - Convites enviados
// - POST /api/organizations/:id/invitations/:inviteId/resend - Reenviar
```

---

## 🗂️ Arquivos a Modificar

### 1. `shared/schema.ts`
- **O QUE**: Adicionar 8 novas tabelas Drizzle ORM (veja seção anterior)
- **LINHA**: Adicionar ao final do arquivo (após linha 100)
- **TEMPO**: 2 horas (design + testes)
- **RISCO**: Baixo - apenas adições

### 2. `server/middleware/auth.ts`
- **O QUE**: Buscar `primaryOrganizationId` do usuário e anexar ao `req.user`
- **ONDE**: Na função `authMiddleware`
- **TEMPO**: 30 minutos
- **RISCO**: Baixo - adiciona dados apenas

### 3. `server/middleware/rbac.ts`
- **O QUE**: Manter compatibilidade com sistema antigo para migração
- **ONDE**: Adicionar check: se `req.hierarchy` existe, usar novo sistema; senão usar antigo
- **TEMPO**: 45 minutos
- **RISCO**: Médio - afeta autenticação existente, mas com fallback

### 4. `server/routes.ts`
- **O QUE**: Importar e registrar novas rotas (organization, team, invitation)
- **ONDE**: Próximo às outras importações de rotas
- **EXEMPLO**:
  ```typescript
  import organizationRoutes from "./routes/organization.routes";
  import teamRoutes from "./routes/team.routes";
  import invitationRoutes from "./routes/invitation.routes";

  app.use("/api/organizations", organizationRoutes);
  app.use("/api/teams", teamRoutes);
  app.use("/api/invitations", invitationRoutes);
  ```
- **TEMPO**: 15 minutos
- **RISCO**: Baixo

### 5. `server/config/db.ts`
- **O QUE**: Verificar se relações Drizzle estão configuradas
- **ONDE**: Adicionar `with` para relações (organizations, teams, roles)
- **TEMPO**: 1 hora (testes)
- **RISCO**: Médio - afeta queries

---

## 🎨 Novos Arquivos de Frontend (React)

### 1. `client/src/pages/organization/OrganizationList.tsx`

```typescript
// Listagem de organizações do usuário
// - Mostrar cards com nome, descrição, número de membros
// - Botão "Nova Organização"
// - Botão "Configurar" para cada org
```

### 2. `client/src/pages/organization/CreateOrganization.tsx`

```typescript
// Formulário para criar nova organização
// - Nome (required)
// - Slug (auto-gerado, editável)
// - Descrição (optional)
// - Avatar upload (optional)
```

### 3. `client/src/pages/organization/OrganizationSettings.tsx`

```typescript
// Página de configurações da organização
// - Abas: Geral, Membros, Times, Papéis, Auditoria
// - Editar nome/descrição
// - Deletar organização (apenas Owner)
```

### 4. `client/src/pages/organization/MembersList.tsx`

```typescript
// Listar membros da organização
// - Tabela com: Nome, Email, Papel (Org), Papel (Time), Ações
// - Botões: Editar Papel, Remover, Deletar
```

### 5. `client/src/pages/organization/InviteUser.tsx`

```typescript
// Formulário para convidar usuário
// - Email (required)
// - Organização (pré-selecionada)
// - Time (optional, dependente de org)
// - Papel (dropdown, baseado em org)
// - Mensagem customizada (optional)
// - Preview do email
```

### 6. `client/src/pages/invitation/AcceptInvitation.tsx`

```typescript
// Página para aceitar convite via link
// - Exibir: Organização, Time (se houver), Papel
// - Se usuário não está logged: formulário de registro
// - Se está logged: botão "Aceitar" ou "Rejeitar"
```

### 7. `client/src/pages/invitation/PendingInvitations.tsx`

```typescript
// Badge/página com convites pendentes
// - Mostrar lista de convites do usuário
// - Botões: Aceitar ou Rejeitar
```

### 8. `client/src/components/HierarchyContext.tsx`

```typescript
// React Context para gerenciar contexto de hierarquia
// - selectedOrganization
// - selectedTeam
// - userPermissions
// - Methods: switchOrganization(), switchTeam()
```

---

## 📅 Cronograma de Implementação

### **Fase 1: Foundation (8-10 horas)**

#### Semana 1 - Dia 1-2
1. **Criar migrations SQL** (2h)
   - Executar SQL de criação das 8 tabelas no Supabase/PostgreSQL
   - Verificar FKs e índices

2. **Atualizar Drizzle ORM schema** (2h)
   - Adicionar tabelas ao `shared/schema.ts`
   - Gerar tipos TypeScript via Drizzle
   - Testar relações

3. **Criar types/hierarchy.ts** (1h)
   - Definir todas as interfaces de tipos

4. **Validação** (1h)
   - Testar que DB está sincronizado com schema
   - Verificar migrations

**Subtotal Fase 1**: 6-8h

---

### **Fase 2: Access Control (12-15 horas)**

#### Semana 1-2 - Dia 3-6
1. **Criar hierarchy middleware** (3h)
   - Implementar `hierarchyMiddleware`
   - Implementar `requireHierarchyPermission`
   - Implementar `requireOrgRole`

2. **Criar organization.routes.ts** (4h)
   - POST /organizations (criar)
   - GET /organizations (listar minhas)
   - GET /organizations/:id (detalhes)
   - GET /organizations/:id/members (listar membros)
   - PATCH /organizations/:id (editar - Owner apenas)
   - DELETE /organizations/:id (deletar - Owner apenas)

3. **Criar team.routes.ts** (3h)
   - POST /teams (criar)
   - GET /teams?orgId=xxx (listar)
   - GET /teams/:id (detalhes)
   - PATCH /teams/:id (editar)
   - DELETE /teams/:id (deletar)

4. **Modificar auth middleware** (1h)
   - Buscar primaryOrganizationId
   - Anexar ao req.user

5. **Atualizar RBAC para compatibilidade** (1h)
   - Fallback para sistema antigo se sem req.hierarchy

6. **Testes** (2h)
   - Testar criação de org
   - Testar acesso a membros
   - Testar permissões

**Subtotal Fase 2**: 12-15h

---

### **Fase 3: Sistema de Convites (14-20 horas)**

#### Semana 2-3 - Dia 7-13
1. **Criar invitation.routes.ts** (4h)
   - POST /organizations/:id/invitations (enviar)
   - POST /api/invitations/:token/accept (aceitar)
   - POST /api/invitations/:token/reject (rejeitar)
   - GET /api/invitations/pending (meus convites)
   - GET /api/organizations/:id/invitations (enviados)
   - POST /api/organizations/:id/invitations/:id/resend (reenviar)

2. **Implementar envio de email** (3h)
   - Template HTML
   - Função sendInvitationEmail()
   - Suporte a SMTP/SendGrid

3. **Implementar JWT verification para invite token** (2h)
   - Decode token no /accept
   - Verificar expiração
   - Tratar re-uso de token

4. **Criar logic para auto-aceitar ao registrar** (3h)
   - Modificar /api/auth/register para aceitar `inviteToken`
   - Auto-criar user_org_roles ao registrar via invite
   - Auto-criar user_team_roles se teamId foi fornecido

5. **Frontend - AcceptInvitation.tsx** (3h)
   - Extrair token da URL
   - Verificar se usuário está logged
   - Exibir detalhes do convite
   - Formulário de aceitar/rejeitar

6. **Testes** (2h)
   - Enviar convite por email
   - Aceitar como novo usuário
   - Aceitar como usuário existente
   - Rejeitar convite

**Subtotal Fase 3**: 14-20h

---

### **Fase 4: UI de Gerenciamento (15-20 horas)**

#### Semana 3-4 - Dia 14-20
1. **OrganizationList.tsx** (2h)
   - Listar orgs do usuário
   - Cards com info básica
   - Botões de ação

2. **CreateOrganization.tsx** (2h)
   - Formulário de criação
   - Validação
   - Upload de avatar

3. **OrganizationSettings.tsx** (4h)
   - Tabs: Geral, Membros, Times, Papéis, Auditoria
   - Editar org
   - Deletar org (confirmation modal)

4. **MembersList.tsx** (3h)
   - Tabela de membros
   - Editar papel (dropdown)
   - Remover membro (soft delete)
   - Deletar convite pendente

5. **InviteUser.tsx** (3h)
   - Formulário de convite
   - Seletor de org/team/papel
   - Preview de email
   - Status de envio

6. **HierarchyContext.tsx** (2h)
   - Context provider
   - Hooks customizados
   - Integração em App.tsx

7. **Testes de UX** (2h)
   - Testar fluxo completo
   - Verificar responsividade
   - Testar mensagens de erro

**Subtotal Fase 4**: 15-20h

---

### **Fase 5: Testing & Polish (5-10 horas)**

#### Semana 4 - Dia 21-25
1. **Testes de integração** (3h)
   - Fluxo completo: criar org → convidar → aceitar → acessar
   - Verificar permissões em múltiplos contextos
   - Testar audit logs

2. **Testes de segurança** (2h)
   - Tentar acessar org de outro usuário (deve falhar)
   - Tentar usar invite token de outro usuário
   - Verificar expiração de token

3. **Performance** (1h)
   - Verificar queries N+1
   - Adicionar índices se necessário
   - Testar com múltiplas orgs/times

4. **Documentação** (2h)
   - API docs
   - Guia de uso
   - Troubleshooting

5. **Deploy** (2h)
   - Migrar dados antigos (compatibilidade)
   - Deploy em staging
   - Testes em staging

**Subtotal Fase 5**: 5-10h

---

## 📊 Resumo de Tempo

| Fase | Horas | Semana |
|------|-------|--------|
| 1. Foundation | 8-10h | 1 |
| 2. Access Control | 12-15h | 1-2 |
| 3. Sistema de Convites | 14-20h | 2-3 |
| 4. UI de Gerenciamento | 15-20h | 3-4 |
| 5. Testing & Deploy | 5-10h | 4 |
| **TOTAL** | **54-75h** | **~4-5 semanas** |

---

## 🔄 Compatibilidade com Sistema Antigo

### Mapeamento de Papéis Antigos → Novos

Ao migrar dados existentes:

```typescript
const migrationMap = {
  "admin": {
    roleName: "Organization Owner",
    permissions: ["*"]
  },
  "operator": {
    roleName: "Organization Operator",
    permissions: [
      "ias:read",
      "ias:update",
      "tickets:read",
      "tickets:create",
      "tickets:update",
      "actions:read",
      "actions:create",
      "conversations:read",
      "conversations:update",
      "messages:read",
      "messages:create",
      "metrics:read",
    ]
  },
  "viewer": {
    roleName: "Organization Viewer",
    permissions: [
      "ias:read",
      "tickets:read",
      "actions:read",
      "conversations:read",
      "messages:read",
      "metrics:read",
    ]
  }
};
```

### Script de Migração

```typescript
// scripts/migrate-hierarchy.ts
async function migrateToHierarchy() {
  // 1. Para cada usuário existente:
  //    a. Criar Organization pessoal
  //    b. Mapear role antigo → novo papel
  //    c. Criar user_org_roles entry
  //
  // 2. Manter compatibilidade:
  //    a. Se usuário não tem primaryOrganizationId, usar org pessoal
  //    b. Se não há user_org_roles, usar role antigo do users.role
  //
  // 3. Validar:
  //    a. Todos os usuários têm org
  //    b. Todas as IAs têm proprietário
}
```

---

## ⚠️ Considerações de Segurança

### Checklist de Segurança

- [ ] Todos os endpoints exigem `authMiddleware`
- [ ] Todos os endpoints sensíveis exigem `hierarchyMiddleware` + `requireHierarchyPermission`
- [ ] Invitations têm JWT token com expiração (7 dias)
- [ ] Tokens não podem ser reutilizados após aceitar
- [ ] Permissões são verificadas em TODA operação
- [ ] Auditoria registra quem fez o quê e quando
- [ ] Usuários deactivados não conseguem acessar
- [ ] IPs suspeitos têm rate limit em invites
- [ ] Emails de convite não vazam informações sensíveis
- [ ] Validação de email antes de enviar convite

### Rate Limiting Proposto

```typescript
// Por usuário, por minuto
POST /organizations/:id/invitations   - 10/min
POST /api/users/:id/org-role          - 30/min
GET  /api/organizations/:id/audit     - 5/min
```

---

## 🧪 Estratégia de Testes

### Testes Unitários

- [ ] Testar geração de invite token
- [ ] Testar verificação de permissões
- [ ] Testar migração de roles antigos
- [ ] Testar expiração de convites

### Testes de Integração

- [ ] Criar org → Add member → Acessar resource
- [ ] Enviar convite → Registrar novo usuário → Aceitar convite
- [ ] User A tenta acessar org de User B (deve falhar)
- [ ] Team Owner pode deletar time
- [ ] Operator não consegue remover usuário

### Testes de Segurança

- [ ] IDOR - Tentar acessar org_id de outro usuário
- [ ] CSRF - Convite sem token válido
- [ ] Token hijacking - Reutilizar token antigo
- [ ] Privilege escalation - Operator tenta virar Owner

---

## 📝 Próximos Passos

1. **Sua aprovação dos designs** - Revisar HIERARQUIA_CONTA_PLANEJAMENTO.md e SISTEMA_CONVITES_DETALHADO.md
2. **Começar Fase 1** - Criar migrations SQL e schema Drizzle
3. **Iterações** - Completar cada fase com testes antes de passar para próxima
4. **Deploy em staging** - Validar antes de produção
5. **Feedback loop** - Ajustar conforme necessário

---

## 📌 Notas Importantes

- ⚠️ **Não commit em git ainda** - Você vai testar primeiro
- ⚠️ **Backup do banco antes de migração** - Segurança!
- ⚠️ **Testes em staging primeiro** - Não fazer direto em prod
- ✅ **Compatibilidade com usuários existentes** - Sistema continua funcionando durante migração

**Status**: Pronto para começar assim que você confirmar! 🚀
