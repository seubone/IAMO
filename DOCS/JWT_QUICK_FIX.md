# JWT - Quick Fix Guide

## 🚨 Problema: Token Inválido / Erro 401 / WebSocket Rejeitado

### ⚡ Solução em 3 Passos

#### Passo 1: Acessar Debug
```
1. Login normalmente
2. Vá para: http://localhost:5000/jwt-debug
3. Veja as informações do seu token
```

#### Passo 2: Verificar Secret
```
1. Clique "Copy Full Token"
2. Abra: https://jwt.io
3. Cole o token
4. No campo "Secret" cole exatamente:
   your-super-secret-jwt-key-change-in-production-12345678
5. Procure por "Signature Verified" (verde ou vermelho?)
```

#### Passo 3: Agir
```
✅ Verde (Verified):
  → Token está correto
  → Problema resolvido!

❌ Vermelho (Invalid):
  → Secret não bate
  → Clique "🚪 Logout & Clear Token"
  → Faça login novamente
  → Novo token será gerado
  → Teste novamente
```

---

## 🔍 Se Ainda Não Funcionar

### Console Diagnostic
Abra DevTools (F12) e execute:
```javascript
localStorage.getItem('auth_token')
// Se mostrar um token longo, copie e teste no jwt.io

localStorage.clear()
// Se o token estiver corrompido, limpe tudo
```

### Servidor Check
Via terminal:
```bash
# Verifique o JWT_SECRET correto
grep JWT_SECRET .env

# Reinicie o servidor se mudou o .env
npm run dev
```

---

## 🎯 Possíveis Causas

| Problema | Solução |
|----------|---------|
| ❌ Signature Invalid no jwt.io | Verifique JWT_SECRET no `.env` é exatamente igual |
| ⏰ Token expirado | Logout + Login = novo token |
| 🔌 WebSocket rejeitado | Mesmo que signature invalid |
| 📦 No token in localStorage | Faça login novamente |
| 🔄 Múltiplos erros 401 | Agora é automático = logout e redireciona para login |

---

## 📁 Arquivos Importantes

```
.env                                    ← JWT_SECRET aqui
client/src/pages/jwt-debug.tsx          ← Página de debug UI
client/src/utils/jwt-debug.ts           ← Funções de debug
server/utils/jwt-debug.ts               ← Verificação servidor
DOCS/JWT_DEBUG_GUIDE.md                 ← Guia completo
DOCS/JWT_TOKEN_TROUBLESHOOTING.md       ← Técnico detalhado
```

---

## 💡 Pro Tips

- **Bookmark jwt.io**: Você vai usar muito
- **DevTools F12**: Seu melhor amigo para debug
- **Share censored token**: Use "📤 Export Censored Info" button
- **Browser console**: F12 → Console → Cole `localStorage.getItem('auth_token')`

---

## ✅ Verificação Final

Se tudo está funcionando:

```
✅ Pode fazer login
✅ Pode acessar páginas
✅ WebSocket está conectado (console: "🔌 WebSocket connected")
✅ Nenhum erro 401 nos logs

🎉 Tudo funciona!
```
