# 🔍 Análise de Erros no Console

## 📊 Resumo dos Problemas Identificados

Baseado nas screenshots do console, identifiquei **32 erros principais**:

### Categorização dos Erros:

| Tipo | Quantidade | Severidade | Status |
|------|-----------|-----------|--------|
| **503 Service Unavailable** | ~10-15 | 🔴 CRÍTICO | Falha no servidor backend |
| **500 Internal Server Error** | ~10-15 | 🔴 CRÍTICO | Erro no processamento |
| **404 Not Found** | ~2-5 | 🟡 ALTO | Endpoint não existe ou recurso não encontrado |
| **WebSocket Errors** | ~2-3 | 🔴 CRÍTICO | Conexão WebSocket falhando |
| **Media Load Failures** | ~2-3 | 🟡 MÉDIO | Falha ao carregar mídia |

---

## 🔴 CRÍTICO - Erros 503 Service Unavailable

### Endpoints Afetados:
```
❌ GET /api/whatsapp/instances/678712b6
❌ GET /api/whatsapp/instances/d_231t0rx5p427dnaum:1
❌ GET /api/ai-data/instance/b40c-776c3a8f753c
```

**O que significa:** O servidor backend está retornando 503, indicando que está sobrecarregado ou não está respondendo.

**Causa provável:**
1. Backend não está rodando corretamente
2. Banco de dados não está acessível
3. Servidor está travado ou fora de memória

**Solução:**

```bash
# Verifique se o backend está rodando
netstat -ano | findstr "5049"

# Se não estiver, reinicie:
npm run dev:server

# Ou verifique os logs:
npm run dev:server 2>&1 | head -100
```

---

## 🔴 CRÍTICO - Erros 500 Internal Server Error

### Padrão Observado:
```
❌ GET http://localhost:5051/api/whatsapp/instances/678712b6
500 (Internal Server Error)

❌ GET http://localhost:5051/api/ai-data/instance/b40c-776c3a8f753c
500 (Internal Server Error)
```

**O que significa:** O servidor está tentando processar a requisição mas alguma coisa deu errado internamente.

**Causas possíveis:**
1. Erro na query do banco de dados
2. Middleware retornando erro
3. Permissão insuficiente
4. Validação de schema falhando

**Debug:**

Abra o terminal onde está rodando o backend e procure por mensagens de erro:

```bash
# Veja os logs do servidor
npm run dev:server 2>&1 | grep -i "error\|err\|fail"
```

---

## 🟡 ALTO - Erros 404 Not Found

### Endpoints Não Encontrados:
```
❌ GET /api/ai-data/instance/b40c-776c3a8f753c
❌ GET /api/ai-data/instance/[id]
```

**O que significa:** O frontend está tentando acessar um endpoint que não existe ou um recurso com ID que não está registrado.

**Possível causa:**
- IA ou Instância foi deletada do banco
- ID está quebrado ou incorreto
- Rota não foi registrada no backend

**Solução:**

Verifique se a rota existe em `server/routes.ts`:

```bash
grep -n "ai-data" server/routes.ts
```

Se não encontrar, pode ser que a rota não foi registrada corretamente.

---

## 🔴 CRÍTICO - WebSocket Errors

### Erro Observado:
```
WebSocket error: Event {isTrusted: true, type: 'error', target: WebSocket, ...}
WebSocket connection to 'ws://...' failed
```

**O que significa:** A conexão WebSocket para comunicação em tempo real falhou.

**Causas:**
1. Backend não está com suporte a WebSocket
2. Porta WebSocket não está aberta
3. Proxy não está permitindo WebSocket

**Verificação:**

```bash
# Verifique se há listeners WebSocket no backend
grep -r "ws:\|websocket\|WebSocket" server --include="*.ts" | head -20
```

**Solução:**

Se o backend não tem WebSocket, você pode desabilitar no frontend:

Arquivo: `client/src/hooks/use-websocket.ts`

```typescript
// Adicione try-catch para evitar crashes:
try {
  // WebSocket logic
} catch (error) {
  console.warn("WebSocket unavailable, falling back to polling");
}
```

---

## 🟡 MÉDIO - Media Load Failures (503)

### Erro Observado:
```
❌ Failed to /api/whatsapp/media/d_231t0rx5p427dnaum:1
503 (Service Unavailable)
```

**O que significa:** Falha ao carregar mídia do WhatsApp via servidor.

**Possível causa:**
- Servidor não consegue acessar Evolution API
- Serviço de mídia está indisponível

---

## 📋 Checklist de Diagnóstico

### 1️⃣ Verificar Backend
```bash
# Terminal 1 - Verifique se está rodando
npm run dev:server

# Terminal 2 - Teste a conexão
curl -X GET http://localhost:5049/api/health

# Se não existe endpoint de health, crie um:
```

### 2️⃣ Verificar Banco de Dados
```bash
# Verifique conexão
psql postgresql://usuario:senha@host:5432/database

# Se não conectar, o backend vai retornar 503
```

### 3️⃣ Verificar Permissões
```bash
# Veja no console do backend qual é o erro exato
npm run dev:server 2>&1 | tail -50
```

### 4️⃣ Limpar Cache do Frontend
```
Ctrl + Shift + Delete → Limpar dados de navegação
Atualizar página: Ctrl + F5
```

---

## 🔧 Soluções Recomendadas

### Problema 1: Backend Retornando 503/500

**Passo 1:** Reinicie o backend
```bash
npm run dev:server
```

**Passo 2:** Verifique os logs
```bash
npm run dev:server 2>&1 | head -100
```

**Passo 3:** Se continuar falhando, verifique o banco:
```bash
# PostgreSQL rodando?
psql -U postgres -d monitor_ia -c "SELECT 1;"
```

---

### Problema 2: WebSocket Falhando

**Opção A:** Se o backend suporta WebSocket
```bash
# WebSocket geralmente está na mesma porta (5049)
# Verifique se há erro de conexão nos logs
```

**Opção B:** Se não suporta, desabilite no frontend

Arquivo: `client/src/hooks/use-websocket.ts`
```typescript
export function useWebSocket() {
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${window.location.host}/api/ws`;

        const ws = new WebSocket(wsUrl);
        // ... resto do código
      } catch (error) {
        console.warn("WebSocket not available", error);
        // Continuar sem WebSocket (polling vai ser usado)
      }
    };
  }, []);
}
```

---

### Problema 3: Endpoints 404 Não Encontrados

**Causa comum:** ID incorreto ou recurso deletado

**Solução:**
```typescript
// No frontend, valide antes de fazer requisição:
if (!instanceId || instanceId === 'undefined') {
  console.warn("Invalid instance ID");
  return;
}

// Faça a requisição
const response = await fetch(`/api/ai-data/instance/${instanceId}`);
```

---

## 🎯 Ações Prioritárias

### 🔴 **CRÍTICO** - Deve corrigir AGORA:

1. ❌ **Backend retorna 503** → Reinicie `npm run dev:server`
2. ❌ **WebSocket falhando** → Verifique logs do backend
3. ❌ **Erros 500** → Veja os logs de erro exato

### 🟡 **ALTO** - Deve corrigir em seguida:

4. 🔧 **404 Not Found** → Valide IDs no frontend
5. 🔧 **Media failing** → Verifique Evolution API

### 🟢 **BAIXO** - Pode corrigir depois:

6. 📝 **Adicionar melhor tratamento de erro**
7. 📝 **Implementar retry automático**

---

## 🧪 Script de Validação

Crie um script para testar todos os endpoints:

```bash
#!/bin/bash

echo "🔍 Testando Conectividade..."

# 1. Backend rodando?
echo -n "Backend (5049): "
curl -s http://localhost:5049 -o /dev/null && echo "✅" || echo "❌"

# 2. Frontend rodando?
echo -n "Frontend (5051): "
curl -s http://localhost:5051 -o /dev/null && echo "✅" || echo "❌"

# 3. Banco de dados?
echo -n "Database: "
psql -U postgres -d monitor_ia -c "SELECT 1;" 2>/dev/null && echo "✅" || echo "❌"

# 4. Testar endpoint
echo ""
echo "🧪 Testando Endpoints..."
curl -X GET http://localhost:5049/api/auth/me \
  -H "Authorization: Bearer seu_token" 2>/dev/null | jq .
```

---

## 📝 Próximos Passos

1. **Verifique o terminal onde está rodando `npm run dev:server`**
   - Há mensagens de erro?
   - Está realmente rodando?

2. **Limpe cache e recarregue a página**
   - Ctrl + Shift + Delete
   - Ctrl + F5

3. **Se ainda tiver erros, cole aqui:**
   - Screenshot do console com os ÚLTIMOS erros
   - Logs do backend (últimas 50 linhas)

4. **Depois faremos review com Playwright**
   - Quando os 503/500 forem resolvidos

---

## 📞 Debug Rápido

Se está com pressa, use este comando para ver todos os erros:

```bash
# Terminal onde o backend está rodando:
npm run dev:server 2>&1 | grep -A 5 "ERROR\|error\|fail\|Failed"
```

Isso vai mostrar o erro EXATO que está acontecendo no backend!

