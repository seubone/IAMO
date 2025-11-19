# Estrutura de Código - Sistema de Perfis de Usuário

## Árvore de Arquivos

```
Monitoramento-de-IA/
│
├── 📁 client/
│   └── 📁 src/
│       │
│       ├── 📁 components/
│       │   └── UserOnboarding.tsx .................... [NOVO]
│       │       Componente fullscreen de onboarding
│       │       - Passo 1: Nome e sobrenome
│       │       - Passo 2: Upload de avatar
│       │       - Animação slide-up
│       │       - Integração com useUserProfile()
│       │
│       ├── 📁 hooks/
│       │   └── use-user-profile.ts .................. [NOVO]
│       │       Hook para gerenciar perfis
│       │       - fetchProfile()
│       │       - updateProfile()
│       │       - uploadAvatar()
│       │
│       ├── App.tsx .................................. [MODIFICADO]
│       │   Adicionado:
│       │   - import { UserOnboarding }
│       │   - <UserOnboarding /> em ProtectedRoutes
│       │
│       └── 📁 lib/
│           └── supabase.ts
│               Já existente, usado por useUserProfile
│
├── 📁 server/
│   └── 📁 migrations/
│       └── create-user-profiles-simonia-table.sql ... [NOVO]
│           Migration SQL para criar:
│           - Tabela user_profiles_simonia
│           - Índices
│           - Triggers
│           - RLS Policies
│
├── 📄 SETUP_USER_PROFILES.md ........................ [NOVO]
│   Guia de setup geral do sistema
│   - Overview
│   - Passo a passo
│   - API documentation
│   - Troubleshooting
│
├── 📄 SUPABASE_STORAGE_SETUP.md ..................... [NOVO]
│   Documentação completa do storage
│   - Configuração do bucket user-avatars
│   - Estrutura de organização
│   - RLS policies para storage
│   - Upload flow
│   - URLs públicas
│   - Troubleshooting
│
├── 📄 ARCHITECTURE_USER_PROFILES.md ................ [NOVO]
│   Arquitetura técnica do sistema
│   - Diagramas de componentes
│   - Fluxos de dados
│   - Relacionamentos de banco de dados
│   - Segurança RLS
│   - Índices e performance
│   - Fluxo completo end-to-end
│
├── 📄 SETUP_CHECKLIST.md ........................... [NOVO]
│   Checklist passo a passo para setup
│   - TODO items para cada etapa
│   - Resultados esperados
│   - Troubleshooting
│   - Quick reference URLs
│
└── 📄 USER_PROFILES_STRUCTURE.md .................. [ESTE ARQUIVO]
    Esta documentação
```

## Arquivos de Código - Detalhes

### 1. `client/src/components/UserOnboarding.tsx`

**Propósito**: Componente de onboarding fullscreen

**Tamanho**: ~240 linhas

**Importações**:
```typescript
import { useState, useEffect } from "react";
import { Button, Input, Loader2, Upload, X } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
```

**Estado**:
```typescript
- isOpen: boolean                    // Modal aberto?
- isAnimating: boolean               // Animação rodando?
- step: "name" | "avatar"            // Qual passo?
- name: string                       // Nome inserido
- avatarFile: File | null            // Arquivo selecionado
- avatarPreview: string              // Preview URL
- isLoading: boolean                 // Salvando?
- error: string                      // Mensagem de erro
```

**Funções Principais**:
```typescript
handleNameSubmit()    // Validar e passar para passo 2
handleAvatarSelect()  // Processar seleção de arquivo
handleComplete()      // Salvar perfil e fechar
```

**Saída HTML**:
```html
<div className="fixed inset-0 z-50 bg-background">
  {step === "name" ? (
    <form>
      <input placeholder="Digite seu nome e sobrenome" />
      <button onClick={handleNameSubmit}>Próximo</button>
    </form>
  ) : (
    <form>
      <input type="file" accept="image/*" />
      <button onClick={handleComplete}>Concluir</button>
      <button onClick={() => setStep("name")}>Voltar</button>
      <button onClick={handleComplete}>Pular esta etapa</button>
    </form>
  )}
</div>
```

---

### 2. `client/src/hooks/use-user-profile.ts`

**Propósito**: Hook para gerenciar perfil do usuário

**Tamanho**: ~135 linhas

**Importações**:
```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./use-auth";
```

**Estado Retornado**:
```typescript
interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

return {
  profile: UserProfile | null,
  isLoading: boolean,
  error: string | null,
  fetchProfile: () => Promise<void>,
  updateProfile: (updates: {name?, avatar_url?}) => Promise<void>,
  uploadAvatar: (file: File) => Promise<string>  // Retorna URL
}
```

**Funções**:

#### `fetchProfile()`
```typescript
// Busca perfil em user_profiles_simonia
SELECT * FROM user_profiles_simonia
WHERE user_id = ?
SINGLE;

// Se erro PGRST116 (não encontrado): setProfile(null)
// Se outro erro: setError(message)
```

#### `updateProfile(updates)`
```typescript
// Se perfil existe:
//   UPDATE user_profiles_simonia SET ... WHERE user_id = ?
// Se novo:
//   INSERT INTO user_profiles_simonia (user_id, ...) VALUES (?, ...)

// Depois: fetchProfile() para atualizar state
```

#### `uploadAvatar(file)`
```typescript
const filename = `avatars/${user.id}/${Date.now()}-${file.name}`;

// Upload para storage
storage.from("user-avatars").upload(filename, file, { upsert: true });

// Obter URL pública
const { data } = storage.from("user-avatars").getPublicUrl(filename);
return data.publicUrl;
```

---

### 3. `client/src/App.tsx`

**Modificações**:

```typescript
// ADICIONADO:
import { UserOnboarding } from "@/components/UserOnboarding";

// DENTRO DE ProtectedRoutes(), DEPOIS de </SidebarProvider>:
<UserOnboarding />
```

**Razão**: Garantir que UserOnboarding renderiza dentro do contexto autenticado

---

### 4. `server/migrations/create-user-profiles-simonia-table.sql`

**Propósito**: Migration SQL para Supabase

**Componentes**:

#### Tabela
```sql
CREATE TABLE public.user_profiles_simonia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### Índices
```sql
-- Busca rápida por usuário
CREATE INDEX idx_user_profiles_simonia_user_id
  ON public.user_profiles_simonia(user_id);

-- Listagem por data
CREATE INDEX idx_user_profiles_simonia_created_at
  ON public.user_profiles_simonia(created_at DESC);
```

#### Trigger
```sql
-- Auto-update de updated_at
CREATE TRIGGER trigger_update_user_profiles_simonia_updated_at
  BEFORE UPDATE ON public.user_profiles_simonia
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_simonia_updated_at();
```

#### RLS Policies
```sql
-- 4 policies:
1. SELECT: auth.uid() = user_id
2. UPDATE: auth.uid() = user_id
3. INSERT: auth.uid() = user_id
4. DELETE: auth.uid() = user_id
```

---

## Fluxo de Execução

### 1. App Carrega

```
App.tsx
  ↓
ProtectedRoutes()
  ↓
useAuth() inicia
  ↓
UserOnboarding renderiza
```

### 2. Usuário Faz Login

```
useAuth() detecta user
  ↓
useUserProfile() useEffect dispara
  ↓
fetchProfile() é chamado
  ↓
Query: SELECT * WHERE user_id = ?
  ├─ Se existe → setProfile(data)
  └─ Se não existe → setProfile(null)
  ↓
UserOnboarding detecta:
!profile?.name && !!user
  ↓
setIsOpen(true)
  ↓
Modal abre com animação
```

### 3. Nome Inserido

```
Usuário digita "João Silva"
  ↓
handleNameSubmit() chamado
  ↓
name.trim() ? (validação)
  ├─ Vazio → setError("Nome é obrigatório")
  └─ Preenchido → setStep("avatar")
  ↓
Modal muda para Passo 2
```

### 4. Avatar Selecionado

```
Usuário seleciona foto.jpg
  ↓
handleAvatarSelect() é chamado
  ↓
FileReader lê arquivo
  ↓
setAvatarPreview(dataUrl)
  ↓
setAvatarFile(file)
  ↓
Preview aparece
```

### 5. Concluir Onboarding

```
Usuário clica "Concluir"
  ↓
handleComplete() é chamado
  ↓
setIsLoading(true)
  ↓
Se avatarFile:
  uploadAvatar(file) é chamado
    ↓
    filename = `avatars/{user.id}/{timestamp}-photo.jpg`
    ↓
    storage.upload(filename, file, { upsert: true })
    ↓
    storage.getPublicUrl(filename)
    ↓
    avatarUrl = "https://...public/avatars/..."
  ↓
updateProfile({
  name: "João Silva",
  avatar_url: avatarUrl
})
  ↓
Se novo perfil:
  INSERT INTO user_profiles_simonia (...)
Senão:
  UPDATE user_profiles_simonia SET ...
  ↓
fetchProfile() (reload)
  ↓
setProfile(data)
  ↓
setIsOpen(false)
  ↓
Modal fecha
```

### 6. Usuário Vê o Perfil

```
Sidebar renderiza
  ↓
useUserProfile().profile existe
  ↓
Avatar exibido: <img src={profile.avatar_url} />
  ↓
Nome exibido: {profile.name}
```

---

## Dependências

### Frontend

```json
{
  "dependencies": {
    "react": "^18.x",
    "@tanstack/react-query": "^5.x",
    "@supabase/supabase-js": "^2.x",
    "zustand": "^4.x",
    "lucide-react": "^latest"
  }
}
```

### Supabase

- Authentication (auth.users)
- Database (PostSQL)
- Storage (S3-compatible)
- Row Level Security (RLS)

---

## Tamanho e Performance

### Tamanho de Código

| Arquivo | Linhas | Tamanho |
|---------|--------|--------|
| UserOnboarding.tsx | 240 | ~8 KB |
| use-user-profile.ts | 135 | ~4 KB |
| Migrations SQL | 71 | ~2 KB |
| **Total** | **446** | **~14 KB** |

### Performance Esperada

| Operação | Tempo |
|----------|-------|
| Load onboarding modal | < 100ms |
| Upload avatar (2MB) | 1-3s (rede) |
| INSERT perfil | 100-200ms |
| Fetch perfil (novo) | 50-100ms |
| Fetch perfil (cache) | < 10ms |

---

## Variáveis de Ambiente Necessárias

```bash
# VITE_SUPABASE_URL
# Já existente no projeto

# VITE_SUPABASE_ANON_KEY
# Já existente no projeto

# Bucket name (codificado)
# "user-avatars"
```

---

## Testes Recomendados

### Unit Tests

```typescript
describe("useUserProfile", () => {
  test("should fetch profile on mount", () => { ... });
  test("should handle missing profile (PGRST116)", () => { ... });
  test("should upload avatar with correct path", () => { ... });
  test("should generate public URL correctly", () => { ... });
});

describe("UserOnboarding", () => {
  test("should not render if profile exists", () => { ... });
  test("should validate name input", () => { ... });
  test("should show preview on file select", () => { ... });
  test("should call updateProfile on submit", () => { ... });
});
```

### E2E Tests

```typescript
describe("User Onboarding Flow", () => {
  test("new user sees onboarding modal", () => { ... });
  test("can complete onboarding with name only", () => { ... });
  test("can complete onboarding with name + avatar", () => { ... });
  test("profile persists after reload", () => { ... });
  test("existing user does not see modal", () => { ... });
});
```

---

## Extensões Futuras

### Implementações Possíveis

1. **Editar Perfil**
   - Página `/profile` para editar nome/avatar
   - Reutilizar `useUserProfile()` hook

2. **Avatar Display**
   - Componente `<Avatar />` reutilizável
   - Iniciais como fallback
   - Cache de imagens

3. **Remover Foto**
   - Botão delete no perfil
   - Delete arquivo do storage
   - Update DB com avatar_url = null

4. **Validação de Imagem**
   - Verificar tamanho antes de upload
   - Comprimir imagem antes de salvar
   - Suportar múltiplos formatos

5. **Histórico de Avatares**
   - Manter múltiplas versões
   - Reverter para anterior
   - Limpar antigos periodicamente

6. **Sincronização Real-time**
   - Subscribe a mudanças em user_profiles_simonia
   - Atualizar sidebar em tempo real
   - Notificar outros usuários

---

## Referências Rápidas

### Imports Comuns

```typescript
// Hook
import { useUserProfile } from "@/hooks/use-user-profile";

// Componente
import { UserOnboarding } from "@/components/UserOnboarding";

// Interface
import type { UserProfile } from "@/hooks/use-user-profile";

// Supabase (direto)
import { supabase } from "@/lib/supabase";
```

### Chamadas de API Comuns

```typescript
// Buscar perfil
const { profile, isLoading } = useUserProfile();

// Atualizar nome
await updateProfile({ name: "Novo Nome" });

// Upload avatar
const url = await uploadAvatar(file);

// Query manual (se necessário)
const { data } = await supabase
  .from("user_profiles_simonia")
  .select("*")
  .eq("user_id", userId)
  .single();
```

---

## Checklist de Revisão de Código

Antes de dar merge:

- [ ] `UserOnboarding.tsx` compila sem erros
- [ ] `use-user-profile.ts` compila sem erros
- [ ] `App.tsx` tem import de UserOnboarding
- [ ] `App.tsx` renderiza <UserOnboarding /> corretamente
- [ ] Migration SQL é válida
- [ ] Componente usa design system (bg-background, etc)
- [ ] Validações estão presentes (nome obrigatório, tamanho arquivo)
- [ ] Mensagens de erro em português
- [ ] Animação slide-up funciona
- [ ] Estados de loading mostram spinner
- [ ] TypeScript types estão corretos
- [ ] Sem console.log() ou debug code
- [ ] Sem hardcoded paths ou URLs
- [ ] Componente é acessível (labels, ARIA attributes)

---

**Última atualização**: 19/11/2025
**Versão**: 1.0.0
