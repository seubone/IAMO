# Documentação - Token JWT & Resolução de Erros

## 🎯 Para Usuários - Rápido & Simples

Se você está recebendo erro **"Token inválido"** ou **"401"**:

### ⚡ Solução em 3 Passos (2 minutos)

1. **Faça login novamente**
   ```
   Sair → Login com suas credenciais
   ```

2. **Se não funcionar**, vá para: `http://localhost:5000/jwt-debug`
   - Clique em **"🚪 Logout & Clear Token"**
   - Faça login novamente

3. **Ainda não funciona?**
   - Abra DevTools (F12)
   - Vá para Console
   - Clique no botão **"🔍 Run Diagnostics"** na página de debug
   - Compartilhe a mensagem de erro com o desenvolvedor

**Documentação completa**: [JWT_QUICK_FIX.md](./JWT_QUICK_FIX.md)

---

## 🔍 Para Desenvolvedores - Debug Técnico

### Compreender o Problema

O erro **"Token inválido"** acontece quando:
- ❌ Servidor reiniciou com um `JWT_SECRET` diferente
- ❌ Token expirou (válido por 7 dias)
- ❌ Token foi corrompido

### Ferramentas de Debug

1. **Página Web** (`/jwt-debug`)
   - Inspeciona o token visualmente
   - Mostra expiração e claims
   - Permite copiar e testar no jwt.io

2. **Console Browser** (F12)
   ```javascript
   // Ver token atual
   localStorage.getItem('auth_token')

   // Rodar diagnóstico
   import { runDiagnostics } from '/src/utils/jwt-debug.ts'
   runDiagnostics()
   ```

3. **Endpoint do Servidor**
   ```bash
   curl -X POST http://localhost:5051/api/debug/jwt \
     -H "Content-Type: application/json" \
     -d '{"token":"seu-token-aqui"}'
   ```

4. **jwt.io (Verificação Visual)**
   - Vá para https://jwt.io
   - Cole o token
   - Cole o JWT_SECRET do `.env`
   - Se "Signature Verified" ficar verde = Token válido

### Fluxo de Diagnóstico

```
Recebeu erro 401?
    ↓
Vá para /jwt-debug
    ↓
Copie o token
    ↓
Cole em jwt.io com JWT_SECRET
    ↓
    ├─→ ✅ Signature Verified (Verde)
    │   └─→ Problema está no .env ou servidor
    │       → Reinicie o servidor
    │       → Verifique JWT_SECRET
    │
    └─→ ❌ Signature Invalid (Vermelho)
        └─→ Secret não bate
            → Logout + Login = novo token
            → Teste novamente
```

**Documentação completa**: [JWT_DEBUG_GUIDE.md](./JWT_DEBUG_GUIDE.md)

---

## 📚 Documentação Completa

### Para Usuários Finais (Ordenado por complexidade)
1. **[JWT_QUICK_FIX.md](./JWT_QUICK_FIX.md)** ← Comece aqui!
   - 3 passos simples
   - Tabela de problemas/soluções
   - Dicas rápidas

2. **[JWT_DEBUG_GUIDE.md](./JWT_DEBUG_GUIDE.md)**
   - Guia passo-a-passo mais detalhado
   - Exemplos com screenshots
   - Explicação de cada seção

### Para Desenvolvedores (Técnico)
1. **[JWT_TOKEN_TROUBLESHOOTING.md](./JWT_TOKEN_TROUBLESHOOTING.md)**
   - Análise raiz do problema
   - Como os tokens funcionam
   - Implementação técnica
   - Configuração de segurança

2. **[JWT_DIAGNOSIS_FLOWCHART.md](./JWT_DIAGNOSIS_FLOWCHART.md)**
   - Árvores de decisão visuais
   - Matrizes de diagnóstico
   - Fluxogramas de validação
   - Cartões de referência rápida

3. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)**
   - O que foi implementado
   - Por que foi implementado
   - Arquivos modificados
   - Notas de deployment

### Referência Rápida
- **[JWT_CHEATSHEET.md](./JWT_CHEATSHEET.md)**
  - Comandos do console
  - URLs importantes
  - Estrutura do token
  - Checklist de troubleshooting

---

## 🎯 Mapa de Navegação

```
Você está tendo problemas de autenticação?
│
├─→ 👤 Sou usuário final
│   └─→ [JWT_QUICK_FIX.md]
│       ↓
│       Se não resolver
│       ↓
│       [JWT_DEBUG_GUIDE.md]
│
└─→ 👨‍💻 Sou desenvolvedor
    ├─→ Preciso debugar rápido
    │   └─→ [JWT_CHEATSHEET.md]
    │
    ├─→ Preciso entender o problema
    │   └─→ [JWT_TOKEN_TROUBLESHOOTING.md]
    │
    ├─→ Preciso de fluxogramas
    │   └─→ [JWT_DIAGNOSIS_FLOWCHART.md]
    │
    └─→ Preciso saber o que mudou
        └─→ [IMPLEMENTATION_SUMMARY.md]
```

---

## 🔑 Conceitos-Chave

### O que é JWT?
- **JWT** = JSON Web Token
- Formato padrão para tokens de autenticação
- Consiste em 3 partes: `header.payload.signature`
- Assinado com `JWT_SECRET` para garantir autenticidade

### Por que o erro acontece?
```
JWT_SECRET no servidor mudou
    ↓
Token antigo não pode ser verificado
    ↓
Servidor retorna 401 "Token inválido"
    ↓
(ANTES) Usuário vê múltiplos erros 401
(AGORA) Sistema faz logout automático
```

### Como foi corrigido?

| Antes | Depois |
|-------|--------|
| Cascata de 401s | Auto-logout na primeira falha |
| Sem feedback | Mensagens claras no console |
| Difícil debugar | Ferramenta visual de debug |
| Token não era verificado | Validação automática |

---

## 🚀 Novo Fluxo (Automático)

```
❌ Token inválido recebido
    ↓
🔍 Detectado automaticamente
    ↓
🧹 Token removido do localStorage
    ↓
👤 Usuário faz logout automático
    ↓
📍 Redirecionado para /login
    ↓
✅ Usuário faz login novamente
    ↓
🆕 Novo token gerado
    ↓
✅ Tudo funciona
```

---

## 🛠️ Ferramentas Disponíveis

### Browser (`/jwt-debug`)
- Token debugger visual
- Botões de ação
- Integração com jwt.io
- Diagnóstico automático

### Console (F12)
```javascript
// Funções disponíveis
import { decodeJWT } from '/src/utils/jwt-debug.ts'
import { runDiagnostics } from '/src/utils/jwt-debug.ts'
import { checkTokenValidity } from '/src/utils/jwt-debug.ts'
```

### Server Endpoint
```
POST /api/debug/jwt
Input: { token: "..." }
Output: { verification, decoded, structure }
```

### Logging Console
```
❌ Unauthorized (401) - Token invalid
⏰ WebSocket rejected: Token expired
🚪 Logging out user
✅ New token generated
```

---

## 📊 Estatísticas da Implementação

### Código Adicionado
- **Client-side**: 2 arquivos novos + 4 modificados
- **Server-side**: 1 arquivo novo + 1 modificado
- **Documentação**: 7 arquivos novos
- **Total**: ~2,000 linhas de código + documentação

### Recursos Implementados
- ✅ Auto-recovery de tokens inválidos
- ✅ WebSocket validation
- ✅ 401 Interceptor
- ✅ Debug page visual
- ✅ Diagnostic console
- ✅ Server verification endpoint
- ✅ Comprehensive documentation

---

## 🎓 Próximos Passos (Futuro)

### Melhorias Planejadas
1. **Token Refresh**: Renovar token automaticamente antes de expirar
2. **HttpOnly Cookies**: Mais seguro que localStorage
3. **Rate Limiting**: Limitar tentativas de login
4. **Token Rotation**: Gerar novo token a cada requisição
5. **Audit Logging**: Registrar todas as tentativas de autenticação

### Configuração de Produção
1. Mudar JWT_SECRET para valor único e seguro
2. Usar HTTPS obrigatório
3. Implementar CORS restritivo
4. Desabilitar `/api/debug/jwt` endpoint
5. Monitorar falhas de autenticação

---

## 📞 Suporte

### Para Usuários
1. Comece com [JWT_QUICK_FIX.md](./JWT_QUICK_FIX.md)
2. Se não resolver, siga [JWT_DEBUG_GUIDE.md](./JWT_DEBUG_GUIDE.md)
3. Execute o diagnóstico e compartilhe com desenvolvedor

### Para Desenvolvedores
1. Consulte [JWT_CHEATSHEET.md](./JWT_CHEATSHEET.md) para comandos
2. Use [JWT_DIAGNOSIS_FLOWCHART.md](./JWT_DIAGNOSIS_FLOWCHART.md) para fluxo
3. Verifique [JWT_TOKEN_TROUBLESHOOTING.md](./JWT_TOKEN_TROUBLESHOOTING.md) para técnico

### Troubleshooting Rápido
```bash
# Ver token
F12 → Console → localStorage.getItem('auth_token')

# Limpar tudo
F12 → Console → localStorage.clear()

# Debugar no servidor
grep JWT_SECRET .env
npm run dev
```

---

## ✨ Destaques

### Antes da Implementação
```
🔴 Múltiplos erros 401 cascata
🔴 Sem feedback ao usuário
🔴 Difícil diagnosticar
🔴 WebSocket fica tentar conectar
```

### Depois da Implementação
```
✅ Auto-logout na primeira falha
✅ Mensagens claras no console
✅ Ferramenta visual de debug
✅ Auto-redirecionamento para login
✅ Diagnóstico automático
```

---

## 🎉 Conclusão

O sistema de autenticação JWT agora é:
- **Robusto**: Auto-recovery de falhas
- **Transparente**: Feedback claro ao usuário
- **Debugável**: Ferramentas para diagnóstico
- **Seguro**: Validação em múltiplas camadas
- **Documentado**: Guias para todos os níveis

**Comece aqui**: [JWT_QUICK_FIX.md](./JWT_QUICK_FIX.md)

**Dúvidas técnicas**: [JWT_TOKEN_TROUBLESHOOTING.md](./JWT_TOKEN_TROUBLESHOOTING.md)

**Referência rápida**: [JWT_CHEATSHEET.md](./JWT_CHEATSHEET.md)

---

*Última atualização: 2024*
*Documentação: Completa & Atualizada*
*Status: ✅ Implementado e Testado*
