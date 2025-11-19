# Configuração de Storage no Supabase - Bucket de Avatares

## Overview

O sistema de perfil de usuários utiliza um bucket de storage no Supabase para armazenar e servir as fotos de perfil dos usuários. Este documento detalha como configurar e gerenciar o bucket `user-avatars`.

## Estrutura de Armazenamento

Os avatares são organizados da seguinte forma:

```
user-avatars/
└── avatars/
    ├── {user_id_1}/
    │   ├── 1700000000000-photo.jpg
    │   ├── 1700000001000-photo.jpg
    │   └── ...
    ├── {user_id_2}/
    │   ├── 1700000002000-photo.jpg
    │   └── ...
    └── {user_id_n}/
        └── ...
```

### Detalhes da Estrutura

- **Raiz**: `avatars/` - Prefixo de organização
- **User ID**: `{user_id}` - UUID do usuário autenticado (garante isolamento)
- **Timestamp**: `{Date.now()}` - Milliseconds desde epoch (permite múltiplas versões)
- **Nome original**: `{file.name}` - Nome do arquivo original

**Exemplo completo**: `avatars/550e8400-e29b-41d4-a716-446655440000/1700000000000-profile.jpg`

## Configuração do Bucket

### Passo 1: Criar o Bucket

1. Acesse: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/storage/buckets
2. Clique em "New bucket"
3. Preencha:
   - **Name**: `user-avatars`
   - **Visibility**: Selecione "Public" (necessário para servir URLs públicas)
4. Clique "Create bucket"

### Passo 2: Configurar RLS Policies

O bucket `user-avatars` requer políticas RLS (Row Level Security) para controlar o acesso.

#### Policy 1: Usuários podem fazer upload de seus próprios avatares

```sql
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  (bucket_id = 'user-avatars') AND
  (auth.uid()::text = (storage.foldername(name))[1])
);
```

#### Policy 2: Usuários podem atualizar seus próprios avatares

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

#### Policy 3: Usuários podem deletar seus próprios avatares

```sql
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
USING (
  (bucket_id = 'user-avatars') AND
  (auth.uid()::text = (storage.foldername(name))[1])
);
```

#### Policy 4: Qualquer um pode ver avatares públicos

```sql
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-avatars');
```

### Passo 3: Adicionar as Policies via Supabase Dashboard

1. Acesse: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/storage/buckets
2. Selecione o bucket `user-avatars`
3. Vá para a aba "Policies"
4. Clique "New Policy" e adicione cada policy acima

## Como Funciona o Upload

### Fluxo no Frontend

```typescript
// 1. Usuário seleciona um arquivo
const file = e.target.files[0]; // ex: "photo.jpg"

// 2. Hook gera o caminho
const filename = `avatars/${user.id}/${Date.now()}-${file.name}`;
// Resultado: "avatars/550e8400-e29b-41d4-a716-446655440000/1700000000000-photo.jpg"

// 3. Upload para Supabase
await supabase.storage
  .from("user-avatars")
  .upload(filename, file, { upsert: true });

// 4. Obter URL pública
const { data } = supabase.storage
  .from("user-avatars")
  .getPublicUrl(filename);

// Retorna: "https://svfucusuhnwmwyojmxgr.supabase.co/storage/v1/object/public/user-avatars/avatars/{user_id}/{timestamp}-{filename}"

// 5. Salvar URL no banco de dados
await updateProfile({
  avatar_url: data.publicUrl
});
```

### Opção `upsert: true`

A opção `upsert: true` permite:
- **Primeira vez**: Criar o arquivo
- **Atualizações**: Sobrescrever o arquivo anterior
- **Vantagem**: Sempre ter uma versão mais recente, mas manter o timestamp da requisição

### URL Pública

A URL pública segue o padrão:

```
https://{PROJECT_ID}.supabase.co/storage/v1/object/public/{bucket_name}/{path}
```

**Exemplo completo**:
```
https://svfucusuhnwmwyojmxgr.supabase.co/storage/v1/object/public/user-avatars/avatars/550e8400-e29b-41d4-a716-446655440000/1700000000000-photo.jpg
```

## Vínculo aos Usuários

### Na Tabela `user_profiles_simonia`

```sql
CREATE TABLE user_profiles_simonia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,  -- ← Armazena a URL pública do avatar
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Fluxo de Vínculo

1. **Usuário faz login** → `auth.users.id` (ex: `550e8400-e29b-41d4-a716-446655440000`)

2. **Usuário faz upload de avatar**:
   - Arquivo salvo em: `avatars/{auth.users.id}/{timestamp}-{filename}`
   - URL gerada e retornada

3. **URL é salva no banco**:
   - Executa `updateProfile({ avatar_url: publicUrl })`
   - Insere/atualiza em `user_profiles_simonia.avatar_url`

4. **Vínculo automático**:
   - Campo `user_id` = `auth.users.id` (chave estrangeira)
   - Campo `avatar_url` = URL pública do arquivo no storage
   - O arquivo no storage está organizado por `user_id` no caminho

### Segurança do Vínculo

- **Nível 1 - Storage**: RLS Policy verifica que o usuário logado é o dono do arquivo
- **Nível 2 - Database**: Foreign key `user_id` garante consistência
- **Nível 3 - Database**: RLS Policy na tabela garante que usuário vê apenas seu próprio perfil
- **Nível 4 - Organization**: Estrutura de pastas `avatars/{user_id}/` deixa claro o proprietário

## Gerenciamento de Storage

### Monitorar Uso

1. Acesse: https://app.supabase.com/project/svfucusuhnwmwyojmxgr/storage/buckets/user-avatars
2. Veja:
   - Número total de arquivos
   - Espaço total utilizado
   - Histórico de atividade

### Limpeza de Arquivos Antigos

Se um usuário atualizar seu avatar múltiplas vezes, você pode:

**Opção 1: Manter histórico** (atual)
- Cada atualização cria um novo arquivo
- URLs antigas continuam funcionando
- Mais espaço utilizado

**Opção 2: Deletar anterior**
- Modificar `uploadAvatar()` para deletar o arquivo anterior antes de fazer upload
- Economiza espaço
- URLs antigas deixam de funcionar

**Implementação da Opção 2**:

```typescript
async function uploadAvatar(file: File): Promise<string> {
  if (!user) throw new Error("User not authenticated");

  try {
    // 1. Deletar avatar anterior se existir
    if (profile?.avatar_url) {
      const oldPath = extractPathFromUrl(profile.avatar_url);
      await supabase.storage
        .from("user-avatars")
        .remove([oldPath]);
    }

    // 2. Upload do novo avatar
    const filename = `avatars/${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("user-avatars")
      .upload(filename, file);

    if (uploadError) throw uploadError;

    // 3. Obter URL pública
    const { data } = supabase.storage
      .from("user-avatars")
      .getPublicUrl(filename);

    return data.publicUrl;
  } catch (err: any) {
    console.error("Error uploading avatar:", err.message);
    throw err;
  }
}
```

## Validações Recomendadas

### Frontend (ao fazer upload)

```typescript
const validateFile = (file: File): boolean => {
  // Verificar tipo
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    setError("Apenas JPG, PNG e WebP são aceitos");
    return false;
  }

  // Verificar tamanho (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    setError("Arquivo deve ter menos de 5MB");
    return false;
  }

  return true;
};
```

### Backend (via SQL function)

```sql
-- Opcionalmente, criar uma função para validar antes de aceitar
CREATE OR REPLACE FUNCTION validate_avatar()
RETURNS TRIGGER AS $$
BEGIN
  -- Validação adicional pode ser feita aqui
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## URLs e Endpoints

### Informações do Projeto

- **Project ID**: `svfucusuhnwmwyojmxgr`
- **Storage URL Base**: `https://svfucusuhnwmwyojmxgr.supabase.co/storage/v1`
- **Bucket Name**: `user-avatars`

### Endpoints Úteis

| Operação | Endpoint |
|----------|----------|
| Listar arquivos | `GET /object/list/user-avatars/{path}` |
| Fazer upload | `POST /object/user-avatars/{path}` |
| Download | `GET /object/authenticated/user-avatars/{path}` |
| URL pública | `GET /object/public/user-avatars/{path}` |
| Deletar | `DELETE /object/user-avatars/{path}` |

## Checklist de Setup

- [ ] Bucket `user-avatars` criado
- [ ] Bucket configurado como "Public"
- [ ] RLS Policies adicionadas (4 policies)
- [ ] Tabela `user_profiles_simonia` criada
- [ ] Hook `useUserProfile` testado
- [ ] Componente `UserOnboarding` funcionando
- [ ] Avatar upload testado com usuário real
- [ ] URL avatar exibida no sidebar
- [ ] URLs antigas não quebram (teste histórico)

## Troubleshooting

### "Bucket not found"
- Verifique o nome do bucket: deve ser exatamente `user-avatars`
- Confirme que o bucket foi criado em Storage → Buckets

### "403 Forbidden" no upload
- Verifique se o bucket é Public
- Verifique RLS Policies
- Confirme que `user.id` está sendo usado corretamente no caminho

### "CORS error"
- Geralmente não ocorre pois Supabase configura CORS automaticamente
- Se ocorrer, verifique as configurações do projeto em Settings → API

### Avatar URL retorna 404
- Verifique se o arquivo foi realmente criado (check bucket)
- Verifique se a URL está completa e correta
- Confirm que é uma URL "public", não "authenticated"

## Referências

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase RLS Policies](https://supabase.com/docs/guides/storage/access-control/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/storage)
