# Arquitetura - Sistema de Perfis de Usuário

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐        ┌──────────────────────┐      │
│  │  useAuth Hook        │        │ useUserProfile Hook  │      │
│  │  ────────────────    │        │ ────────────────────  │      │
│  │  - user (UUID)       │────────│ - profile (data)     │      │
│  │  - isAuthenticated   │        │ - uploadAvatar()     │      │
│  │  - setProfile()      │        │ - updateProfile()    │      │
│  └──────────────────────┘        │ - fetchProfile()     │      │
│            ▲                      └──────────────────────┘      │
│            │                              ▲                     │
│            │                              │                     │
│  ┌─────────┴──────────────────────────────┴──────┐             │
│  │     UserOnboarding Component                  │             │
│  │  ─────────────────────────────────────────    │             │
│  │  ┌──────────────────────────────────────┐    │             │
│  │  │ Passo 1: Nome e Sobrenome           │    │             │
│  │  │ (fullscreen overlay, animation)      │    │             │
│  │  └──────────────────────────────────────┘    │             │
│  │  ┌──────────────────────────────────────┐    │             │
│  │  │ Passo 2: Upload Avatar               │    │             │
│  │  │ (preview, opcional)                  │    │             │
│  │  └──────────────────────────────────────┘    │             │
│  └─────────────────────────────────────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Supabase Client SDK
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────┐                              │
│  │  Authentication (auth.users) │                              │
│  │  ────────────────────────    │                              │
│  │  - id (UUID) ◄───────────────┼──┐                          │
│  │  - email                     │  │                          │
│  │  - user_metadata             │  │                          │
│  └──────────────────────────────┘  │                          │
│                                     │ FK: user_id             │
│  ┌──────────────────────────────┐  │                          │
│  │ Database: user_profiles_simonia │ │                          │
│  │ ────────────────────────────  │  │                          │
│  │ - id (UUID)                  │  │                          │
│  │ - user_id (UUID) ◄───────────┼──┘                          │
│  │ - name (TEXT)  ◄─────┐       │                              │
│  │ - avatar_url (TEXT)  │       │                              │
│  │ - created_at         │       │                              │
│  │ - updated_at         │       │                              │
│  │ - RLS Policies       │       │                              │
│  └──────────────────────────────┘   │                          │
│                                      │ avatar URL ref           │
│  ┌──────────────────────────────┐   │                          │
│  │ Storage: user-avatars        │   │                          │
│  │ ──────────────────────────   │   │                          │
│  │ /avatars/                    │   │                          │
│  │   └─ {user_id}/              │   │                          │
│  │      └─ {timestamp}-{name}   ◄───┘                          │
│  │                              │                              │
│  │ RLS Policies:                │                              │
│  │ - Users upload own avatars   │                              │
│  │ - Users update own avatars   │                              │
│  │ - Users delete own avatars   │                              │
│  │ - Anyone can view (public)   │                              │
│  └──────────────────────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Fluxo de Dados

### 1. Login do Usuário

```
┌─────────────────────────────────────────────────────────────┐
│                   Usuário faz Login                         │
└────────────────┬──────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ useAuth() recupera dados do auth.users                      │
│ - Salva user.id na Zustand store                           │
│ - Define isAuthenticated = true                             │
└────────────────┬──────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ useUserProfile() dispara useEffect                          │
│ - Detecta user?.id mudou                                    │
│ - Chama fetchProfile()                                      │
└────────────────┬──────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ fetchProfile() consulta user_profiles_simonia               │
│ .select("*")                                                │
│ .eq("user_id", user.id)                                     │
│ .single()                                                   │
└────────────────┬──────────────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
    ✅ Encontrou       ❌ Não encontrou
    (PGRST116)         (Novo usuário)
         │                │
         ▼                ▼
    setProfile(data)  setProfile(null)
         │                │
         └───────┬────────┘
                 │
                 ▼
    UserOnboarding detects:
    !profile?.name && !!user
         │
         └─► Abre modal fullscreen
             com Passo 1 (Nome)
```

### 2. Onboarding - Passo 1

```
┌──────────────────────────────────────────────────┐
│  Usuário insere Nome e Sobrenome                 │
│  Pressiona Enter ou clica "Próximo"              │
└─────────────────┬────────────────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Validação:      │
         │ nome.trim() ?   │
         └────┬────────┬───┘
          Não │        │ Sim
             ▼        ▼
        Erro      Próximo
        msg    (Passo 2)
```

### 3. Onboarding - Passo 2

```
┌──────────────────────────────────────────────┐
│  Usuário escolhe ação:                       │
│  - Seleciona foto (opcional)                 │
│  - Clica "Concluir" ou "Pular"              │
└─────────────┬────────────────────────────────┘
              │
              ▼
      ┌───────────────┐
      │ handleComplete│
      └───────┬───────┘
              │
              ▼
    ┌─────────────────────────┐
    │ uploadAvatar() se arquivo │
    │ - Gera path:            │
    │   avatars/{user.id}/... │
    │ - Upload para Storage    │
    │ - Retorna publicUrl      │
    └───────┬─────────────────┘
            │
            ▼
    ┌─────────────────────────┐
    │ updateProfile()         │
    │ - name: "..."           │
    │ - avatar_url: "..."     │
    │                         │
    │ INSERT ou UPDATE em:    │
    │ user_profiles_simonia   │
    └───────┬─────────────────┘
            │
            ▼
    ┌─────────────────────────┐
    │ fetchProfile() (refresh)│
    │ - Carrega novo perfil   │
    │ - updateProfile dispara │
    │   re-render             │
    └───────┬─────────────────┘
            │
            ▼
    Modal fecha (setIsOpen = false)
```

## Relacionamento de Dados

### Antes do Onboarding

```
┌─────────────────────────────────┐
│    auth.users                   │
├─────────────────────────────────┤
│ id: 550e8400-e29b-41d4-...     │
│ email: user@example.com         │
│ user_metadata:                  │
│   { full_name: null }           │
└─────────────────────────────────┘
         │
         │ user_id (FK)
         │ NÃO EXISTE PERFIL
         ▼
┌─────────────────────────────────┐
│ user_profiles_simonia           │
│ (REGISTRO NÃO ENCONTRADO)       │
└─────────────────────────────────┘
```

### Depois do Onboarding

```
┌──────────────────────────────────────┐
│    auth.users                        │
├──────────────────────────────────────┤
│ id: 550e8400-e29b-41d4-...          │
│ email: user@example.com              │
│ user_metadata:                       │
│   { full_name: "João Silva" }        │
└────────────────┬─────────────────────┘
                 │
                 │ user_id FK
                 ▼
┌──────────────────────────────────────────┐
│ user_profiles_simonia                    │
├──────────────────────────────────────────┤
│ id: a1b2c3d4-e5f6-47g8-...             │
│ user_id: 550e8400-e29b-41d4-...        │
│ name: "João Silva"                       │
│ avatar_url: "https://...public/avatars/  │
│             550e8400-e29b-41d4-.../     │
│             1700000000000-photo.jpg"     │
│ created_at: 2025-11-19T10:30:00Z        │
│ updated_at: 2025-11-19T10:30:00Z        │
└──────────────────────────────────────────┘
         │
         │ ref: avatar_url
         ▼
┌──────────────────────────────────────────┐
│ Storage: user-avatars                    │
├──────────────────────────────────────────┤
│ /avatars/                                │
│   └─ 550e8400-e29b-41d4-.../            │
│      └─ 1700000000000-photo.jpg          │
│         (arquivo físico, ~2MB)           │
└──────────────────────────────────────────┘
```

## Fluxo de Segurança (RLS)

### Verificação de Permissão - Leitura

```
Usuário A tenta: SELECT * FROM user_profiles_simonia
                          WHERE user_id = "Usuário B"

┌─────────────────────────────────────┐
│ RLS Policy Verifica:                │
│ "Users can view their own profile"  │
│                                     │
│ WHERE auth.uid() = user_id          │
└────────┬─────────────────────┬──────┘
         │                     │
    Usuário A              Usuário B
    (auth.uid())          (row.user_id)
         │                     │
         ├─────┬───────────────┤
         │     │               │
    Diferente? │          Igual?
         ▼     ▼               ▼
         ❌    ✅
      NEGADO  PERMITIDO
```

### Verificação de Permissão - Upload

```
Usuário faz UPLOAD para:
avatars/{user_id}/photo.jpg

┌────────────────────────────────────────┐
│ RLS Policy Verifica:                   │
│ "Users can upload their own avatars"   │
│                                        │
│ WHERE auth.uid() = (foldername)[1]    │
└─────────┬────────────────────────┬────┘
          │                        │
    auth.uid()              extraído do path
    (Usuário logado)        {user_id} da pasta
          │                        │
          ├───────┬────────────────┤
              Igual?
              ▼
              ✅ PERMITIDO UPLOAD
```

## Índices e Performance

### user_profiles_simonia

```sql
-- Índice 1: Lookup rápido por user_id
CREATE INDEX idx_user_profiles_simonia_user_id
  ON user_profiles_simonia(user_id);

Benefício: fetchProfile() rápido
Query: SELECT * WHERE user_id = ?
Time: O(log n) em vez de O(n)
```

### Tabela de Índices

| Índice | Coluna | Tipo | Benefício |
|--------|--------|------|-----------|
| `PRIMARY` | `id` | UUID | Lookup por ID (padrão) |
| `idx_user_profiles_simonia_user_id` | `user_id` | UUID | Busca por usuário (RLS, FK) |
| `idx_user_profiles_simonia_created_at` | `created_at DESC` | TIMESTAMP | Listar por data (ordenação) |

## Storage Buckets

```
user-avatars/
│
├── Configuração:
│   ├── Type: Public (qualquer um vê URLs públicas)
│   ├── RLS: Habilitada (controla upload/delete)
│   └── CORS: Automático (Supabase configura)
│
└── Estrutura:
    avatars/
    ├── 550e8400-e29b-41d4-.../
    │   ├── 1700000000000-photo.jpg
    │   ├── 1700000001000-photo2.jpg
    │   └── 1700000002000-selfie.png
    │
    ├── a1b2c3d4-e5f6-47g8-.../
    │   ├── 1700000003000-avatar.jpg
    │   └── ...
    │
    └── ...
```

## URLs Públicas

### Formato

```
https://{PROJECT_ID}.supabase.co/storage/v1/object/public/{bucket}/{path}
```

### Exemplo Real

```
https://svfucusuhnwmwyojmxgr.supabase.co/storage/v1/object/public/user-avatars/avatars/550e8400-e29b-41d4-a716-446655440000/1700000000000-photo.jpg
```

### Permanência

- URL permanente enquanto arquivo existir
- Se deletar arquivo: URL retorna 404
- Se atualizar com mesmo path (upsert): URL continua válida (novo conteúdo)

## Triggers e Automação

### updated_at Automático

```sql
CREATE TRIGGER trigger_update_user_profiles_simonia_updated_at
  BEFORE UPDATE ON user_profiles_simonia
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_simonia_updated_at();

Comportamento:
- Toda vez que um campo é atualizado
- updated_at é automaticamente setada para CURRENT_TIMESTAMP
- Usuário NÃO precisa passar updated_at
```

## Fluxo Completo de Vínculo

```
1. AUTENTICAÇÃO
   ┌─────────────────────────────────────────┐
   │ Usuário faz login                       │
   │ ✓ Recebe user.id (UUID)                 │
   │ ✓ Guardado em useAuth() store            │
   └─────────────────────────────────────────┘

2. DETECÇÃO
   ┌─────────────────────────────────────────┐
   │ useUserProfile() detecta user.id         │
   │ ✓ Busca perfil em BD                     │
   │ ✓ Se não existe: abre UserOnboarding    │
   └─────────────────────────────────────────┘

3. NOME
   ┌─────────────────────────────────────────┐
   │ Usuário insere: "João Silva"            │
   │ ✓ Guardado em state local                │
   │ ✓ Validado (não vazio)                   │
   │ ✓ Passa para próximo passo               │
   └─────────────────────────────────────────┘

4. AVATAR
   ┌─────────────────────────────────────────┐
   │ Usuário seleciona: photo.jpg            │
   │ ✓ Preview em tempo real                  │
   │ ✓ Guardado em state local                │
   └─────────────────────────────────────────┘

5. UPLOAD
   ┌─────────────────────────────────────────┐
   │ uploadAvatar(file) é chamado            │
   │ ✓ Gera path: avatars/{user.id}/ts-file  │
   │ ✓ Upload para Storage                    │
   │ ✓ RLS permite (user.id no path)         │
   │ ✓ Retorna publicUrl                      │
   └─────────────────────────────────────────┘

6. SALVAR PERFIL
   ┌─────────────────────────────────────────┐
   │ updateProfile({name, avatar_url})       │
   │ ✓ INSERT em user_profiles_simonia       │
   │ ✓ user_id setado (FK → auth.users)      │
   │ ✓ RLS permite (auth.uid() = user_id)    │
   │ ✓ created_at auto (DEFAULT)              │
   │ ✓ updated_at auto (trigger)              │
   └─────────────────────────────────────────┘

7. VÍNCULO COMPLETO
   ┌─────────────────────────────────────────┐
   │ ✓ auth.users.id = user_profiles.user_id │
   │ ✓ user_profiles.name = "João Silva"     │
   │ ✓ user_profiles.avatar_url = URL pública│
   │ ✓ URL aponta para Storage/{user_id}/... │
   │ ✓ Só user pode modificar (RLS)           │
   │ ✓ Só user pode deletar arquivo (RLS)    │
   └─────────────────────────────────────────┘

8. EXIBIÇÃO
   ┌─────────────────────────────────────────┐
   │ Sidebar exibe:                          │
   │ ✓ Avatar: <img src={avatar_url} />      │
   │ ✓ Nome: {profile.name}                   │
   │ ✓ Derivado de user_profiles_simonia     │
   └─────────────────────────────────────────┘
```

## Resumo de Vínculo

| Componente | Armazena | Vinculado A | Relação |
|-----------|---------|-----------|---------|
| **auth.users** | ID, email | - | Base de autenticação |
| **user_profiles_simonia** | name, avatar_url | auth.users.id | FK: user_id |
| **storage (avatars)** | Arquivo físico | user_profiles_simonia | Path: avatars/{user_id}/ |
| **useAuth hook** | user object | auth.users | Estado em memória |
| **useUserProfile hook** | profile object | user_profiles_simonia | Estado em memória |
| **Sidebar component** | display name/avatar | useUserProfile hook | Props/Render |

## Checklist de Consistência

Para garantir que tudo está vinculado corretamente:

- [ ] Usuário novo faz login
- [ ] `useUserProfile()` detecta perfil vazio
- [ ] `UserOnboarding` modal aparece
- [ ] Usuário insere nome "João Silva"
- [ ] Usuário seleciona foto
- [ ] `uploadAvatar()` retorna URL
- [ ] `updateProfile()` salva em BD
- [ ] Verificar em Supabase:
  - [ ] `user_profiles_simonia` tem novo registro
  - [ ] `user_id` matches `auth.users.id`
  - [ ] `name` = "João Silva"
  - [ ] `avatar_url` começa com `https://svfucusuhnwmwyojmxgr.supabase.co`
- [ ] Verificar em Storage:
  - [ ] Bucket `user-avatars` tem pasta `avatars/{user_id}/`
  - [ ] Arquivo `timestamp-filename.jpg` está lá
- [ ] Reload página (F5)
- [ ] `useUserProfile()` busca perfil
- [ ] Sidebar exibe nome e avatar corretos
- [ ] Avatar URL carrega imagem (não 404)
