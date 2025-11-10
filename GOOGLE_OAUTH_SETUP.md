# Configuração de Autenticação Google OAuth

Este guia descreve como configurar a autenticação Google OAuth no seu aplicativo usando Supabase.

## O que foi implementado

- Botões "Entrar com Google" e "Registrar-se com Google" nas páginas de login/registro
- Integração com Supabase OAuth v2
- Sincronização de dados de usuário do Google com banco de dados local
- Fluxo completo de callback OAuth

## Pré-requisitos

1. Projeto do Google Cloud Console criado
2. Credenciais OAuth 2.0 (Client ID e Client Secret)
3. Conta Supabase ativa
4. Seu aplicativo rodando em desenvolvimento ou produção

## Passo 1: Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá para **"Credenciais"** no menu lateral esquerdo
4. Clique em **"Criar credenciais"** e selecione **"OAuth 2.0 Client ID"**
5. Se solicitado, configure a tela de consentimento OAuth:
   - Tipo de usuário: **Externo**
   - Nome do aplicativo: **Monitoramento de IA**
   - Email de suporte: seu@email.com
   - Scopes necessários:
     - `userinfo.email`
     - `userinfo.profile`
     - `openid`

## Passo 2: Configurar Google OAuth Credentials

1. Depois de configurar a tela de consentimento, volte para **"Credenciais"**
2. Clique em **"Criar credenciais"** > **"OAuth 2.0 Client ID"**
3. Selecione **"Aplicação Web"** como tipo de aplicação
4. Configure as URIs autorizadas de redirecionamento:

### URLs de Redirecionamento Obrigatórias

Você precisa adicionar as seguintes URLs na configuração do Google OAuth:

**Para Desenvolvimento:**
```
http://localhost:5000/auth/callback
http://localhost:5173/auth/callback
```

**Para Produção:**
```
https://seu-dominio.com/auth/callback
```

> **Nota:** Substitua `seu-dominio.com` pelo seu domínio de produção real.

5. Clique em **"Criar"** para gerar as credenciais
6. Copie o **Client ID** e **Client Secret**

## Passo 3: Configurar Supabase OAuth

1. Acesse o [Dashboard do Supabase](https://app.supabase.com/)
2. Selecione seu projeto
3. Vá para **"Authentication"** > **"Providers"**
4. Procure por **"Google"** e clique para ativar
5. Cole o **Google Client ID** no campo "Google Client ID"
6. Cole o **Google Client Secret** no campo "Google Client Secret"
7. Clique em **"Save"**

## Passo 4: Configurar Variáveis de Ambiente

Certifique-se de que seu arquivo `.env` contenha:

```env
# Supabase Configuration
SUPABASE_URL=https://sua-instancia.supabase.co
SUPABASE_ANON_KEY=seu-anon-key
SUPABASE_SERVICE_ROLE_KEY=seu-service-role-key

# Frontend URL (usado para redirecionamento após OAuth)
FRONTEND_URL=http://localhost:5000
# ou para produção:
# FRONTEND_URL=https://seu-dominio.com
```

## Passo 5: Testar a Autenticação Google

### Teste em Desenvolvimento

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse http://localhost:5000/login

3. Clique no botão **"Google"** (ícone do Google)

4. Você será redirecionado para a página de login do Google

5. Após fazer login com sua conta Google, você será redirecionado para `/auth/callback`

6. A página processará automaticamente a autenticação e redirecionará para a página inicial

### Verificar Login Bem-sucedido

- Você deve ver um toast de sucesso: "Autenticação bem-sucedida!"
- Será redirecionado para a página inicial (`/`)
- O token será salvo no localStorage
- Seu usuário será criado no banco de dados local (se não existir)

## Como Funciona o Fluxo OAuth

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Frontend      │         │  Google OAuth    │         │  Supabase    │
└────────┬────────┘         └────────┬─────────┘         └──────┬───────┘
         │                            │                          │
         │  1. Clica "Google"         │                          │
         ├───────────────────────────────────────────────────────>
         │                            │  2. Redireciona para     │
         │<───────────────────────────────────────────────────────
         │     Google Login           │
         │  3. Login com Google       │
         ├───────────────────────────>
         │                            │  4. Redireciona para     │
         │                            │  /auth/callback com auth │
         │<───────────────────────────────────────────────────────
         │
         │  5. Obtém sessão Supabase  │
         ├────────────────────────────────────────────────────────>
         │<───────────────────────────────────────────────────────
         │
         │  6. Envia dados para       │
         │  /api/auth/google-callback │
         ├──────> (nosso backend)    │
         │                            │  7. Sincroniza usuário   │
         │                            │  no banco de dados local  │
         │<──────────────────────────
         │
         │  8. Redireciona para /     │
         │  (página inicial)          │
         └────────────────────────────┘
```

## Dados Sincronizados

Quando um usuário faz login via Google, os seguintes dados são sincronizados:

```javascript
{
  id: "google_user@email_com",  // ID gerado a partir do email
  name: "Nome do Usuário",       // Do perfil do Google
  email: "user@email.com",       // Email do Google
  role: "viewer",                // Role padrão
  password: ""                   // Vazio (OAuth users)
}
```

## Endpoints Utilizados

### Backend

**POST /api/auth/google-callback**
- Recebe: `{ accessToken, email, name }`
- Retorna: `{ user, token, success: true }`
- Sincroniza o usuário do Google com o banco de dados local

### Frontend

**signInWithGoogle()** - `client/src/lib/google-auth.ts`
- Inicia o fluxo OAuth com Supabase
- Abre a página de login do Google

**handleGoogleCallback()** - `client/src/lib/google-auth.ts`
- Processa o callback da autenticação Google
- Chama `/api/auth/google-callback` para sincronizar dados
- Retorna os dados do usuário autenticado

## Solução de Problemas

### Erro: "Invalid redirect URI"
- Certifique-se de que as URLs de redirecionamento estão exatamente como configuradas no Google Console
- Verifique se há https:// ou http:// no início
- Verifique se não há espaços extras

### Erro: "Credenciais de OAuth não configuradas"
- Verifique se o Google OAuth está ativado no Supabase
- Confirme que Client ID e Client Secret foram colados corretamente
- Aguarde alguns minutos para as mudanças serem propagadas

### Usuário redirecionado para login após callback
- Verifique se o token está sendo salvo corretamente
- Verifique se `FRONTEND_URL` no `.env` está correto
- Verifique o console do navegador para erros

### Erro ao criar usuário no banco de dados local
- Verifique se o usuário já existe com esse email
- Verifique se o banco de dados local está conectado corretamente
- Verifique os logs do servidor para mais detalhes

## Próximos Passos Opcionais

1. **Configurar Picture do Usuário**: Adicionar foto do perfil Google
   ```typescript
   // Em handleGoogleCallback, adicionar:
   avatar: sessionUser.user_metadata?.avatar_url
   ```

2. **Vincular Contas Existentes**: Permitir vincular conta Google a conta local
   ```typescript
   // Verificar se email já existe
   if (existingLocalUser) {
     // Marcar como verified
   }
   ```

3. **Rastreamento de Login**: Registrar logins via Google para auditoria
   ```typescript
   // Adicionar log de auditoria
   ```

## Referências

- [Supabase OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
