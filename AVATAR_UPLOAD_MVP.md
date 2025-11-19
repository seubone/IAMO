# Avatar Upload MVP - Análise e Checklist

## Erro Atual: "Erro ao salvar URL da foto"

```
Error: Erro ao salvar URL da foto
Location: UserOnboarding.tsx → uploadAvatar() → updateProfile()
```

---

## MVP - Fluxo Atual vs Esperado

### Fluxo Esperado ✅
```
1. Usuário seleciona imagem
   ↓
2. Preview é mostrado
   ↓
3. Clica em "Concluir"
   ↓
4. uploadAvatar() é chamado
   ├─ Converte arquivo para base64
   ├─ Envia para /api/upload-avatar
   ├─ Backend faz upload no Supabase Storage
   ├─ Backend retorna URL pública
   └─ Salva URL na tabela user_profiles_simonia
   ↓
5. updateProfile() é chamado
   ├─ Atualiza name + avatar_url
   └─ Fecha onboarding
   ↓
6. Usuário vê perfil atualizado ✅
```

### Fluxo Atual com Erros ❌
```
1. Usuário seleciona imagem ✅
2. Preview é mostrado ✅
3. Clica em "Concluir" ✅
4. uploadAvatar() é chamado ✅
   ├─ Converte arquivo para base64 ✅
   ├─ Envia para /api/upload-avatar ✅
   ├─ Backend faz upload no Supabase Storage ✅
   ├─ Backend retorna URL pública ✅
   └─ **❌ FALHA ao salvar URL na tabela**
```

---

## Problemas Identificados

| # | Problema | Status | Solução |
|---|----------|--------|---------|
| 1 | RLS bloqueando insert no Supabase | ✅ Fixado | Desabilitado RLS |
| 2 | Duplicate key constraint | ✅ Fixado | Removido UNIQUE constraint |
| 3 | Backend endpoint não existia | ✅ Fixado | Criado `/api/upload-avatar` |
| 4 | Token inválido ao chamar API | ✅ Parcialmente | Usando Zustand token |
| 5 | **"Erro ao salvar URL da foto" ao fazer upsert** | ❌ ATIVO | **INVESTIGAR** |

---

## Checklist - Requisitos para Salvar Avatar

### Backend `/api/upload-avatar` Endpoint
- [x] Receber arquivo em base64
- [x] Converter base64 para buffer
- [x] Fazer upload no bucket `user-avatars`
- [x] Gerar URL pública do arquivo
- [x] **PROBLEMA**: Salvar URL na BD

```typescript
// Linha 2771-2777 em server/routes.ts
const { error: dbError } = await supabase
  .from('user_profiles_simonia')
  .upsert({
    user_id: req.user.id,
    avatar_url: publicUrl.publicUrl,  // ← FALHA AQUI
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
```

### Frontend `uploadAvatar()` Hook
- [x] Converter File para base64
- [x] Enviar para backend com auth token
- [x] Receber URL de resposta
- [x] Retornar URL para componente
- [x] Chamar `updateProfile()` com avatar_url

### Banco de Dados `user_profiles_simonia`
- [x] Tabela criada
- [x] Colunas corretas (id, user_id, name, avatar_url)
- [x] RLS desabilitado
- [x] **PROBLEMA**: Upsert está falhando silenciosamente

---

## Debug - O que Precisa Verificar

### 1. **Logs do Backend**
```bash
# Ver logs do servidor Node.js
# Procurar por: "Error updating profile:" na linha 2780
```

### 2. **Estrutura da Tabela**
```sql
-- Verificar se a tabela existe e tem as colunas certas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles_simonia';

-- Resultado esperado:
-- id          | uuid    | not null
-- user_id     | text    | not null
-- name        | text    | YES
-- avatar_url  | text    | YES
-- created_at  | timestamp with time zone | YES
-- updated_at  | timestamp with time zone | YES
```

### 3. **Testando Upsert Manualmente**
```sql
-- Teste se o upsert funciona diretamente
INSERT INTO public.user_profiles_simonia
  (user_id, name, avatar_url, updated_at)
VALUES ('test-user-123', 'Test', 'https://example.com/avatar.png', NOW())
ON CONFLICT (user_id)
DO UPDATE SET
  avatar_url = EXCLUDED.avatar_url,
  updated_at = EXCLUDED.updated_at;
```

### 4. **Verificar Segurança do Supabase**
- [ ] Service role key sendo usado no backend? (não, usa anon key)
- [ ] RLS realmente desabilitado na tabela?
- [ ] Permissões de POST na tabela habilitadas para anon users?

---

## Soluções Possíveis

### Opção 1: Usar Service Role Key (Recomendado) 🏆
```typescript
// server/routes.ts - usar SERVICE_ROLE_KEY em vez de anon key
const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ← Tem permissão total
);

const { error: dbError } = await supabaseAdmin
  .from('user_profiles_simonia')
  .upsert({...});
```

### Opção 2: Criar Edge Function
```typescript
// Usar Supabase Edge Function com permissões de admin
// Para fazer o upload e salvar URL de forma segura
```

### Opção 3: Usar Update em vez de Upsert
```typescript
// Primeiro criar registro vazio, depois update
const { error: dbError } = await supabase
  .from('user_profiles_simonia')
  .update({
    avatar_url: publicUrl.publicUrl,
    updated_at: new Date().toISOString()
  })
  .eq('user_id', req.user.id);
```

---

## Próximos Passos

1. **Verificar logs do backend** para ver mensagem de erro real
2. **Implementar SERVICE_ROLE_KEY** no endpoint
3. **Testar upsert** manualmente no SQL
4. **Validar resposta** do endpoint antes de salvar

---

## Commit Necessário

```bash
git commit -m "fix: use Supabase SERVICE_ROLE_KEY for avatar profile update"
```

