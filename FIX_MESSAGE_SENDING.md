# 🔧 Solução: Problema com Envio de Mensagens

## 📌 Resumo Executivo

**Problema**: Você está recebendo erro ao tentar enviar mensagens
**Causa Raiz**: Token de autenticação expirado
**Solução**: Fazer login novamente ou implementar auto-refresh de token (já feito)

---

## 🎯 Solução Rápida

### Para o Usuário

Simplesmente **faça login novamente**:

1. Acesse `http://localhost:5051`
2. Se estiver logado, clique em **Logout** (canto superior direito)
3. Faça login com suas credenciais
4. Pronto! Você agora consegue enviar mensagens

**Por quê?** Quando você faz login, um novo token é gerado e armazenado no navegador. Este token é necessário para enviar mensagens.

---

## 🛠️ Solução Implementada no Código

### O que foi feito:

#### 1. **Criado novo hook: `use-token-refresh.ts`**

Arquivo: `client/src/hooks/use-token-refresh.ts`

Este hook automaticamente:
- ✅ Monitora a expiração do token Supabase
- ✅ Atualiza o token 5 minutos antes de expirar
- ✅ Evita que o usuário seja desconectado abruptamente
- ✅ Mantém o usuário logado continuamente

**Como funciona:**

```typescript
// 1. Obtém sessão atual
const session = await supabase.auth.getSession();

// 2. Calcula tempo até expiração
const expiresIn = session.expires_at * 1000 - Date.now();

// 3. Agenda refresh 5 minutos antes (buffer de segurança)
const refreshTime = Math.max(expiresIn - 5 * 60 * 1000, 1000);

// 4. Executa refresh nesse horário
setTimeout(() => {
  supabase.auth.refreshSession(); // 🔄 Novo token
}, refreshTime);
```

#### 2. **Integrado ao App.tsx**

Arquivo: `client/src/App.tsx` (linha 39)

```typescript
function ProtectedRoutes() {
  useWebSocket();
  useTokenRefresh(); // ← Novo! Auto-refresh de token

  // ... resto do código
}
```

### Benefícios:

| Antes | Depois |
|-------|--------|
| ❌ Token expira após ~1 hora | ✅ Token atualizado automaticamente |
| ❌ Usuário recebe erro 401 | ✅ Usuário não vê nenhum erro |
| ❌ Desconexão abrupt | ✅ Sessão contínua |
| ❌ Precisa fazer login novamente | ✅ Permanece logado |

---

## 🔍 Por que o Problema Ocorreu?

### Fluxo de Erro Anterior:

```
1. Usuário tenta enviar mensagem
   ↓
2. Frontend envia POST /api/messages com token expirado
   ↓
3. Backend retorna: 401 Unauthorized
   ↓
4. Frontend detecta 401 e executa:
   - localStorage.removeItem("auth_token")
   - localStorage.removeItem("auth-storage")
   - window.location.href = "/login"
   ↓
5. Usuário é redirecionado para login (perdendo contexto)
```

**Código que fazia isso:**

Arquivo: `client/src/lib/queryClient.ts` (linhas 16-24)

```typescript
if (res.status === 401) {
  console.warn("❌ Unauthorized (401) - Token may be expired or invalid...");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth-storage");

  setTimeout(() => {
    window.location.href = "/login"; // ← Redirecionamento
  }, 500);
}
```

### Novo Fluxo (com auto-refresh):

```
1. Token vai expirar em 55 minutos
   ↓
2. Hook detecta isso (50 minutos antes)
   ↓
3. Faz refresh automático do token
   ↓
4. Armazena novo token no localStorage
   ↓
5. Usuário continua com token válido
   ↓
6. Pode enviar mensagens normalmente
```

---

## 📊 Análise Técnica

### Token Supabase

**Estrutura:**
```
Header.Payload.Signature
```

**Exemplo de Payload:**
```json
{
  "iss": "https://svfucusuhnwmwyojmxgr.supabase.co/auth/v1",
  "sub": "f2bdf594-a7ef-4c79-85b9-cfc40807aad2",
  "aud": "authenticated",
  "exp": 1761681650,  ← Horário de expiração (Unix timestamp)
  "iat": 1761678050,  ← Horário de emissão
  "email": "contato.cainandesign@gmail.com",
  "role": "authenticated"
}
```

**Duração típica:** ~1 hora (3600 segundos)

### Como Verificar Expiração:

```javascript
// Decodificar JWT (sem verificação - apenas para debug)
const payload = JSON.parse(
  atob(token.split('.')[1])
);
const expiresAt = new Date(payload.exp * 1000);
console.log("Token expira em:", expiresAt);
```

---

## ✅ Testes

### Verificar se está funcionando:

1. **Abra o DevTools** (F12)
2. **Aba Console** → Veja se aparece:
   ```
   🔄 Token refresh scheduled in 55.0 minutes
   🔄 Attempting to refresh token...
   ✅ Token refreshed successfully!
   ```

3. **Aba Network** → Monitore requisições
   - Veja se nenhuma retorna **401**
   - Veja se mensagens retornam **201** (criada com sucesso)

### Script de Teste Manual:

Se quiser testar sem interface gráfica:

```bash
# Com login via script
node test-auth-and-messages.mjs

# Com token manual
node test-message-sending.mjs
```

---

## 🚀 Próximas Melhorias

Se quiser melhorar ainda mais:

### 1. **Implementar Token Refresh Automático no Servidor**

Criar endpoint de refresh:
```typescript
app.post("/api/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  const newToken = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });
  res.json({ token: newToken });
});
```

### 2. **Aumentar Duração do Token**

Em `server/middleware/auth.ts`:
```typescript
export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" } // ← Aumentar para 7 dias
  );
}
```

### 3. **Implementar Silent Refresh**

Fazer refresh em background sem incomodar o usuário:
```typescript
// Já implementado em use-token-refresh.ts
// Não redireciona, apenas atualiza token
```

---

## 📋 Checklist de Implementação

- [x] Criar hook `use-token-refresh.ts`
- [x] Integrar em `App.tsx`
- [x] Criar documentação de diagnóstico
- [x] Criar script de teste
- [ ] Configurar logging centralizado
- [ ] Implementar sentry para erros de auth
- [ ] Adicionar retry automático em requests 401

---

## 🎓 Lições Aprendidas

1. **JWT tem expiração** - Sempre gerenciar refresh
2. **401 não é erro do usuário** - É erro de autenticação (transparente)
3. **Supabase auth precisa de refresh** - Tokens não têm duração infinita
4. **Hooks React são ideais** para lógica de background
5. **Sempre avisar o usuário antes de redirecionar**

---

## 📞 Suporte

Se o problema persistir depois de fazer login:

1. **Limpar cache do navegador**
   - Ctrl + Shift + Delete → Limpar dados
   - Atualizar página (Ctrl + F5)

2. **Verificar servidor**
   - Backend está rodando? `npm run dev:server`
   - Frontend está rodando? `npm run dev`
   - Ambas as portas (5049, 5051) estão livres?

3. **Verificar Supabase**
   - URL válida? (de `/api/config/public`)
   - Chave anon válida?
   - Usuário existe no Supabase?

4. **Debug avançado**
   - Abra DevTools (F12)
   - Vá em aba Network
   - Tente enviar mensagem
   - Veja qual é a resposta de erro exata

---

## 📚 Referências

- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- JWT Explicado: https://jwt.io
- React Hooks: https://react.dev/reference/react/useEffect

---

**Status**: ✅ Problema Diagnosticado e Corrigido
**Data**: 2025-11-25
**Tempo de Resolução**: Imediato após login

