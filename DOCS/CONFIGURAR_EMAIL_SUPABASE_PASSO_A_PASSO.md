# 🔧 Configurar Email no Supabase - Passo a Passo

## ⚠️ IMPORTANTE: Você precisa fazer essas configurações manualmente no Supabase Dashboard

O template HTML foi criado no arquivo `DOCS/EMAIL_TEMPLATE.html`, mas você precisa copiá-lo para o Supabase.

---

## 📋 Passo 1: Configurar Site URL (Corrige o problema do localhost:3000)

### 1.1 Acessar o Supabase Dashboard
1. Abra: https://app.supabase.com
2. Faça login
3. Selecione seu projeto: **svfucusuhnwmwyojmxgr**

### 1.2 Configurar URL do Site
1. No menu lateral esquerdo, clique em: **Authentication** (ícone de cadeado)
2. Clique na aba: **URL Configuration**
3. No campo **Site URL**, altere de:
   ```
   http://localhost:3000
   ```
   Para:
   ```
   https://simonia.seubone.com
   ```
4. Clique em **Save** no canto inferior direito

### 1.3 Adicionar Redirect URLs
Na seção **Redirect URLs**, adicione:
```
https://simonia.seubone.com/auth/callback
http://localhost:5051/auth/callback
```

**Clique em "+ Add URL"** para cada uma e depois **Save**.

---

## 📧 Passo 2: Configurar Template de Email

### 2.1 Acessar Email Templates
1. Ainda em **Authentication**
2. Clique na aba: **Email Templates**
3. Você verá uma lista de templates:
   - Magic Link
   - Change Email Address
   - **Confirm signup** ← SELECIONE ESTE
   - Reset Password

### 2.2 Editar o Template "Confirm signup"

1. **Clique em "Confirm signup"**

2. **No campo "Subject"**, altere para:
   ```
   Confirme seu email - SimonIA
   ```

3. **No campo "Message (Body)"**:
   - Selecione TODO o conteúdo existente (Ctrl+A)
   - Delete tudo
   - Abra o arquivo: `C:\projeto\MONITORAMENT_2\Monitoramento-de-IA\DOCS\EMAIL_TEMPLATE.html`
   - Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
   - Cole no editor do Supabase (Ctrl+V)

4. **Clique em "Save"** no canto inferior direito

---

## ✅ Passo 3: Testar

### 3.1 Fazer um novo cadastro
Após salvar as configurações:

1. Aguarde 2-3 minutos (para propagação das configurações)
2. Faça um novo cadastro na plataforma
3. Verifique seu email

### 3.2 Verificar o resultado

O email deve chegar com:
- ✅ Logo branca do SimonIA no header azul
- ✅ Botão "Confirmar Email" na cor azul (#7B8CDE)
- ✅ Link alternativo com borda azul
- ✅ Alerta de expiração com destaque amarelo
- ✅ URL apontando para: `https://simonia.seubone.com/auth/callback`

---

## 🐛 Troubleshooting

### Problema 1: Email ainda usa localhost:3000
**Solução:** Verifique se você salvou a configuração da **Site URL** no passo 1.2

### Problema 2: Email ainda vem sem design
**Solução:**
1. Confirme que você copiou TODO o conteúdo do arquivo `EMAIL_TEMPLATE.html`
2. Verifique se salvou no template correto (**Confirm signup**, não outro)
3. Aguarde alguns minutos e teste novamente

### Problema 3: Link não funciona
**Solução:** Verifique se adicionou a URL de callback nas **Redirect URLs** (passo 1.3)

---

## 📸 Como deve ficar

### Site URL Configuration:
```
Site URL: https://simonia.seubone.com

Redirect URLs:
  • https://simonia.seubone.com/auth/callback
  • http://localhost:5051/auth/callback
```

### Email Template Subject:
```
Confirme seu email - SimonIA
```

### Email Template Body:
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    ...
</head>
...
</html>
```
(Todo o conteúdo de EMAIL_TEMPLATE.html)

---

## ⏱️ Tempo estimado: 5 minutos

1. ✅ Configurar Site URL: 1 minuto
2. ✅ Adicionar Redirect URLs: 1 minuto
3. ✅ Copiar template de email: 2 minutos
4. ✅ Testar: 1 minuto

---

## 🆘 Precisa de ajuda?

Se tiver dúvidas, tire screenshots das telas do Supabase que posso ajudar!

**Links úteis:**
- Supabase Dashboard: https://app.supabase.com
- Documentação: https://supabase.com/docs/guides/auth/auth-email-templates
