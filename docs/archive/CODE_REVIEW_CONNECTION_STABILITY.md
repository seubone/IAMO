# Code Review: Connection Stability Issues - Análise Detalhada

**Data:** 2025-11-20
**Versão:** v1.0.33
**Autor:** Code Review Automático
**Status:** CRÍTICO - Instâncias caindo frequentemente

---

## SUMÁRIO EXECUTIVO

### Problema Identificado
As instâncias WhatsApp estão caindo frequentemente porque:
1. **Sem reconexão automática** no frontend (problema CRÍTICO)
2. **Sem heartbeat/keepalive** para detectar conexões mortas
3. **Token expira** sem refresh automático
4. **Pool de conexão** não tem health checks
5. **Dependência de polling** (2s) ao invés de real-time

### Impacto
- ❌ Usuários perdem conexão com WebSocket
- ❌ Mensagens atrasam até 2 segundos
- ❌ Instâncias aparecem como desconectadas
- ❌ Sem recuperação automática após queda

### Severidade
🔴 **CRÍTICO** - Afeta funcionalidade principal do app

---

## PARTE 1: FRONTEND - Client Connection Issues

### 📁 Arquivo: `client/src/hooks/use-websocket.ts`

#### ❌ PROBLEMA 1: Sem Reconexão Automática (CRÍTICO)

**Linhas:** 47-244

**Situação Atual:**
```typescript
// Apenas cria conexão UMA VEZ
useEffect(() => {
  const token = localStorage.getItem("auth_token");
  if (!token) return;

  const ws = new WebSocket(wsUrl);
  ws.onopen = () => { /* ... */ };
  ws.onclose = () => { /* desconecta e pronto */ };
}, []); // ← Executa apenas 1 vez no mount
```

**Por que é problema:**
- Se a conexão cair, o cliente NÃO tenta reconectar
- Usuário fica sem receber atualizações em real-time
- Dependência 100% de polling cada 2 segundos

**Impacto:**
- 🔴 Usuário vê instâncias como "desconectadas" quando na verdade é só o WebSocket
- 🔴 Mensagens atrasam para até 2 segundos
- 🔴 Sistema parece instável

**Solução Necessária:**
```typescript
// Implementar reconexão com backoff exponencial
const reconnect = useCallback(() => {
  if (reconnectAttemptsRef.current > 5) {
    console.error("Max reconnection attempts reached");
    return;
  }

  reconnectAttemptsRef.current++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

  setTimeout(() => {
    console.log(`Tentando reconectar... (tentativa ${reconnectAttemptsRef.current})`);
    connectWebSocket();
  }, delay);
}, []);

ws.onclose = () => {
  setIsConnected(false);
  reconnect(); // ← Reconecta após desconectar
};
```

---

#### ❌ PROBLEMA 2: Sem Heartbeat/Keep-Alive (MÉDIO)

**Linhas:** 47-244 (não implementado)

**Situação Atual:**
```
Frontend (idle) ←→ [conexão TCP] ←→ Backend
                                  (pode estar morta)

Cliente não sabe que conexão está morta até:
- Tentar enviar mensagem (falha)
- Backend enviar dados (erro na escrita)
- Firewall encerrar connection (timeout >15-30min)
```

**Por que é problema:**
- Conexão pode estar tecnicamente "aberta" mas não funcional
- Latência de detecção pode ser de MINUTOS
- Usuário fica esperando mensagens que nunca chegam

**Impacto:**
- 🟡 Detecção lenta de conexões mortas
- 🟡 Usuário pensa que conectado mas não está

**Solução Necessária:**
```typescript
// Implementar ping-pong a cada 30 segundos
const heartbeatInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ping" }));
  }
}, 30000);

ws.addEventListener("pong", () => {
  lastHeartbeatRef.current = Date.now();
  console.log("✅ Heartbeat recebido");
});

// Detectar falta de heartbeat
const heartbeatCheckInterval = setInterval(() => {
  const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current;
  if (timeSinceLastHeartbeat > 60000) {
    console.error("❌ Heartbeat timeout - encerrando conexão");
    ws.close();
  }
}, 10000);
```

---

#### ❌ PROBLEMA 3: Token Expira Sem Refresh (MÉDIO)

**Linhas:** 48-56

**Situação Atual:**
```typescript
const token = localStorage.getItem("auth_token");
if (!token) {
  console.log("⚠️ No token available");
  return; // ← Não reconecta se token expirou
}

// Se token expirar enquanto navegando:
// - WebSocket fecha com código 1008 (Policy Violation)
// - Frontend não tenta refresh do token
// - Usuário fica offline
```

**Por que é problema:**
- Tokens JWT normalmente expiram em 24h/7d/etc
- Se expirar enquanto navegando, usuário fica desconectado
- Sem refresh automático

**Impacto:**
- 🟡 Usuário logout inesperado após tempo
- 🟡 Sem transparência/sem aviso

**Solução Necessária:**
```typescript
// Implementar token refresh
const refreshToken = async () => {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.ok) {
      const { token: newToken } = await response.json();
      localStorage.setItem("auth_token", newToken);
      return newToken;
    }
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
};

// Refresh 1 min antes de expirar
const tokenExpiry = parseJwt(token).exp * 1000;
const refreshIn = tokenExpiry - Date.now() - 60000;
setTimeout(refreshToken, refreshIn);
```

---

#### ❌ PROBLEMA 4: Falta de Error Logging para Troubleshooting (MÉDIO)

**Linhas:** 88-221

**Situação Atual:**
```typescript
ws.onmessage = (event) => {
  try {
    const message: WebSocketMessage = JSON.parse(event.data);

    switch (message.type) {
      case "ia_created":
        // ... sem logging detalhado
    }
  } catch (error) {
    console.error("WebSocket error:", error); // ← Muito genérico
  }
};
```

**Por que é problema:**
- Quando erro acontece, informação é insuficiente
- Difícil identificar raiz do problema

**Solução Necessária:**
```typescript
ws.onmessage = (event) => {
  try {
    const message: WebSocketMessage = JSON.parse(event.data);
    console.log(`📨 WS Message: ${message.type}`, message);

    switch (message.type) {
      case "ia_created":
        console.log(`📱 IA criada: ${message.data.id}`);
        // ...
        break;
    }
  } catch (error) {
    console.error("❌ WS Message Error:", {
      rawData: event.data,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
```

---

### 📊 FRONTEND - Estado Resumido

| Aspecto | Status | Severidade |
|---------|--------|-----------|
| Reconexão Automática | ❌ Não existe | 🔴 CRÍTICO |
| Heartbeat/Keep-Alive | ❌ Não existe | 🟡 MÉDIO |
| Token Refresh | ❌ Não existe | 🟡 MÉDIO |
| Error Logging | ⚠️ Básico | 🟡 MÉDIO |
| Message Queuing | ✅ Funciona | 🟢 OK |
| Instance Re-registration | ✅ Funciona | 🟢 OK |

---

## PARTE 2: BACKEND - Server Connection Issues

### 📁 Arquivo: `server/routes.ts`

#### ⚠️ PROBLEMA 1: WebSocket Sem Error Recovery (MÉDIO)

**Linhas:** 83-168

**Situação Atual:**
```typescript
wss.on("connection", (ws, req) => {
  // Valida token
  if (!token) {
    ws.close(1008, "Authentication required");
    return;
  }

  // Se token expirar DEPOIS de conectar:
  // - Nada acontece (servidor não monitora)
  // - Cliente fica conectado indefinidamente
  // - Ou fica desincronizado
});
```

**Por que é problema:**
- Token pode expirar enquanto cliente está conectado
- Servidor não verifica expiração após conexão estabelecida
- Possível acesso não autorizado

**Impacto:**
- 🟡 Sessão fantasma (conectado mas inválido)
- 🟡 Risco de segurança

**Solução Necessária:**
```typescript
wss.on("connection", (ws, req) => {
  const decoded = jwt.verify(token, JWT_SECRET) as any;

  // Revalidar token antes de expirar
  const timeToExpiry = (decoded.exp * 1000) - Date.now();
  const refreshTimeout = setTimeout(() => {
    console.warn(`Token expirando para ${decoded.email} - fechando WS`);
    ws.close(4000, "Token expired");
  }, timeToExpiry - 60000); // 1 min antes de expirar

  ws.on("close", () => {
    clearTimeout(refreshTimeout);
  });
});
```

---

#### ⚠️ PROBLEMA 2: Sem Heartbeat/Keep-Alive (MÉDIO)

**Linhas:** 83-244 (não implementado)

**Situação Atual:**
```typescript
// Servidor apenas recebe mensagens, não envia keep-alive
// Se cliente desconectar abruptamente:
// - Servidor pode não perceber por muito tempo
// - Recurso mantém-se alocado
```

**Por que é problema:**
- Conexões zumbis (cliente saiu, servidor não sabe)
- Desperdício de memória/conexões
- Firewall pode encerrar conexões inativas

**Impacto:**
- 🟡 Memory leak ao longo do tempo
- 🟡 Desempenho degrada

**Solução Necessária:**
```typescript
// Implementar ping-pong no servidor
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws: any) => {
    if (ws.isAlive === false) {
      console.log("Terminando conexão inativa");
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // A cada 30 segundos

ws.on("pong", () => {
  (ws as any).isAlive = true;
});

ws.on("close", () => {
  console.log("Cliente desconectou");
});
```

---

#### ⚠️ PROBLEMA 3: Instâncias Sendo Monitoradas Sem Validação (MÉDIO)

**Linhas:** 113-131

**Situação Atual:**
```typescript
if (message.type === "register_instance") {
  const instanceId = message.instanceId;

  // ❌ Não valida se cliente tem permissão
  // ❌ Não valida se instanceId é válido
  // ❌ Não valida se instância existe

  activeInstances.set(instanceId, new Set());
  activeInstances.get(instanceId)!.add(ws);
}
```

**Por que é problema:**
- Cliente pode monitorar instâncias de OUTROS usuários
- Cliente pode monitorar instâncias inexistentes
- Consumo de memória sem limite

**Impacto:**
- 🔴 Risco de segurança (vazamento de dados)
- 🟡 Memory leak
- 🟡 Performance degrada

**Solução Necessária:**
```typescript
if (message.type === "register_instance") {
  const instanceId = message.instanceId;
  const userId = decoded.userId; // do token

  // Validar permissão
  const instance = await db.query(
    `SELECT owner_id FROM instances WHERE id = $1`,
    [instanceId]
  );

  if (!instance || instance.owner_id !== userId) {
    ws.send(JSON.stringify({
      type: "error",
      message: "Unauthorized to monitor this instance"
    }));
    return;
  }

  // Agora é seguro registrar
  activeInstances.set(instanceId, new Set());
  activeInstances.get(instanceId)!.add(ws);
}
```

---

#### ⚠️ PROBLEMA 4: Polling com Overhead Alto (MÉDIO)

**Linhas:** 354-456

**Situação Atual:**
```typescript
// Polls every 2 seconds por CADA instância ativa
async function pollNewMessages() {
  for (const instanceId of evolutionPool.query(...)) {
    for (const message of await fetchMessages(instanceId)) {
      broadcast(message);
    }
  }
}

setInterval(pollNewMessages, 2000); // ← Muito frequente
```

**Por que é problema:**
- 2 segundos = 30 requisições/minuto/instância
- Com 50 instâncias = 1500 requisições/minuto
- Sobrecarga do servidor e banco

**Impacto:**
- 🟡 Alto uso de CPU
- 🟡 Latência de rede
- 🟡 Database em stress

**Solução Necessária:**
```typescript
// Aumentar intervalo para 5-10 segundos se há poucas mudanças
// Implementar adaptive polling:
const pollNewMessages = async () => {
  let consecutiveEmpty = 0;

  while (true) {
    const messages = await fetchMessages();

    if (messages.length === 0) {
      consecutiveEmpty++;
      // Aumentar delay se sem mensagens
      delay = Math.min(delay * 1.5, 30000);
    } else {
      consecutiveEmpty = 0;
      delay = 2000; // Resetar para 2s se há atividade
    }

    broadcast(messages);
    await sleep(delay);
  }
};
```

---

#### ⚠️ PROBLEMA 5: Pool de Conexão DB Sem Health Checks (MÉDIO)

**Linhas:** Arquivo `server/config/evolution-db.ts` (22-31)

**Situação Atual:**
```typescript
evolutionPoolInstance = new Pool({
  connectionString: evolutionDbUrl,
  max: 10,
  min: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
  statement_timeout: 15000,
  // ❌ Sem health checks
  // ❌ Sem reconnection logic
  // ❌ Sem monitoring
});
```

**Por que é problema:**
- Se conexão com DB cai, pool não tenta recuperar
- Requisições falham
- Sistema fica indisponível

**Impacto:**
- 🟡 Indisponibilidade do serviço
- 🟡 Sem recuperação automática

**Solução Necessária:**
```typescript
// Adicionar health check periódico
const healthCheck = setInterval(async () => {
  try {
    await evolutionPool.query("SELECT 1");
    console.log("✅ DB Health OK");
  } catch (error) {
    console.error("❌ DB Health Check Failed:", error.message);
    // Tentar reconectar
    try {
      evolutionPool.end(); // Encerrar pool antigo
      // Reinicializar pool
    } catch (e) {
      console.error("Error reconnecting pool:", e);
    }
  }
}, 30000); // A cada 30 segundos
```

---

### 📁 Arquivo: `server/routes/instances.routes.ts`

#### ⚠️ PROBLEMA 6: Sem Circuit Breaker para Falhas em Cascata (MÉDIO)

**Linhas:** 223-286

**Situação Atual:**
```typescript
app.get("/api/instances/:instanceId/connection-state",
  authMiddleware,
  async (req, res) => {
    // Se Evolution API está down:
    // - Requisição demora 10-30 segundos
    // - Usuário fica aguardando
    // - Todas as requisições ficam penduradas
    // - Servidor fica sem threads disponíveis
    // - Sistema colapsa
  }
);
```

**Por que é problema:**
- Sem fallback ou timeout rápido
- Cascata de falhas
- Negação de serviço

**Impacto:**
- 🔴 Sistema colapsa se Evolution API cai
- 🔴 Usuários travados aguardando

**Solução Necessária:**
```typescript
// Implementar circuit breaker
const circuitBreaker = {
  failureCount: 0,
  lastFailureTime: null,
  isOpen: false,
  threshold: 5,
  timeout: 60000 // 1 minuto
};

const checkCircuit = () => {
  if (circuitBreaker.isOpen) {
    const timeSinceLast = Date.now() - circuitBreaker.lastFailureTime;
    if (timeSinceLast > circuitBreaker.timeout) {
      console.log("Circuit breaker: Tentando recuperar");
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
    } else {
      throw new Error("Circuit breaker open - service unavailable");
    }
  }
};

app.get("/api/instances/:instanceId/connection-state", async (req, res) => {
  try {
    checkCircuit();

    const state = await fetchInstanceState(req.params.instanceId);
    circuitBreaker.failureCount = 0;
    res.json(state);
  } catch (error) {
    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = Date.now();

    if (circuitBreaker.failureCount >= circuitBreaker.threshold) {
      circuitBreaker.isOpen = true;
      console.error("Circuit breaker: OPEN");
    }

    res.status(503).json({ error: "Service unavailable" });
  }
});
```

---

### 📊 BACKEND - Estado Resumido

| Aspecto | Status | Severidade |
|---------|--------|-----------|
| WebSocket Error Recovery | ⚠️ Básico | 🟡 MÉDIO |
| Heartbeat/Keep-Alive | ❌ Não existe | 🟡 MÉDIO |
| Validação de Instâncias | ❌ Não valida | 🔴 CRÍTICO |
| Polling Overhead | ⚠️ Muito frequente | 🟡 MÉDIO |
| DB Pool Health | ❌ Sem check | 🟡 MÉDIO |
| Circuit Breaker | ❌ Não existe | 🟡 MÉDIO |
| Token Re-validation | ❌ Não valida | 🟡 MÉDIO |

---

## PARTE 3: Recomendações Prioritizadas

### 🔴 CRÍTICO (Implementar HOJE)

1. **Reconexão Automática Frontend**
   - Arquivo: `client/src/hooks/use-websocket.ts`
   - Impacto: Evitar perda completa de conexão
   - Esforço: 2-3 horas

2. **Validação de Permissões Backend**
   - Arquivo: `server/routes.ts` (linhas 113-131)
   - Impacto: Segurança crítica
   - Esforço: 1 hora

### 🟡 MÉDIO (Implementar esta semana)

3. **Heartbeat/Keep-Alive Bidirecional**
   - Frontend + Backend
   - Impacto: Detecção rápida de conexões mortas
   - Esforço: 3-4 horas

4. **Token Refresh Automático**
   - Frontend
   - Impacto: Manter sessão ativa
   - Esforço: 2 horas

5. **Circuit Breaker Pattern**
   - Backend
   - Impacto: Prevenir cascata de falhas
   - Esforço: 2-3 horas

6. **DB Pool Health Checks**
   - Backend
   - Impacto: Recuperação automática de conexão
   - Esforço: 1 hora

### 🟢 BAIXO (Implementar próximo sprint)

7. **Adaptive Polling**
   - Backend
   - Impacto: Reduzir overhead
   - Esforço: 2-3 horas

8. **Enhanced Logging**
   - Frontend + Backend
   - Impacto: Melhor troubleshooting
   - Esforço: 1-2 horas

---

## PARTE 4: Checklist de Implementação

### Quick Wins (< 1 hora cada)

- [ ] Adicionar validação de permissão em `register_instance`
- [ ] Adicionar DB pool health check a cada 30s
- [ ] Aumentar timeout de polling de 2s para 5-10s
- [ ] Adicionar logging detalhado em handlers WebSocket

### Implementação Média (1-3 horas cada)

- [ ] Implementar reconexão automática com backoff exponencial
- [ ] Implementar token refresh antes de expiração
- [ ] Implementar circuit breaker para APIs externas
- [ ] Adicionar heartbeat/pong bidirecional

### Refatoração Maior (> 3 horas)

- [ ] Implementar event emitter robusto (Socket.IO?)
- [ ] Adicionar métricas de saúde da conexão
- [ ] Implementar rate limiting
- [ ] Adicionar monitoring/alertas

---

## Conclusão

**Status Atual:** 🔴 Instável
**Razão Principal:** Falta de reconexão automática + sem heartbeat
**Tempo Estimado para Correção:** 8-10 horas (implementação básica)
**Tempo para Produção:** 20-24 horas (com testes + deploy)

**Próximo Passo:** Começar com implementação de reconexão automática no frontend.

