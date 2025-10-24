# JWT Debug Guide

## Quick Start

Se você está tendo problemas de autenticação ("Token inválido", erros 401, WebSocket rejeitado), siga estes passos:

### 1. Acessar a Página de Debug

1. Faça login normalmente
2. Navegue para: `http://localhost:5000/jwt-debug` (ou sua URL)
3. Você verá uma página com informações completas do seu token JWT

### 2. Entender as Informações

A página de debug mostra:

- **Token Status** (✅ ou ❌): Se seu token é válido
- **Expiration** (⏰): Quando o token expira
- **Header**: Algoritmo usado (sempre HS256)
- **Payload**: Dados do usuário (ID, email, role)
- **Signature**: Assinatura criptográfica

### 3. Verificar a Assinatura no jwt.io

Se o token está "inválido", precisamos verificar se o secret match:

1. Na página de debug, clique: **"📋 Copy Full Token"**
2. Abra https://jwt.io em outra aba
3. Cole o token no campo "Encoded"
4. No campo "Secret", cole o JWT_SECRET do seu `.env`:
   ```
   your-super-secret-jwt-key-change-in-production-12345678
   ```
5. **Se vir "Signature Verified"** (verde) → Secret está correto ✅
6. **Se vir "Signature Invalid"** (vermelho) → Secret não bate ❌

### 4. Solucionar Problemas

#### ❌ Signature Invalid (não bate)

**Causa**: O `JWT_SECRET` no servidor mudou desde que o token foi gerado

**Solução**:
1. Na página de debug, clique: **"🚪 Logout & Clear Token"**
2. Faça login novamente
3. Um novo token será gerado com o JWT_SECRET atual
4. Teste novamente no jwt.io

#### ⏰ Token Expirado

**Causa**: Token com mais de 7 dias

**Solução**:
1. Faça logout e login novamente
2. Novo token será gerado

#### ❌ No Token Found

**Causa**: Token não está armazenado no localStorage

**Solução**:
1. Limpe o localStorage: `localStorage.clear()`
2. Faça login novamente

---

## Usando a Página de Debug

### Botões Disponíveis

#### 📋 Copy Full Token
Copia o token completo para a área de transferência. Use para:
- Verificar no jwt.io
- Enviar para o desenvolvedor para debugging
- Testar em APIs

#### 📤 Export Censored Info
Exporta as informações do token com dados sensíveis mascarados (email, ID).
Use para compartilhar sem expor sua identidade.

#### 🔍 Open Browser Console & Run Diagnostics
Abre o console do navegador (F12) e executa um diagnóstico completo.
Mostra:
- Token structure (header, payload, signature)
- Expiration details
- Claims validation
- Suggestions for issues

#### 🚪 Logout & Clear Token
Remove o token do localStorage e desloga você.
Use quando:
- Token está corrompido
- Não conseguir fazer login normalmente
- Precisa forçar regeneração de token

---

## Usando a Página via Console (Avançado)

Se a página de debug não estiver acessível, você pode usar a função de debug direto no console:

### No Browser Console (F12)

```javascript
// Executar diagnóstico completo
import { runDiagnostics } from '/src/utils/jwt-debug.ts'
runDiagnostics()

// Ver informações do token
import { displayJWTInfo } from '/src/utils/jwt-debug.ts'
displayJWTInfo()

// Verificar se token é válido
import { checkTokenValidity } from '/src/utils/jwt-debug.ts'
const { isValid, suggestions } = checkTokenValidity()
console.log({ isValid, suggestions })
```

### Via cURL (testar servidor)

```bash
# Enviar token para o servidor verificar
curl -X POST http://localhost:5051/api/debug/jwt \
  -H "Content-Type: application/json" \
  -d '{"token":"seu-token-aqui"}'

# Resposta mostrará:
# - verification: Se o token é válido
# - decoded: Dados decodificados do token
# - structure: Informações sobre estrutura
```

---

## Entendendo os Erros

### "Signature Verified" Vermelho no jwt.io

**Significa**: O JWT_SECRET que você usou não é o mesmo que foi usado para assinar o token

**Causas possíveis**:
1. Você copiou o secret errado do `.env`
2. O server reiniciou com um JWT_SECRET diferente
3. Há espaços extras antes/depois do secret

**Solução**:
- Verificar o `.env` exatamente:
  ```bash
  grep JWT_SECRET .env
  ```
- Copiar o valor exato (sem espaços)
- Testar novamente no jwt.io

### "Signature Verified" Verde mas Ainda Recebe 401

**Significa**: A assinatura está correta, mas o servidor pode estar usando outro problema

**Causas possíveis**:
1. Token expirou
2. Servidor e cliente usando JWT_SECRET diferente em tempo de runtime
3. Problema na validação do lado do servidor

**Solução**:
1. Verifique a expiração (mostra no jwt.io ou na página de debug)
2. Se expirado, faça logout/login
3. Se não expirado, rode o diagnóstico (F12) e compartilhe com o desenvolvedor

---

## Informações Técnicas

### Localização do JWT no Browser

O token JWT é armazenado em:
```javascript
localStorage.getItem('auth_token')
```

Você pode ver assim no console:
```javascript
console.log(localStorage.getItem('auth_token'))
```

### Estrutura do JWT

Um JWT tem 3 partes separadas por pontos:

```
header.payload.signature

Exemplo:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJpZCI6IjEyMyIsImVtYWlsIjoiem9lQGV4YW1wbGUuY29tIn0.
KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30
```

1. **Header**: `eyJ...` = `{"alg":"HS256","typ":"JWT"}`
2. **Payload**: `eyJ...` = `{"id":"123","email":"zoe@example.com"}`
3. **Signature**: `KMU...` = Hash HMAC-SHA256(header.payload, secret)

### Por que a Assinatura Importa

A assinatura garante que:
- O token não foi modificado
- O servidor que recebe o token pode verificá-lo
- Apenas quem conhece o `JWT_SECRET` pode criar tokens válidos

Se o `JWT_SECRET` mudar:
- Tokens antigos se tornam inválidos
- Novos tokens podem ser criados com o novo secret
- Cliente e servidor precisam usar o MESMO secret

---

## Checklist de Troubleshooting

- [ ] Token aparece na página de debug?
  - ❌ Não → Token não está salvo. Faça login novamente

- [ ] Signature verificou no jwt.io?
  - ❌ Não → Secret não bate. Verifique o `.env` exatamente
  - ✅ Sim → Continuar

- [ ] Token está expirado?
  - ✅ Sim → Logout e login novamente
  - ❌ Não → Continuar

- [ ] Ainda recebe erro 401?
  - Execute `/api/debug/jwt` via curl (veja acima)
  - Compartilhe a resposta com desenvolvedor
  - Copie logs do console (F12)

---

## Arquivos Relacionados

- [client/src/utils/jwt-debug.ts](../client/src/utils/jwt-debug.ts) - Utilitários de debug
- [client/src/pages/jwt-debug.tsx](../client/src/pages/jwt-debug.tsx) - Página de debug
- [server/utils/jwt-debug.ts](../server/utils/jwt-debug.ts) - Verificação no servidor
- [server/middleware/auth.ts](../server/middleware/auth.ts) - Lógica de autenticação
- [JWT_TOKEN_TROUBLESHOOTING.md](./JWT_TOKEN_TROUBLESHOOTING.md) - Guia mais técnico

---

## Suporte

Se o problema persistir após seguir este guia:

1. Execute o diagnóstico (🔍 button na página)
2. Copie a saída do console (F12 → Console)
3. Abra um issue no repositório com:
   - A saída do diagnóstico (CENSURADA)
   - Logs de erro relevantes
   - Descrição do que você estava fazendo
