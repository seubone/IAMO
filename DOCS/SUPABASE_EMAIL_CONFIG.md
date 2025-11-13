# Configuração de Email no Supabase

Este guia explica como configurar o template de email e URLs no Supabase Dashboard.

## 🔧 Configuração de URLs

### Passo 1: Acessar Authentication Settings

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto: **svfucusuhnwmwyojmxgr**
3. No menu lateral, clique em **Authentication**
4. Clique em **URL Configuration**

### Passo 2: Configurar Site URL

Na seção **Site URL**, configure:

```
https://simonia.seubone.com
```

**IMPORTANTE**: Esta URL é usada como base para todos os redirects de autenticação.

### Passo 3: Configurar Redirect URLs

Na seção **Redirect URLs**, adicione:

```
https://simonia.seubone.com/auth/callback
http://localhost:5051/auth/callback
```

**Nota**: Mantenha localhost para desenvolvimento local.

---

## 📧 Configuração do Template de Email

### Passo 1: Acessar Email Templates

1. No Supabase Dashboard, vá em **Authentication**
2. Clique em **Email Templates**
3. Selecione **Confirm signup**

### Passo 2: Configurar Template HTML

Copie o conteúdo do arquivo `DOCS/EMAIL_TEMPLATE.html` e cole no editor do Supabase.

**Variáveis disponíveis no Supabase**:
- `{{ .ConfirmationURL }}` - Link de verificação
- `{{ .Email }}` - Email do usuário
- `{{ .Token }}` - Token de verificação
- `{{ .TokenHash }}` - Hash do token
- `{{ .SiteURL }}` - URL do site configurada

### Passo 3: Customizar Subject

No campo **Subject**, configure:

```
Confirme seu email - SimonIA
```

---

## 🎨 Template Customizado

O template HTML fornecido (`EMAIL_TEMPLATE.html`) possui:

✅ **Design profissional** com gradiente roxo/azul
✅ **Responsivo** para mobile e desktop
✅ **Botão CTA destacado** "Confirmar Email"
✅ **Link alternativo** para copiar e colar
✅ **Aviso de expiração** (24 horas)
✅ **Mensagem de segurança** para quem não solicitou
✅ **Footer com branding** SimonIA

---

## 🔍 Verificação

Após configurar, teste o fluxo:

1. Crie um novo usuário via cadastro
2. Verifique se o email chegou com o design correto
3. Confirme se o link redireciona para `https://simonia.seubone.com/auth/callback`
4. Valide se a verificação funciona corretamente

---

## ⚠️ Troubleshooting

### Email ainda usa localhost

**Problema**: Email continua usando `localhost:3000`

**Solução**:
1. Verifique se a **Site URL** está configurada corretamente no Supabase
2. Aguarde alguns minutos para propagação das configurações
3. Limpe o cache do navegador
4. Tente um novo cadastro

### Template não aparece

**Problema**: Email chega sem formatação

**Solução**:
1. Verifique se o template foi salvo corretamente
2. Certifique-se de que está editando o template "Confirm signup"
3. Clique em **Save** após colar o template

### Link não funciona

**Problema**: Ao clicar no link, dá erro

**Solução**:
1. Verifique se a URL de redirect está nas **Redirect URLs** permitidas
2. Certifique-se de que o servidor está rodando
3. Verifique se o token não expirou (24h)

---

## 📚 Recursos

- [Documentação do Supabase - Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Documentação do Supabase - URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Template HTML](./EMAIL_TEMPLATE.html)

---

## 🔐 Segurança

- ✅ Links expiram em 24 horas
- ✅ Tokens são únicos e de uso único
- ✅ HTTPS obrigatório em produção
- ✅ CORS configurado para domínios específicos
