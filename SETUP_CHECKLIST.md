# Setup Checklist - User Profiles System

## Visão Geral Rápida

Sistema de perfis de usuário está **100% implementado no código**. Agora você precisa:
1. Criar tabela no Supabase (SQL)
2. Criar bucket de storage no Supabase (UI)
3. Testar o fluxo

**Tempo estimado**: 10-15 minutos

---

## Passo 1: Criar Tabela no Supabase

### ✅ TODO - Passo 1.1: Acessar SQL Editor

1. Abra: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/sql
2. Clique em "New Query"
3. Copie TODO conteúdo de: `server/migrations/create-user-profiles-simonia-table.sql`
4. Cole no editor
5. Clique em "Run" (ou Ctrl+Enter)

**Resultado esperado**:
```
✓ Query successful (16.2ms)
```

### ✅ TODO - Passo 1.2: Verificar Tabela Criada

1. Vá para: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/editor
2. Na barra lateral, procure por "Tables"
3. Você deve ver: `user_profiles_simonia`
4. Expanda e confirme as colunas:
   - `id` (UUID)
   - `user_id` (UUID)
   - `name` (TEXT)
   - `avatar_url` (TEXT)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

### ✅ TODO - Passo 1.3: Verificar RLS Policies

1. Selecione a tabela `user_profiles_simonia`
2. Vá para a aba "Policies" (RLS)
3. Confirme que existem 4 políticas:
   - ✓ "Users can view their own profile"
   - ✓ "Users can update their own profile"
   - ✓ "Users can insert their own profile"
   - ✓ "Users can delete their own profile"

---

## Passo 2: Criar Bucket de Storage

### ✅ TODO - Passo 2.1: Criar Bucket

1. Vá para: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/storage/buckets
2. Clique em "New bucket"
3. Preencha:
   - **Name**: `user-avatars`
   - **Visibility**: Selecione **"Public"** (IMPORTANTE!)
4. Clique "Create bucket"

**Resultado esperado**:
```
✓ Bucket "user-avatars" criado com sucesso
```

### ✅ TODO - Passo 2.2: Verificar Bucket

1. Na página de buckets, você deve ver `user-avatars` listado
2. Clique nele para abrir
3. Deve estar vazio (nenhum arquivo ainda)

### ✅ TODO - Passo 2.3: Configurar RLS Policies (Opcional Mas Recomendado)

Para máxima segurança, adicione as políticas de storage:

1. Abra o bucket `user-avatars`
2. Vá para aba "Policies"
3. Clique "New Policy"
4. Adicione estas 4 policies (copie da documentação):

**Policy 1: Upload próprio**
```sql
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  (bucket_id = 'user-avatars') AND
  (auth.uid()::text = (storage.foldername(name))[1])
);
```

**Policy 2: Update próprio**
```sql
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
USING (
  (bucket_id = 'user-avatars') AND
  (auth.uid()::text = (storage.foldername(name))[1])
)
WITH CHECK (
  (bucket_id = 'user-avatars') AND
  (auth.uid()::text = (storage.foldername(name))[1])
);
```

**Policy 3: Delete próprio**
```sql
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
USING (
  (bucket_id = 'user-avatars') AND
  (auth.uid()::text = (storage.foldername(name))[1])
);
```

**Policy 4: View público**
```sql
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-avatars');
```

> **Nota**: Se não adicionar as policies, o upload funcionará mas você terá menos controle de segurança.

---

## Passo 3: Testar o Sistema

### ✅ TODO - Passo 3.1: Build do Projeto

```bash
npm run build
```

Aguarde até completar:
```
✓ built in 5.43s
```

### ✅ TODO - Passo 3.2: Iniciar Servidor

```bash
npm run dev
```

Aguarde até:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### ✅ TODO - Passo 3.3: Testar com Usuário Novo

1. Abra: http://localhost:5173/login
2. Faça login com um usuário **que não tem perfil ainda**
   - Recomendação: crie um usuário de teste no Supabase
   - Ou use um usuário que nunca fez login antes
3. **Resultado esperado**:
   - ✓ Pagina carrega
   - ✓ Modal fullscreen aparece com "Bem-vindo!"
   - ✓ Animação slide-up ocorre
   - ✓ Passo 1: Campo "Digite seu nome e sobrenome"

### ✅ TODO - Passo 3.4: Preencher Passo 1

1. Digite: "João Silva" (ou seu nome)
2. Pressione Enter ou clique "Próximo"
3. **Resultado esperado**:
   - ✓ Modal muda para Passo 2
   - ✓ Cabeçalho: "Foto de Perfil"
   - ✓ Botão "Clique para selecionar foto"

### ✅ TODO - Passo 3.5: Adicionar Foto (Opcional)

1. Clique na área de upload
2. Selecione uma imagem (JPG, PNG, até 5MB)
3. **Resultado esperado**:
   - ✓ Preview da foto aparece em círculo
   - ✓ Botão X para remover
   - ✓ Botões "Voltar", "Concluir", "Pular esta etapa"

### ✅ TODO - Passo 3.6: Completar Onboarding

- **Opção A**: Clique "Concluir" (com foto)
- **Opção B**: Clique "Pular esta etapa" (sem foto)

**Resultado esperado**:
- ✓ Modal carrega
- ✓ "Salvando..." apareça
- ✓ Modal fecha automaticamente
- ✓ Você vê a sidebar com seu nome

### ✅ TODO - Passo 3.7: Verificar no Supabase

1. Vá para: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/editor
2. Abra a tabela `user_profiles_simonia`
3. **Resultado esperado**:
   - ✓ Novo registro com seu user_id
   - ✓ Campo `name` = "João Silva"
   - ✓ Campo `avatar_url` preenchido (se adicionou foto)
   - ✓ Timestamps `created_at` e `updated_at`

### ✅ TODO - Passo 3.8: Verificar Storage

1. Vá para: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/storage/buckets
2. Abra o bucket `user-avatars`
3. **Resultado esperado**:
   - ✓ Pasta `avatars/`
   - ✓ Subfolder com seu `{user_id}`
   - ✓ Arquivo `{timestamp}-{filename}` dentro

### ✅ TODO - Passo 3.9: Testar URL Avatar

1. Abra a aba "Network" do navegador (F12 → Network)
2. Recarregue a página (F5)
3. Procure por requests para Storage:
   - Deve haver uma para a URL do avatar
   - **Status esperado**: 200 (sucesso)
   - **Tamanho**: tamanho da imagem
4. Clique no request para ver:
   - ✓ URL pública do avatar
   - ✓ Status 200
   - ✓ Content-Type: image/*

### ✅ TODO - Passo 3.10: Testar com Usuário Existente

1. Faça logout: clique menu → "Sair"
2. Abra DevTools (F12) → Storage → Cookies
3. Delete o cookie de sessão do app
4. Login novamente com o mesmo usuário
5. **Resultado esperado**:
   - ✓ Modal NÃO aparece (perfil já existe)
   - ✓ Sidebar exibe seu nome
   - ✓ Sidebar exibe seu avatar (se adicionou)

---

## Passo 4: Troubleshooting

### Problema: "Bucket not found"

**Causa**: Bucket não criado ou nome errado
**Solução**:
1. Verifique se criou bucket com nome exato: `user-avatars`
2. Verifique em Storage → Buckets
3. Recrie se necessário

### Problema: "403 Forbidden" no Upload

**Causa**: Bucket não é público ou RLS negando acesso
**Solução**:
1. Abra o bucket em Storage
2. Verifique se é "Public"
3. Se RLS policies foram adicionadas, verifique se estão corretas

### Problema: Modal não aparece

**Causa**: Perfil já existe, ou usuário não está autenticado
**Solução**:
1. Confirme que você está logado (check sidebar)
2. Verifique se o usuário tem registro em `user_profiles_simonia`
3. Se tem, delete e faça login novamente
4. Check console (F12) para erros

### Problema: Erro ao salvar "PGRST116"

**Causa**: Tabela não foi criada
**Solução**:
1. Execute novamente a migration SQL
2. Verifique que a tabela existe em Editor → Tables

### Problema: Avatar URL retorna 404

**Causa**: Arquivo não existe no storage
**Solução**:
1. Verifique se a estrutura do path está correta
2. Reupload a imagem
3. Confirme que o bucket é "Public"

---

## Passo 5: Próximos Passos (Futuro)

Depois de confirmar que tudo funciona:

1. **Build para produção**:
   ```bash
   npm run build:prod
   ```

2. **Docker push** (se necessário):
   ```bash
   docker build -t cainanmaia/simonia:v1.0.4 .
   docker push cainanmaia/simonia:v1.0.4
   ```

3. **Deploy na VPS**:
   ```bash
   # SSH para servidor
   ssh user@server
   # Pull imagem
   docker pull cainanmaia/simonia:v1.0.4
   # Restart container
   docker-compose up -d
   ```

---

## Documentação Completa

Para detalhes completos sobre cada parte do sistema:

- **Setup Geral**: [SETUP_USER_PROFILES.md](./SETUP_USER_PROFILES.md)
- **Storage**: [SUPABASE_STORAGE_SETUP.md](./SUPABASE_STORAGE_SETUP.md)
- **Arquitetura**: [ARCHITECTURE_USER_PROFILES.md](./ARCHITECTURE_USER_PROFILES.md)

---

## Status do Código

| Componente | Status | Arquivo |
|-----------|--------|---------|
| Hook (useUserProfile) | ✅ Completo | [use-user-profile.ts](./client/src/hooks/use-user-profile.ts) |
| Componente (UserOnboarding) | ✅ Completo | [UserOnboarding.tsx](./client/src/components/UserOnboarding.tsx) |
| Migration SQL | ✅ Completo | [create-user-profiles-simonia-table.sql](./server/migrations/create-user-profiles-simonia-table.sql) |
| App Integration | ✅ Completo | [App.tsx](./client/src/App.tsx) |
| **Banco de Dados** | ⏳ Aguardando | Execute migration no Supabase |
| **Storage Bucket** | ⏳ Aguardando | Crie em Supabase Storage |
| **Teste E2E** | ⏳ Aguardando | Seu teste |

---

## Quick Reference - Supabase URLs

| O quê | URL |
|------|-----|
| Editor de Tabelas | https://app.supabase.com/project/svfucusuhnwmwyojmxgr/editor |
| SQL Editor | https://app.supabase.com/project/svfucusuhnwmwyojmxgr/sql |
| Storage | https://app.supabase.com/project/svfucusuhnwmwyojmxgr/storage/buckets |
| Autenticação | https://app.supabase.com/project/svfucusuhnwmwyojmxgr/auth/users |
| Configurações | https://app.supabase.com/project/svfucusuhnwmwyojmxgr/settings/api |

---

## Estimated Timeline

- Passo 1 (Tabela): 2-3 minutos
- Passo 2 (Storage): 1-2 minutos
- Passo 3 (Teste): 5-10 minutos
- **Total**: 10-15 minutos

---

**Data de Criação**: 19/11/2025
**Última Atualização**: 19/11/2025
**Status**: Pronto para Configuração
