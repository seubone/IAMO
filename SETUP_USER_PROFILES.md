# Setup - User Profiles Simonia

## Overview

O sistema de perfil de usuário foi implementado para capturar e armazenar informações adicionais dos usuários (nome, foto de perfil) no Supabase.

## Arquivos Criados

### 1. Banco de Dados
- **`server/migrations/create-user-profiles-simonia-table.sql`**
  - SQL para criar a tabela `user_profiles_simonia`
  - Inclui índices, triggers, e RLS policies

### 2. Frontend - Hook
- **`client/src/hooks/use-user-profile.ts`**
  - Hook customizado para gerenciar perfil do usuário
  - Funções: `fetchProfile()`, `updateProfile()`, `uploadAvatar()`
  - Estados: `profile`, `isLoading`, `error`

### 3. Frontend - Componente
- **`client/src/components/UserOnboarding.tsx`**
  - Modal de onboarding em 2 passos (fullscreen com animação slide-up)
  - Passo 1: Nome e sobrenome (obrigatório)
  - Passo 2: Foto de perfil (opcional)
  - Integração com `useUserProfile` hook

## Setup - Passo a Passo

### Passo 1: Criar a tabela no Supabase

1. Acesse: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/sql
2. Crie uma nova query
3. Copie o conteúdo de `server/migrations/create-user-profiles-simonia-table.sql`
4. Execute a query

A tabela terá a seguinte estrutura:

```sql
user_profiles_simonia (
  id: UUID (Primary Key),
  user_id: UUID (Foreign Key → auth.users),
  name: TEXT (nullable),
  avatar_url: TEXT (nullable),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

### Passo 2: Ativar armazenamento de avatares (se não estiver ativo)

1. Acesse o Supabase Dashboard
2. Vá para Storage → Create new bucket
3. Nome: `user-avatars`
4. Desmarque "Private" para tornar público
5. Clique "Create bucket"

> **Nota**: Para detalhes completos sobre configuração do bucket, estrutura de armazenamento, RLS policies e troubleshooting, veja [SUPABASE_STORAGE_SETUP.md](./SUPABASE_STORAGE_SETUP.md)

### Passo 3: Configurar RLS Policies (já incluídas na migration)

A migration inclui automaticamente as políticas:
- ✅ `Users can view their own profile`
- ✅ `Users can update their own profile`
- ✅ `Users can insert their own profile`
- ✅ `Users can delete their own profile`

### Passo 4: Build e Deploy

```bash
npm run build
```

O frontend está pronto. Quando um usuário logado não tiver um perfil, o modal de onboarding aparecerá automaticamente.

## Fluxo de Uso

1. **Usuário faz login**
2. **Sistema verifica se existe perfil** (se não existir, abre onboarding)
3. **Modal fullscreen abre com Passo 1 (Nome)**
   - Animação slide-up da base para o topo
   - Usuário insere nome e sobrenome (obrigatório)
   - Pressiona Enter ou clica "Próximo"
4. **Modal muda para Passo 2 (Foto)**
   - Usuário pode:
     - Selecionar uma foto (opcional) - preview em tempo real
     - Clicar "Concluir" (salva o perfil com foto)
     - Clicar "Voltar" (retorna ao Passo 1)
     - Clicar "Pular esta etapa" (salva sem foto)
5. **Perfil é salvo no Supabase**
   - Nome e sobrenome armazenado em `user_profiles_simonia.name`
   - Avatar URL armazenado em `user_profiles_simonia.avatar_url`
   - Avatar file armazenado em Storage: `avatars/{user_id}/{timestamp}-{filename}`
6. **Modal fecha automaticamente**
7. **Nome e avatar aparecem no sidebar dinamicamente**

## API - Hook `useUserProfile()`

```typescript
const {
  profile,        // UserProfile | null
  isLoading,      // boolean
  error,          // string | null
  fetchProfile,   // async () => void
  updateProfile,  // async (updates) => void
  uploadAvatar    // async (file: File) => string (URL)
} = useUserProfile();
```

### Exemplo de uso:

```typescript
// Atualizar nome e foto
const avatarUrl = await uploadAvatar(file);
await updateProfile({
  name: "João Silva",
  avatar_url: avatarUrl
});

// Ou apenas nome
await updateProfile({
  name: "João Silva"
});
```

## Interface - UserProfile

```typescript
interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
```

## Verificação

Para verificar se tudo está funcionando:

1. Acesse o aplicativo
2. Faça login com um usuário novo
3. Modal de onboarding deve aparecer
4. Insira nome e foto (opcional)
5. Clique "Concluir"
6. Verifique no Supabase se o registro foi criado
7. Verifique se o nome aparece no sidebar

## Troubleshooting

### Modal não aparece
- Verifique se `<UserOnboarding />` está em `App.tsx`
- Verifique se o usuário está autenticado
- Verifique o console do navegador para erros

### Erro ao salvar
- Verifique se a tabela `user_profiles_simonia` existe
- Verifique se as RLS policies estão configuradas
- Verifique as permissões no Supabase

### Avatar não faz upload
- Verifique se o bucket `user-avatars` existe
- Verifique se o bucket é público
- Verifique permissões de storage no Supabase

## Próximos Passos

1. ✅ Criar tabela `user_profiles_simonia`
2. ✅ Configurar RLS policies
3. ✅ Implementar hook `useUserProfile`
4. ✅ Criar componente `UserOnboarding`
5. ⏭️ Implementar edição de perfil na página `/profile`
6. ⏭️ Sincronizar sidebar com nome real
7. ⏭️ Adicionar avatar display em componentes
