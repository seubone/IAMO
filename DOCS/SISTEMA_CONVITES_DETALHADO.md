# 📧 Sistema de Convites Detalhado - Monitor IA

## 1. Visão Geral do Sistema de Convites

Sistema de convites por email com pré-configuração de papéis, similar ao Supabase mas adaptado para hierarquia de conta com organizações e times.

---

## 2. Fluxo Completo de Convite

```
┌─────────────────────────────────────────────────────────────────┐
│                      FLUXO DE CONVITE                           │
└─────────────────────────────────────────────────────────────────┘

PASSO 1: Admin abre página de convites
         ↓
PASSO 2: Admin preenche formulário
         - Email
         - Organização (pré-selecionada ou selector)
         - Time (opcional, dependente de org)
         - Papel (baseado em org/team)
         - Mensagem custom (opcional)
         ↓
PASSO 3: Sistema valida dados
         - Email válido?
         - Já membro da org?
         - Já tem convite pendente?
         ↓
PASSO 4: Sistema cria registro de Invitation
         - Gera invite token (JWT com expiração 7 dias)
         - Salva no banco de dados
         - Envia email com link
         ↓
PASSO 5: Email chega no destinatário
         - Link: https://app.seu-dominio.com/invite/:token
         - Botão "Aceitar Convite"
         - Mostra: Org, Team, Papel, Quem convidou
         ↓
PASSO 6a: Usuário NÃO tem conta ainda
         - Clica no link
         - Redireciona para página de registro
         - Form pré-preenchido com email
         - Após cadastro: auto-aceita convite
         - Cria user_org_roles e user_team_roles
         ↓
PASSO 6b: Usuário JÁ tem conta
         - Clica no link
         - Sistema valida token
         - Mostra página de aceitar/rejeitar
         - Se aceita: cria user_org_roles e user_team_roles
         - Se rejeita: marca como rejected
         ↓
PASSO 7: Usuário aparece na lista de membros
         - Pode ser removido
         - Papel pode ser alterado
         - Acesso imediato aos recursos
```

---

## 3. Modelo de Dados - Tabela Invitations

```typescript
interface Invitation {
  id: string;                    // UUID
  organization_id: string;       // Org destino
  team_id?: string;              // Time destino (opcional)
  email: string;                 // Email do convidado
  role_id: string;               // UUID da role pré-definida
  invite_token: string;          // JWT token único
  invited_by: string;            // UUID do admin que convidou
  invited_at: Date;              // Quando foi criado
  expires_at: Date;              // Expira em 7 dias
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  accepted_at?: Date;            // Quando aceitou
  accepted_by?: string;          // ID do usuário que aceitou
  rejected_at?: Date;            // Quando rejeitou
  rejection_reason?: string;     // Por que rejeitou
  custom_message?: string;       // Mensagem do admin
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    resent_count?: number;
    resent_at?: Date[];
  };
}

// Tabela SQL
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  invite_token VARCHAR(1024) NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMP,
  accepted_by UUID REFERENCES users(id),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  custom_message TEXT,
  metadata JSONB,

  UNIQUE(organization_id, team_id, email, status) WHERE status = 'pending',
  INDEX idx_token (invite_token),
  INDEX idx_email_status (email, status),
  INDEX idx_org_status (organization_id, status)
);
```

---

## 4. Backend - Endpoints de Convite

### 4.1 Criar/Enviar Convite

```typescript
// POST /api/organizations/:orgId/invitations
// Requer: role >= Admin na organização

interface CreateInvitationRequest {
  email: string;                 // Email do convidado
  role_id: string;               // UUID da role
  team_id?: string;              // Opcional: convidar para time específico
  custom_message?: string;       // Mensagem customizada
  resend_if_exists?: boolean;    // Se true, resend se já foi convidado
}

interface CreateInvitationResponse {
  success: boolean;
  invitation: {
    id: string;
    email: string;
    organization_id: string;
    team_id?: string;
    role_id: string;
    status: 'pending';
    invited_at: Date;
    expires_at: Date;
  };
  message: string;
}

// Validações:
// - Email válido (RFC 5322)?
// - Usuário com esse email já é membro da org?
// - Já existe convite pendente para esse email?
// - role_id existe e pertence a essa org?
// - team_id (se fornecido) pertence a essa org?
// - Requester tem permissão para convidar?
```

### 4.2 Aceitar Convite (com token)

```typescript
// POST /api/invitations/:token/accept
// Não requer autenticação (pode estar no email)

interface AcceptInvitationRequest {
  // Se usuário não tem conta:
  name?: string;
  password?: string;

  // Se usuário já tem conta:
  // Só o token é suficiente (valida via JWT)
}

interface AcceptInvitationResponse {
  success: boolean;
  message: string;
  auth?: {
    access_token: string;
    user: UserProfile;
    organization: Organization;
    team?: Team;
  };
}

// Fluxo:
// 1. Validar token (não expirado, correto)
// 2. Se invitation.status != 'pending' → erro
// 3. Se não autenticado e email não encontrado:
//    - Criar novo usuário
//    - Set password
//    - Enviar email de confirmação do Supabase
// 4. Se autenticado ou criou usuário:
//    - Criar user_org_roles
//    - Criar user_team_roles (se team_id)
//    - Marcar invitation como 'accepted'
//    - Retornar auth token
```

### 4.3 Rejeitar Convite

```typescript
// POST /api/invitations/:token/reject

interface RejectInvitationRequest {
  reason?: string;
}

interface RejectInvitationResponse {
  success: boolean;
  message: string;
}

// Fluxo:
// 1. Validar token
// 2. Marcar como 'rejected'
// 3. Opcionalmente notificar quem convidou
```

### 4.4 Listar Convites Pendentes (para um usuário)

```typescript
// GET /api/invitations/pending
// Requer autenticação

interface InvitationResponse {
  id: string;
  email: string;
  organization: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  team?: {
    id: string;
    name: string;
  };
  role: {
    id: string;
    name: string;
    description?: string;
  };
  invited_by: {
    id: string;
    name: string;
    email: string;
  };
  custom_message?: string;
  expires_at: Date;
  invited_at: Date;
}

// Retorna todos os convites pendentes para o email do usuário autenticado
```

### 4.5 Listar Convites Enviados (por org/admin)

```typescript
// GET /api/organizations/:orgId/invitations
// Requer: role >= Admin

interface ListInvitationsResponse {
  invitations: InvitationResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
  filters?: {
    status: 'pending' | 'accepted' | 'all';
    team_id?: string;
    sort_by: 'invited_at' | 'expires_at';
  };
}

// Permite filtrar por:
// - status (pending, accepted, rejected)
// - team_id
// - search por email
// - sort por invited_at ou expires_at
```

### 4.6 Resend Convite

```typescript
// POST /api/organizations/:orgId/invitations/:id/resend
// Requer: role >= Admin

interface ResendInvitationResponse {
  success: boolean;
  message: string;
  resent_at: Date;
}

// Envia o email novamente
// Atualiza metadata.resent_at
```

### 4.7 Deletar Convite Pendente

```typescript
// DELETE /api/organizations/:orgId/invitations/:id
// Requer: role >= Admin

// Só permite deletar se status = 'pending'
```

---

## 5. Email de Convite - Template

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
    .details { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Você foi convidado!</h1>
    </div>

    <div class="content">
      <p>Olá,</p>

      <p><strong>{{ invited_by.name }}</strong> convidou você para fazer parte da organização <strong>{{ organization.name }}</strong> no Monitor IA!</p>

      {{#if custom_message}}
      <div class="details">
        <strong>Mensagem:</strong>
        <p>{{ custom_message }}</p>
      </div>
      {{/if}}

      <div class="details">
        <strong>📋 Detalhes do Convite:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li><strong>Organização:</strong> {{ organization.name }}</li>
          {{#if team}}
          <li><strong>Time:</strong> {{ team.name }}</li>
          {{/if}}
          <li><strong>Papel:</strong> {{ role.name }} ({{ role.description }})</li>
          <li><strong>Válido até:</strong> {{ expires_at | format_date }}</li>
        </ul>
      </div>

      <p style="text-align: center;">
        {{#if user_has_account}}
        <a href="{{ accept_link }}" class="button">Aceitar Convite</a>
        {{else}}
        <a href="{{ register_link }}" class="button">Criar Conta e Aceitar</a>
        {{/if}}
      </p>

      <p style="color: #666; font-size: 14px;">
        Ou copie e cole este link no seu navegador:<br>
        <code>{{ full_link }}</code>
      </p>

      {{#if user_has_account}}
      <p style="color: #666; font-size: 14px;">
        <a href="{{ reject_link }}">Rejeitar este convite</a>
      </p>
      {{/if}}
    </div>

    <div class="footer">
      <p>Este convite expira em 7 dias.</p>
      <p>&copy; Monitor IA - Monitoramento de Inteligências Artificiais</p>
    </div>
  </div>
</body>
</html>
```

---

## 6. Frontend - Página de Convites

### 6.1 Estrutura de Componentes

```
pages/
└─ organization/
   └─ [orgId]/
      ├─ members.tsx          (lista membros + tab de convites)
      ├─ invitations/
      │  ├─ send.tsx          (formulário de enviar convite)
      │  ├─ list.tsx          (lista convites pendentes)
      │  └─ accept.tsx        (aceitar convite via token)
      └─ components/
         ├─ InviteForm.tsx
         ├─ InvitationList.tsx
         ├─ AcceptInvitation.tsx
         └─ PendingInvites.tsx  (para usuário, mostra convites recebidos)
```

### 6.2 Página de Enviar Convite

```typescript
// pages/organization/[orgId]/invitations/send.tsx

export interface InviteFormData {
  email: string;
  role_id: string;
  team_id?: string;
  custom_message?: string;
}

export default function SendInvitePage() {
  return (
    <Layout title="Convidar Usuário">
      <Container>
        <PageHeader
          title="Convidar Usuário"
          description="Convide pessoas para se juntarem à sua organização"
          breadcrumbs={[
            { label: 'Organização', href: `/org/${orgId}` },
            { label: 'Membros', href: `/org/${orgId}/members` },
            { label: 'Convidar', current: true }
          ]}
        />

        <Card className="max-w-2xl">
          <Tabs defaultValue="single">
            {/* Single Invite */}
            <TabsContent value="single">
              <InviteForm
                onSuccess={(invitation) => {
                  toast.success(`Convite enviado para ${invitation.email}`);
                  router.push(`/org/${orgId}/invitations`);
                }}
              />
            </TabsContent>

            {/* Bulk Invite */}
            <TabsContent value="bulk">
              <BulkInviteForm
                onSuccess={(count) => {
                  toast.success(`${count} convites enviados`);
                  router.push(`/org/${orgId}/invitations`);
                }}
              />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Preview do email */}
        <Card className="mt-6 bg-slate-50">
          <CardHeader>
            <CardTitle className="text-sm">Preview do Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 border rounded text-sm">
              {/* Mostrar preview do email que será enviado */}
            </div>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
}
```

### 6.3 Componente de Formulário de Convite

```typescript
// components/InviteForm.tsx

interface InviteFormProps {
  organizationId: string;
  onSuccess: (invitation: Invitation) => void;
  onError?: (error: Error) => void;
}

export function InviteForm({ organizationId, onSuccess }: InviteFormProps) {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      role_id: '',
      custom_message: ''
    }
  });

  // Carregar teams e roles da org
  useEffect(() => {
    fetchTeams(organizationId);
    fetchRoles(organizationId);
  }, [organizationId]);

  const onSubmit = async (data: InviteFormData) => {
    setLoading(true);
    try {
      const response = await api.post(`/api/organizations/${organizationId}/invitations`, {
        email: data.email,
        role_id: data.role_id,
        team_id: data.team_id || null,
        custom_message: data.custom_message
      });

      onSuccess(response.data.invitation);
      form.reset();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Email Input */}
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email do Convidado</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="usuario@exemplo.com"
                {...field}
              />
            </FormControl>
            <FormDescription>
              O convite será enviado para este email
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Role Selector */}
      <FormField
        control={form.control}
        name="role_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Papel</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um papel" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div>
                      <div className="font-medium">{role.name}</div>
                      <div className="text-xs text-slate-500">{role.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              O papel define as permissões do usuário
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Team Selector (Opcional) */}
      <FormField
        control={form.control}
        name="team_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Time (Opcional)</FormLabel>
            <Select value={field.value || ''} onValueChange={(val) => {
              field.onChange(val || null);
              setSelectedTeam(val || null);
            }}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Sem time específico" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="">Sem time específico</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Se deixar vazio, o usuário terá acesso a toda organização
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom Message */}
      <FormField
        control={form.control}
        name="custom_message"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mensagem Custom (Opcional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Adicione uma mensagem pessoal ao convite..."
                rows={4}
                {...field}
              />
            </FormControl>
            <FormDescription>
              Esta mensagem aparecerá no email de convite
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? 'Enviando...' : 'Enviar Convite'}
      </Button>
    </form>
  );
}
```

### 6.4 Lista de Convites Pendentes

```typescript
// components/InvitationList.tsx

export function InvitationList({ organizationId }: { organizationId: string }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'pending' as const,
    team_id: undefined
  });

  useEffect(() => {
    fetchInvitations();
  }, [filters]);

  const fetchInvitations = async () => {
    try {
      const response = await api.get(
        `/api/organizations/${organizationId}/invitations`,
        { params: filters }
      );
      setInvitations(response.data.invitations);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    try {
      await api.post(
        `/api/organizations/${organizationId}/invitations/${invitationId}/resend`
      );
      toast.success('Convite reenviado');
      await fetchInvitations();
    } catch (error) {
      toast.error('Erro ao reenviar convite');
    }
  };

  const handleCancel = async (invitationId: string) => {
    if (!confirm('Cancelar este convite?')) return;

    try {
      await api.delete(
        `/api/organizations/${organizationId}/invitations/${invitationId}`
      );
      toast.success('Convite cancelado');
      await fetchInvitations();
    } catch (error) {
      toast.error('Erro ao cancelar convite');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convites Pendentes</CardTitle>
        <CardDescription>
          {invitations.length} convites aguardando resposta
        </CardDescription>
      </CardHeader>

      <CardContent>
        <DataTable
          columns={[
            {
              accessorKey: 'email',
              header: 'Email',
              cell: (info) => (
                <div>
                  <div className="font-medium">{info.getValue()}</div>
                  <div className="text-xs text-slate-500">
                    Convidado em {format(new Date(info.row.original.invited_at), 'dd/MM/yyyy')}
                  </div>
                </div>
              )
            },
            {
              accessorKey: 'role.name',
              header: 'Papel'
            },
            {
              accessorKey: 'team.name',
              header: 'Time',
              cell: (info) => info.getValue() || '-'
            },
            {
              accessorKey: 'expires_at',
              header: 'Expira em',
              cell: (info) => {
                const date = new Date(info.getValue());
                const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return <span className={days < 2 ? 'text-orange-600' : ''}>{days} dias</span>;
              }
            },
            {
              id: 'actions',
              header: 'Ações',
              cell: (info) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleResend(info.row.original.id)}>
                      Reenviar Convite
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleCancel(info.row.original.id)}
                      className="text-red-600"
                    >
                      Cancelar Convite
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }
          ]}
          data={invitations}
        />
      </CardContent>
    </Card>
  );
}
```

### 6.5 Página de Aceitar Convite

```typescript
// pages/invite/[token].tsx

export default function AcceptInvitePage({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAccount, setHasAccount] = useState(false);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Validar token e carregar detalhes do convite
    validateToken();

    // Se autenticado, check se é o email do convite
    if (user) {
      setHasAccount(true);
    }
  }, [token, user]);

  const validateToken = async () => {
    try {
      const response = await api.get(`/api/invitations/${token}/validate`);
      setInvitation(response.data.invitation);

      if (user?.email !== response.data.invitation.email) {
        setError('Este convite é para outro email');
      }
    } catch (err) {
      setError('Convite inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/api/invitations/${token}/accept`, {
        // Se não autenticado, incluir dados de registro
        ...(!hasAccount && {
          name: invitation?.name || '',
          password: ''
        })
      });

      if (!hasAccount) {
        // Fazer login automático
        await loginWithToken(response.data.auth.access_token);
      }

      toast.success('Convite aceito com sucesso!');
      router.push(`/org/${invitation?.organization_id}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Rejeitar este convite?')) return;

    try {
      await api.post(`/api/invitations/${token}/reject`, {
        reason: 'Rejeitado pelo usuário'
      });

      toast.success('Convite rejeitado');
      router.push('/');
    } catch (error) {
      toast.error('Erro ao rejeitar convite');
    }
  };

  if (loading || authLoading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!invitation) return <NotFound />;

  return (
    <Layout>
      <Container className="max-w-2xl py-12">
        {/* Card de Convite */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Você foi convidado!
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Organização */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Building2 className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <div className="text-sm text-slate-600">Organização</div>
                <div className="text-lg font-semibold">{invitation.organization.name}</div>
              </div>
            </div>

            {/* Time (se aplicável) */}
            {invitation.team && (
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-600">Time</div>
                  <div className="text-lg font-semibold">{invitation.team.name}</div>
                </div>
              </div>
            )}

            {/* Papel */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Shield className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <div className="text-sm text-slate-600">Papel</div>
                <div className="text-lg font-semibold">{invitation.role.name}</div>
                <div className="text-sm text-slate-600">{invitation.role.description}</div>
              </div>
            </div>

            {/* Quem convidou */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <User className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <div className="text-sm text-slate-600">Convidado por</div>
                <div className="text-lg font-semibold">{invitation.invited_by.name}</div>
                <div className="text-sm text-slate-600">{invitation.invited_by.email}</div>
              </div>
            </div>

            {/* Mensagem custom */}
            {invitation.custom_message && (
              <div className="bg-white p-4 rounded border-l-4 border-blue-500">
                <div className="text-sm text-slate-600 mb-2">Mensagem</div>
                <p className="text-slate-700">{invitation.custom_message}</p>
              </div>
            )}

            {/* Se não tem conta, mostrar form de registro */}
            {!hasAccount && (
              <div className="bg-white p-4 rounded border border-slate-200">
                <h4 className="font-semibold mb-4">Criar Conta</h4>
                <RegistrationForm
                  initialEmail={invitation.email}
                  onSuccess={handleAccept}
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="gap-3 justify-end border-t bg-slate-100 rounded-b">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={loading}
            >
              Rejeitar
            </Button>
            {hasAccount ? (
              <Button
                onClick={handleAccept}
                disabled={loading}
              >
                {loading ? 'Processando...' : 'Aceitar Convite'}
              </Button>
            ) : (
              <Button disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar Conta e Aceitar'}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Info de expiração */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded">
          <AlertCircle className="w-4 h-4 text-amber-600 inline mr-2" />
          <span className="text-sm text-amber-800">
            Este convite expira em {format(new Date(invitation.expires_at), 'dd/MM/yyyy')}
          </span>
        </div>
      </Container>
    </Layout>
  );
}
```

### 6.6 Badge de Convites Pendentes (no Dashboard)

```typescript
// components/PendingInvitations.tsx

export function PendingInvitations() {
  const [count, setCount] = useState(0);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchPendingInvitations();
  }, []);

  const fetchPendingInvitations = async () => {
    try {
      const response = await api.get('/api/invitations/pending');
      setInvitations(response.data.invitations);
      setCount(response.data.invitations.length);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  if (count === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Mail className="w-4 h-4 mr-2" />
          Convites
          <Badge className="absolute -top-2 -right-2">{count}</Badge>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-semibold">Você tem {count} convite(s) pendente(s)</h4>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {invitations.map((inv) => (
              <div key={inv.id} className="p-3 bg-slate-50 rounded border">
                <div className="font-medium text-sm">{inv.organization.name}</div>
                <div className="text-xs text-slate-600">
                  Papel: {inv.role.name}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      window.location.href = `/invite/${inv.id}`;
                      setOpen(false);
                    }}
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Usar no Header/Navigation:
// <PendingInvitations />
```

---

## 7. Validações Importantes

### Backend Validations

```typescript
// Função de validação centralizada
async function validateInvite(data: CreateInvitationRequest, requester: User) {
  // Email válido?
  if (!isValidEmail(data.email)) {
    throw new BadRequest('Email inválido');
  }

  // Usuário já é membro?
  const existingMember = await getUserOrgRole(data.email, data.organization_id);
  if (existingMember) {
    throw new BadRequest('Usuário já é membro desta organização');
  }

  // Convite pendente?
  const pendingInvite = await getInvitation({
    email: data.email,
    organization_id: data.organization_id,
    status: 'pending'
  });
  if (pendingInvite) {
    throw new BadRequest('Já existe convite pendente para este email');
  }

  // Role válida?
  const role = await getRole(data.role_id, data.organization_id);
  if (!role) {
    throw new BadRequest('Papel inválido');
  }

  // Team válido (se fornecido)?
  if (data.team_id) {
    const team = await getTeam(data.team_id, data.organization_id);
    if (!team) {
      throw new BadRequest('Time inválido');
    }
  }

  // Requester tem permissão?
  const requesterRole = await getUserOrgRole(requester.id, data.organization_id);
  if (!hasPermission(requesterRole, 'user:manage')) {
    throw new Forbidden('Você não tem permissão para convidar usuários');
  }

  return true;
}
```

---

## 8. Fluxo de Aceitar Convite (Detalhado)

### Caso A: Usuário NÃO tem conta

```
1. Clica no link invite/:token
2. Sistema valida token
3. Redireciona para /invite/:token com form de registro
4. Usuário preenche:
   - Nome (obrigatório)
   - Senha (obrigatório)
   - Email (pré-preenchido, readonly)
5. Submete form
6. Backend:
   a. Cria usuário no Supabase com email
   b. Envia email de confirmação do Supabase
   c. Cria entrada na tabela users (local)
   d. Cria user_org_roles com o paper do convite
   e. Cria user_team_roles (se team_id)
   f. Marca invitation como 'accepted'
   g. Retorna JWT token
7. Frontend faz login automático
8. Redireciona para /org/:id dashboard
```

### Caso B: Usuário JÁ tem conta

```
1. Clica no link invite/:token
2. Sistema detecta autenticação existente
3. Valida se email do token == email do usuário
4. Mostra página de confirmação
5. Usuário clica "Aceitar"
6. Backend:
   a. Cria user_org_roles com o papel do convite
   b. Cria user_team_roles (se team_id)
   c. Marca invitation como 'accepted'
7. Redireciona para /org/:id dashboard
```

---

## 9. Segurança do Token de Convite

### Geração do Token

```typescript
function generateInviteToken(invitation: Invitation): string {
  const payload = {
    invitation_id: invitation.id,
    email: invitation.email,
    organization_id: invitation.organization_id,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 dias
  };

  return jwt.sign(payload, process.env.INVITE_SECRET, {
    algorithm: 'HS256',
    issuer: 'monitorai',
    subject: 'invitation'
  });
}

// Token é único por convite
// URL: https://app.seu-dominio.com/invite/eyJhbGc...
```

### Validação do Token

```typescript
async function validateInviteToken(token: string): Promise<InvitationPayload> {
  try {
    const decoded = jwt.verify(token, process.env.INVITE_SECRET, {
      algorithms: ['HS256'],
      issuer: 'monitorai',
      subject: 'invitation'
    });

    // Verificar se o convite ainda existe e está pending
    const invitation = await getInvitation({
      id: decoded.invitation_id,
      token: token,
      status: 'pending'
    });

    if (!invitation) {
      throw new Unauthorized('Convite inválido ou expirado');
    }

    if (invitation.expires_at < new Date()) {
      throw new Unauthorized('Convite expirou');
    }

    return decoded;
  } catch (error) {
    throw new Unauthorized('Token inválido');
  }
}
```

---

## 10. Emails Necessários

### Email 1: Convite Inicial (com HTML template acima)
- Enviado quando admin cria convite
- Link para aceitar/registrar
- Expira em 7 dias

### Email 2: Aviso de Expiração (24h antes)
```
Seu convite para [Organization] vence em 24 horas.
Clique aqui para aceitar: [link]
```

### Email 3: Convite Aceito (para admin)
```
[Username] aceitou seu convite para [Organization]
Ver perfil: [link]
```

### Email 4: Convite Rejeitado (para admin)
```
[Email] rejeitou seu convite para [Organization]
```

---

## 11. Sequence Diagram

```
Usuário              Email              App Backend       Supabase
  |                   |                   |                |
  |--- Clica link ------>                 |                |
  |                   |                   |                |
  |                   |--- GET /invite/:token              |
  |                   |                   |                |
  |                   |<--- Validar token |                |
  |                   |                   |                |
  |<-- Se sem conta: Registro form        |                |
  |                   |                   |                |
  |-- Preenche dados  |                   |                |
  |-- POST /accept    |                   |                |
  |                   |                   |                |
  |                   |--- Criar usuário -|--- POST /auth/signup
  |                   |                   |                |
  |                   |                   |<-- JWT + user info
  |                   |                   |
  |                   |--- CREATE user_org_roles
  |                   |
  |                   |--- UPDATE invitation (status=accepted)
  |                   |
  |<-- Login + redir -|
  |
```

---

## 12. Considerações de UX

### Fluxos de Erro

1. **Email já cadastrado**
   - Mostrar: "Você já é membro desta organização"
   - Botão: "Ir para organização"

2. **Convite expirado**
   - Mostrar: "Este convite expirou em XX/XX/XXXX"
   - Botão: "Pedir novo convite a [admin]"

3. **Convite rejeitado anteriormente**
   - Mostrar: "Você rejeitou este convite"
   - Botão: "Contatar administrador"

4. **Email diferente**
   - Se logado com email X mas convite é para Y:
   - Mostrar: "Este convite é para usuario@exemplo.com"
   - Opções: "Logout e aceitar com outro email" ou "Contatar admin"

### Feedback Visual

- Badge no header com número de convites pendentes
- Toast notification ao enviar convite
- Email de confirmação de aceita
- Página de "Convites Recebidos" no dashboard

---

## 13. Próximos Passos para Implementação

### Fase 1: Setup (1-2h)
- [ ] Criar tabela de invitations
- [ ] Criar migration SQL
- [ ] Definir tipos TypeScript

### Fase 2: Backend (4-6h)
- [ ] Endpoints CRUD de invitations
- [ ] Geração de tokens JWT
- [ ] Envio de emails
- [ ] Validações
- [ ] Aceitação de convites

### Fase 3: Frontend (6-8h)
- [ ] Página de enviar convite
- [ ] Componente de formulário
- [ ] Lista de convites
- [ ] Página de aceitar convite
- [ ] Badge de convites pendentes

### Fase 4: Testing (2-3h)
- [ ] Testes de fluxo completo
- [ ] Testes de segurança de token
- [ ] Testes de validação
- [ ] Email template

### Fase 5: Polish (1-2h)
- [ ] Melhorar UX de erros
- [ ] Adicionar loading states
- [ ] Documentação de API

**Total Estimado: 14-20 horas**

---

## 14. Decisão Final ✅

Quer implementar:
- [ ] Sistema de convites completo (como descrito)
- [ ] Versão simplificada (apenas envio de convite)
- [ ] Apenas API (sem UI)
- [ ] Integrando com a hierarquia de conta já planejada

**Status: READY TO CODE** 🚀
