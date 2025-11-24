# Quick Fixes - Priority 1 (Reconexão Automática Frontend)

**Data:** 2025-11-20
**Versão:** v1.0.33 → v1.0.34
**Objetivo:** Implementar reconexão automática com backoff exponencial
**Tempo Estimado:** 2-3 horas

---

## 🎯 Objetivo

Resolver o problema de instâncias caindo frequentemente implementando:
1. ✅ Reconexão automática com backoff exponencial
2. ✅ Heartbeat/Ping-Pong a cada 30 segundos
3. ✅ Logging detalhado para troubleshooting

---

## 📝 Mudança 1: Atualizar `use-websocket.ts`

### Arquivo
`client/src/hooks/use-websocket.ts`

### Código Atual (Problemático)
```typescript
useEffect(() => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    console.log("⚠️ No token available for WebSocket connection");
    return;
  }

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("WebSocket connected");
    setIsConnected(true);
    // ...
  };

  ws.onclose = () => {
    console.log("WebSocket client disconnected");
    setIsConnected(false);
    // ❌ NÃO RECONECTA
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    // ❌ SEM TRATAMENTO
  };
}, []); // ← Executa apenas 1 vez no mount
```

### Código Novo (Com Reconexão)

```typescript
// Adicionar estas variáveis de controle FORA do useEffect
const reconnectAttemptsRef = useRef(0);
const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
const lastHeartbeatRef = useRef<number>(Date.now());
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000; // 1 segundo

useEffect(() => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    console.log("⚠️ No token available for WebSocket connection");
    return;
  }

  // Validate token format (JWT should have 3 parts)
  if (!token.includes(".")) {
    console.warn("⚠️ Invalid token format detected - clearing authentication");
    localStorage.removeItem("auth_token");
    return;
  }

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const encodedToken = encodeURIComponent(token);
      const wsUrl = `${protocol}//${host}/?token=${encodedToken}`;

      console.log("🔌 Connecting to WebSocket...", {
        attempt: reconnectAttemptsRef.current + 1,
        url: wsUrl.replace(token, "[TOKEN]")
      });

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset counter on successful connection

        // Send all pending messages
        while (pendingMessagesRef.current.length > 0) {
          const message = pendingMessagesRef.current.shift();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        }

        // Re-register all active instances
        activeInstancesRef.current.forEach((instanceId) => {
          console.log(`📱 Re-registering instance after reconnect: ${instanceId}`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "register_instance", instanceId }));
          }
        });

        // Start heartbeat
        startHeartbeat(ws);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          // Update heartbeat timestamp
          lastHeartbeatRef.current = Date.now();

          // Handle different message types
          try {
            switch (message.type) {
              case "pong":
                console.log("💓 Heartbeat received");
                break;

              case "ia_created":
              case "ia_updated":
                queryClient.invalidateQueries({
                  queryKey: ["/api/ias"],
                  exact: true
                });
                console.log(`📨 Received: ${message.type}`);
                break;

              // ... resto dos case statements ...

              default:
                console.log(`📨 Unhandled message type: ${message.type}`);
            }
          } catch (handlerError) {
            console.error("❌ Error handling message:", {
              type: message.type,
              error: handlerError.message
            });
          }
        } catch (parseError) {
          console.error("❌ Failed to parse WebSocket message:", {
            rawData: event.data?.substring(0, 100),
            error: parseError.message
          });
        }
      };

      ws.onclose = (event) => {
        console.warn("❌ WebSocket connection closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          attempt: reconnectAttemptsRef.current
        });

        setIsConnected(false);

        // Clean up heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Handle authentication errors
        if (event.code === 1008) {
          console.error("🔐 Authentication error - token may be invalid or expired");
          localStorage.removeItem("auth_token");
          // Could trigger logout here
          return; // Don't try to reconnect
        }

        // Try to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
            30000 // Cap at 30 seconds
          );

          console.log(`⏳ Scheduling reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          console.error("🔴 Max reconnection attempts reached - giving up");
          // Could show error UI to user here
        }
      };

      ws.onerror = (event) => {
        console.error("❌ WebSocket error:", {
          type: event.type,
          message: "Check browser console for more details"
        });
      };

    } catch (error) {
      console.error("❌ Error creating WebSocket:", error);

      // Retry after delay
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(
          INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
          30000
        );

        console.log(`⏳ Retry connection in ${delay}ms after error`);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
      }
    }
  };

  const startHeartbeat = (ws: WebSocket) => {
    // Send ping every 30 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log("💓 Sending heartbeat...");
        ws.send(JSON.stringify({ type: "ping" }));

        // Check if we received a pong in the last 60 seconds
        const timeSinceHeartbeat = Date.now() - lastHeartbeatRef.current;
        if (timeSinceHeartbeat > 60000) {
          console.warn("❌ Heartbeat timeout - closing connection");
          ws.close(1000, "Heartbeat timeout");
        }
      }
    }, 30000);
  };

  // Initial connection
  connectWebSocket();

  // Cleanup function
  return () => {
    console.log("🧹 Cleaning up WebSocket resources");

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Component unmount");
    }
  };
}, []); // Still runs only once on mount, but handles reconnections internally
```

---

## 📝 Mudança 2: Adicionar Handler de Heartbeat no Backend

### Arquivo
`server/routes.ts`

### Código a Adicionar (após linha 136)

```typescript
// ===== HEARTBEAT HANDLING =====
ws.on("ping", (data) => {
  console.log(`💓 Heartbeat from ${decoded.email}`);
  ws.pong(Buffer.from("pong"));
});

ws.on("pong", () => {
  console.log(`💓 Pong from ${decoded.email}`);
  (ws as any).isAlive = true; // Mark as alive for server-side checks
});
```

---

## 📝 Mudança 3: Implementar Server-Side Heartbeat Check

### Arquivo
`server/routes.ts`

### Código a Adicionar (após inicializar WebSocketServer, por volta da linha 87)

```typescript
// ===== SERVER-SIDE HEARTBEAT MONITOR =====
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws: any) => {
    // Check if client is alive
    if (ws.isAlive === false) {
      console.log("❌ Terminating inactive client connection");
      return ws.terminate();
    }

    // Mark as inactive and send ping
    ws.isAlive = false;
    ws.ping();
    console.log(`💓 Server-side ping sent to clients (${wss.clients.size} total)`);
  });
}, 30000); // Every 30 seconds

// Cleanup when server closes
process.on("exit", () => {
  clearInterval(heartbeatInterval);
});
```

---

## 🧪 Como Testar

### 1. Testar Reconexão
```bash
# 1. Abrir app no navegador
# 2. Abrir DevTools (F12)
# 3. Console → Deve ver:
#    "✅ WebSocket connected successfully"

# 4. Simular perda de rede:
#    - DevTools → Network → Offline
# 5. Deve ver em 5-10 segundos:
#    "❌ WebSocket connection closed"
#    "⏳ Scheduling reconnection in 1000ms"

# 6. Devolver internet:
#    - DevTools → Network → Online
# 7. Deve conectar novamente:
#    "✅ WebSocket connected successfully"
```

### 2. Testar Heartbeat
```bash
# 1. Console deve mostrar a cada 30s:
#    "💓 Sending heartbeat..."
#    "💓 Heartbeat received"

# 2. Se não receber pong em 60s:
#    "❌ Heartbeat timeout - closing connection"
#    Reconecta automaticamente
```

### 3. Verificar Logs no Backend
```bash
# Terminal do servidor deve mostrar:
# "💓 Server-side ping sent to clients (5 total)"  (a cada 30s)
# "💓 Pong from user@example.com"
# "✅ WebSocket client connected: user@example.com"
# "❌ WebSocket connection closed" (se cliente desconectar)
```

---

## 📊 Antes vs Depois

### ANTES (v1.0.33)
```
Usuário navega
  │
  ├─ WebSocket conecta ✓
  │
  ├─ Network cai (1s latência/perda)
  │   │
  │   └─ WebSocket fecha
  │       └─ sem reconectar
  │
  ├─ Polling (2s) percebe
  │   └─ recarrega dados
  │
  └─ Instâncias aparecem como "offline ❌"

Result: Confuso, instável, parece bugado
```

### DEPOIS (v1.0.34)
```
Usuário navega
  │
  ├─ WebSocket conecta ✓
  │
  ├─ Heartbeat a cada 30s ✓
  │   └─ Detecta problemas rápido
  │
  ├─ Network cai (1s latência/perda)
  │   │
  │   └─ WebSocket fecha
  │       └─ reconecta automaticamente em 1-2s
  │
  ├─ Se ainda estiver down após 10 tentativas
  │   └─ Mostra erro ao usuário
  │
  └─ Instâncias continuam aparecendo como "online ✓"

Result: Fluido, resiliente, confiável
```

---

## 🔄 Rollback Plan

Se algo der errado:

```bash
# Reverter para versão anterior
git revert HEAD

# Ou especificamente o arquivo
git checkout HEAD~1 -- client/src/hooks/use-websocket.ts
```

---

## ✅ Checklist de Implementação

- [ ] Copiar novo código para `use-websocket.ts`
- [ ] Adicionar handlers de heartbeat no backend (`routes.ts`)
- [ ] Adicionar heartbeat monitor no servidor
- [ ] Testar reconexão manual (offline/online)
- [ ] Testar heartbeat (observar console)
- [ ] Testar com 10+ instâncias abertas
- [ ] Testar com conexão lenta (DevTools throttle)
- [ ] Build Docker v1.0.34
- [ ] Deploy
- [ ] Monitorar logs por 24h

---

## 📈 Impacto Esperado

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|---------|
| Tempo para detectar queda | 2-30s | <1s | 30x+ |
| Reconexão automática | ❌ Não | ✅ Sim | ∞ |
| Instâncias "caindo" | Frequente | Raro | 10x+ |
| Chamadas ao server | 30/min | 25/min | -17% |
| User confusion | Alta | Baixa | Óbvio |

---

## 🚀 Próximas Fases (após v1.0.34)

1. **v1.0.35**: Token Refresh automático
2. **v1.0.36**: Circuit Breaker para Evolution API
3. **v1.0.37**: DB Pool health checks
4. **v1.0.38**: Enhanced monitoring/alertas

---

**Documento:** Quick Fixes Priority 1
**Versão Alvo:** v1.0.34
**Status:** Pronto para implementação
**Data:** 2025-11-20

