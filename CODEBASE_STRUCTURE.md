# Estrutura do Codebase - Análise Detalhada

**Última Atualização:** 2025-11-20
**Versão:** v1.0.33

---

## 📊 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                   MONITORAMENTO DE IA                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                   │
│  │  FRONTEND    │◄───────►│   BACKEND    │                   │
│  │   (React)    │  HTTP   │ (Express)    │                   │
│  └──────────────┘  WebSocket └──────────────┘                │
│         │                          │                         │
│         ▼                          ▼                         │
│  ┌──────────────┐         ┌──────────────────┐              │
│  │  React Query │         │  Supabase DB     │              │
│  │ (Cache)      │         │  (PostgreSQL)    │              │
│  └──────────────┘         └──────────────────┘              │
│         │                          │                        │
│         └──────────┬───────────────┘                        │
│                    ▼                                        │
│          ┌──────────────────────┐                          │
│          │  Evolution API       │                          │
│          │  (WhatsApp Manager)  │                          │
│          └──────────────────────┘                          │
│                    │                                        │
│                    ▼                                        │
│          ┌──────────────────────┐                          │
│          │  Evolution DB        │                          │
│          │  (WhatsApp Storage)  │                          │
│          └──────────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 FRONTEND - Estrutura e Responsabilidades

### 📂 Diretório: `client/src/`

```
client/src/
├── pages/                          # Páginas principais
│   ├── whatsapp.tsx               # Chat interface (CRÍTICO)
│   ├── login.tsx                  # Login page
│   ├── dashboard.tsx              # Dashboard
│   ├── instance-settings.tsx       # Configurações de instância
│   └── releases.tsx               # Release notes
│
├── components/                     # Componentes React
│   ├── ChatMessage.tsx            # Renderiza mensagem
│   ├── ChatListSidebar.tsx        # Lista de chats
│   ├── InstanceSelectorModal.tsx  # Seletor de instâncias
│   ├── CreateInstanceDialog.tsx   # Criar instância
│   ├── UserOnboarding.tsx         # Onboarding de usuário
│   ├── app-sidebar.tsx            # Barra lateral
│   └── [outros componentes]
│
├── hooks/                          # Custom Hooks
│   ├── use-websocket.ts           # WebSocket connection (CRÍTICO)
│   ├── use-selected-instance.ts   # Instance state (Zustand)
│   ├── use-user-profile.ts        # User profile management
│   ├── use-auth.ts                # Auth state (Zustand)
│   └── [outros hooks]
│
├── config/
│   └── version.ts                 # APP_VERSION = "v1.0.33"
│
├── data/
│   └── releases.ts                # Release notes data
│
├── lib/
│   └── api.ts                     # API client utilities
│
└── App.tsx                         # Root component
```

### 🔴 COMPONENTES CRÍTICOS DO FRONTEND

#### 1. **use-websocket.ts** - WebSocket Connection Manager
   - **Responsabilidade:** Gerenciar conexão WebSocket em tempo real
   - **Arquivo:** `client/src/hooks/use-websocket.ts`
   - **Tamanho:** ~250 linhas
   - **Status:** ❌ Sem reconexão automática

   **O que faz:**
   ```
   1. Conecta ao servidor via WebSocket
   2. Envia/recebe mensagens em tempo real
   3. Invalida cache React Query quando há atualizações
   4. Monitora instâncias específicas
   ```

   **Problemas:**
   - Sem reconexão automática quando cai
   - Sem heartbeat para detectar mortas
   - Sem token refresh

#### 2. **whatsapp.tsx** - Main Chat Interface
   - **Responsabilidade:** Interface principal de chat
   - **Arquivo:** `client/src/pages/whatsapp.tsx`
   - **Tamanho:** ~2200 linhas
   - **Status:** ⚠️ Depende de WebSocket instável

   **O que faz:**
   ```
   1. Exibe lista de instâncias
   2. Renderiza chats para instância selecionada
   3. Mostra histórico de mensagens
   4. Permite enviar mensagens
   5. Monitora status de conexão
   ```

   **Linhas críticas:**
   - 486-490: Query de instâncias com cache 5min
   - 499-515: Lógica de sorting (favoritas → recentes → alfabético)
   - 1314-1323: Alerta de desconexão

#### 3. **InstanceSelectorModal.tsx** - Instance Selection
   - **Responsabilidade:** Modal para selecionar instância
   - **Arquivo:** `client/src/components/InstanceSelectorModal.tsx`
   - **Tamanho:** ~200 linhas
   - **Status:** ✅ Funciona, mas depende do /api/whatsapp/instances

   **O que faz:**
   ```
   1. Busca lista de instâncias
   2. Filtra por status de conexão
   3. Filtra por busca de texto
   4. Permite selecionar instância
   ```

### 📊 Frontend - Data Flow

```
App.tsx
  │
  ├─ useWebSocket()                    ← Conecta WebSocket
  │   │
  │   ├─ registerInstance(id)          ← Monitora instância
  │   │
  │   ├─ unregisterInstance(id)        ← Para monitoramento
  │   │
  │   └─ onMessage(data)               ← Recebe updates
  │       │
  │       └─ queryClient.invalidate()  ← Atualiza cache
  │
  ├─ whatsapp.tsx
  │   │
  │   ├─ useQuery("/api/whatsapp/instances")     ← Carrega instâncias
  │   │
  │   ├─ InstanceSelectorModal
  │   │   └─ useQuery("/api/whatsapp/instances") ← Carrega novamente
  │   │
  │   └─ ChatMessage (renderiza)
  │
  └─ use-auth.ts (Zustand)             ← Estado de auth
```

---

## 🎯 BACKEND - Estrutura e Responsabilidades

### 📂 Diretório: `server/`

```
server/
├── routes.ts                         # MAIN - Rotas principais (CRÍTICO)
│                                     # 2800+ linhas
│
├── routes/
│   ├── instances.routes.ts          # Rotas de instâncias
│   ├── bot-config.routes.ts         # Configuração de bots
│   ├── ia-config.routes.ts          # Configuração de IAs
│   └── ai-data.routes.ts            # Dados de IA
│
├── config/
│   ├── evolution-db.ts              # Pool de conexão Evolution DB
│   ├── supabase.ts                  # Cliente Supabase
│   └── db-storage.ts                # Armazenamento de dados
│
├── middleware/
│   ├── auth.ts                      # Autenticação JWT
│   └── rbac.ts                      # Controle de acesso
│
├── services/
│   ├── evolution-instances.ts       # Integração Evolution API
│   ├── uazapi-supabase.ts          # Token UAZAPI
│   └── send-strategy.ts            # Estratégia de envio
│
└── index.ts                          # Entry point
```

### 🔴 COMPONENTES CRÍTICOS DO BACKEND

#### 1. **routes.ts** - Main Router (CRÍTICO)
   - **Responsabilidade:** Todas as rotas HTTP + WebSocket
   - **Arquivo:** `server/routes.ts`
   - **Tamanho:** 2800+ linhas
   - **Status:** ⚠️ Sem heartbeat, sem circuit breaker

   **WebSocket Setup (Linhas 83-244):**
   ```
   1. Cria servidor WebSocket na porta /ws
   2. Valida JWT token
   3. Registra/desregistra monitoramento de instâncias
   4. Broadcast de eventos para clientes
   ```

   **Problemas:**
   - Sem validação de permissão ao registrar instância
   - Sem heartbeat bidirecional
   - Sem verificação de token expirado

   **Endpoints principais:**
   ```
   GET  /api/whatsapp/instances                    ← Lista instâncias
   GET  /api/whatsapp/instances/:id/chats          ← Lista chats
   POST /api/whatsapp/instances/:id/send-message   ← Envia mensagem
   GET  /api/whatsapp/instances/:id/messages       ← Histórico

   WebSocket /ws                                    ← Real-time updates
   ```

#### 2. **evolution-db.ts** - Database Connection Pool
   - **Responsabilidade:** Gerenciar conexão com banco Evolution
   - **Arquivo:** `server/config/evolution-db.ts`
   - **Status:** ⚠️ Sem health checks

   **Configuração atual:**
   ```typescript
   max: 10                    // Máximo de conexões
   min: 2                     // Mínimo de conexões
   idleTimeoutMillis: 60000   // 1 minuto inatividade
   connectionTimeoutMillis: 30000  // 30s timeout
   statement_timeout: 15000   // 15s timeout de query
   ```

   **Problema:**
   - Se conexão cai, não tenta reconectar
   - Sem health check periódico

#### 3. **evolution-instances.ts** - Evolution API Integration
   - **Responsabilidade:** Comunicar com Evolution API
   - **Arquivo:** `server/services/evolution-instances.ts`
   - **Status:** ✅ Básico funciona

   **Funções principais:**
   ```typescript
   createInstance()           // Criar nova instância
   fetchInstances()           // Listar instâncias
   connectInstance()          // Conectar instância
   disconnectInstance()       // Desconectar
   restartInstance()          // Reiniciar
   ```

### 📊 Backend - Request Flow

```
HTTP Request
  │
  ├─ authMiddleware            ← Valida JWT
  │   │
  │   └─ req.user setado
  │
  ├─ Lógica da rota
  │   │
  │   ├─ Supabase query        ← Dados do app
  │   │
  │   ├─ Evolution DB query    ← Dados do WhatsApp
  │   │   (com 10s timeout + fallback)
  │   │
  │   └─ Evolution API call    ← Ações no WhatsApp
  │
  ├─ Broadcast via WebSocket
  │   └─ wss.clients.forEach() ← Notifica clientes
  │
  └─ HTTP Response
```

---

## 🔄 Fluxo de Dados - Exemplo: Enviar Mensagem

```
FRONTEND                              BACKEND
─────────────────────────────────────────────────────────

User digita mensagem
      │
      ├─ onSubmit()
      │   │
      └─► POST /api/send-message
                    │
                    ├─ authMiddleware ✓
                    │
                    ├─ Supabase.insert(message)
                    │   └─ Salva no banco
                    │
                    ├─ Evolution API.send()
                    │   └─ Envia via WhatsApp
                    │
                    ├─ Broadcast via WebSocket
                    │   ├─► message_sent event
                    │   └─► Todos clientes recebem
                    │
                    └─ HTTP Response 200
          │
          └─ queryClient.invalidate()
              └─ Frontend recarrega dados

Timeline ideal: 200-500ms
Timeline atual: Pode chegar a 2-5s se WebSocket falha
```

---

## 🚨 Fluxo de Desconexão - O Problema

```
FRONTEND                              BACKEND
─────────────────────────────────────────────────────────

WebSocket conectado ✓
      │
      │ (network interruption)
      │
      ├─ ws.onclose()
      │   └─ console.log("disconnected")
      │       └─ setIsConnected(false)
      │
      │ ❌ NÃO RECONECTA
      │ ❌ NÃO TENTA FAZER PING
      │ ❌ NÃO INVALIDA DADOS
      │
      └─ User vê: "Instâncias offline"

30 segundos depois:
      │
      └─ polling (2s interval) percebe
          └─ recarrega dados
          └─ instâncias aparecem como "online" novamente

User fica confuso: Porque instâncias caem a cada minuto?
```

---

## 📊 Dados de Instâncias - Fluxo Completo

```
1. CRIAÇÃO
   ├─ CreateInstanceDialog
   │   └─ Evolution API.createInstance()
   │       └─ Nova instância criada
   │           └─ QR code gerado
   │
   ├─ Usuário escaneia QR
   │   └─ WhatsApp conecta
   │
   └─ Broadcast via WebSocket
       └─ Todos clientes recebem event "instance_created"
           └─ React Query invalida cache


2. MONITORAMENTO
   ├─ useWebSocket.registerInstance(id)
   │   └─ WebSocket.send({ type: "register_instance", id })
   │       │
   │       └─ Backend adiciona client a activeInstances[id]
   │
   ├─ polling() a cada 2 segundos
   │   └─ Evolution DB: SELECT * FROM Instance WHERE id = ?
   │       └─ Status: connected/connecting/disconnected
   │
   └─ WebSocket broadcast
       └─ Client recebe: { type: "instance_status", status: "connected" }


3. DESCONEXÃO (O PROBLEMA)
   ├─ Rede cai
   │   └─ WhatsApp desconecta
   │
   ├─ Evolution DB registra: status = "disconnected"
   │
   ├─ Backend envia broadcast
   │   └─ Frontend recebe e invalida cache
   │
   ├─ Frontend recarrega lista
   │   └─ GET /api/whatsapp/instances
   │       └─ Instância aparece como "offline"
   │
   └─ Usuário vê: "Instância offline ❌"

Quando rede volta:
   ├─ Evolution API reconecta
   │
   └─ polling() percebe mudança
       └─ Broadcast: status = "connected" ✓
```

---

## 🔌 WebSocket - Estrutura de Mensagens

### Mensagens Enviadas pelo CLIENTE

```typescript
// 1. Registrar instância para monitoramento
{
  type: "register_instance",
  instanceId: "abc123"
}

// 2. Desregistrar instância
{
  type: "unregister_instance",
  instanceId: "abc123"
}

// 3. Heartbeat (proposto)
{
  type: "ping"
}
```

### Mensagens Enviadas pelo SERVIDOR

```typescript
// 1. Mensagem recebida
{
  type: "whatsapp_message_received",
  data: {
    instanceId: "abc123",
    chatJid: "11999999999@c.us",
    messageText: "Oi",
    timestamp: 1234567890
  }
}

// 2. Status de mensagem
{
  type: "message_status_updated",
  data: {
    messageId: "xyz",
    status: "delivered|read"
  }
}

// 3. Instância criada
{
  type: "ia_created",
  data: { id: "ia123", name: "Bot" }
}

// 4. Resposta de heartbeat (proposto)
{
  type: "pong"
}

// 5. Erro
{
  type: "error",
  message: "Authentication failed"
}
```

---

## 🔐 Autenticação e Autorização

### JWT Token Structure

```typescript
{
  // Payload
  {
    email: "user@example.com",
    userId: "uuid-123",
    iat: 1234567890,        // issued at
    exp: 1234654290         // expires at (24h depois)
  },
  // Signature
  HMAC(
    header + "." + payload,
    "JWT_SECRET"
  )
}

// Validação
- Token stored em localStorage
- Enviado via URL param: /?token=xyz
- Validado no WebSocket connection
- ❌ NÃO é revalidado após conectar
- ❌ NÃO é renovado antes de expirar
```

### Permissões

```typescript
// Usuário pode:
✅ Acessar próprias instâncias
✅ Enviar mensagens via próprias instâncias
✅ Editar próprias configurações

// Usuário NÃO pode:
❌ Acessar instâncias de outro usuário
❌ Monitorar instâncias que não possui
❌ (Atualmente sem validação!)

// Problema atual
├─ registerInstance() não valida permissão
│   └─ Cliente pode monitorar qualquer instância
│
└─ Risco de segurança 🔴
```

---

## 📈 Performance - Métrica Atual

```
Operação                    Tempo Típico      Problema
──────────────────────────────────────────────────────
Conectar WebSocket          50-200ms          ✓ OK
Carregar instâncias         200-500ms         ⚠️ Cache 5min
Enviar mensagem             300-1000ms        ⚠️ Polling 2s
Receber mensagem            0-2000ms          🔴 Polling
                                              overhead
Reconexão (se cair)         ❌ Infinito       🔴 CRÍTICO

Database Query              50-100ms          ✓ OK (novo pool)
Evolution API Call          500-2000ms        ⚠️ Sem timeout
WebSocket Broadcast         < 50ms            ✓ OK
```

---

## 📋 Checklist de Saúde do Sistema

### ✅ O que funciona
- [x] Autenticação JWT básica
- [x] Pool de conexão DB (v1.0.33)
- [x] WebSocket conexão inicial
- [x] Envio de mensagens
- [x] Cache React Query
- [x] Polling fallback

### ❌ O que NÃO funciona
- [ ] Reconexão automática WebSocket
- [ ] Heartbeat bidirecional
- [ ] Token refresh automático
- [ ] Validação de permissão WebSocket
- [ ] Health check de conexão DB
- [ ] Circuit breaker para APIs
- [ ] Logging detalhado
- [ ] Monitoring de saúde

---

## 🎯 Próximos Passos

### Priority 1: Frontend Reconexão
**Arquivo:** `client/src/hooks/use-websocket.ts`
**O que fazer:** Implementar reconexão com backoff exponencial
**Impacto:** Soluciona 70% dos problemas de instabilidade

### Priority 2: Backend Validação
**Arquivo:** `server/routes.ts` (linhas 113-131)
**O que fazer:** Validar permissão ao registrar instância
**Impacto:** Segurança crítica

### Priority 3: Heartbeat
**Arquivos:** Ambos
**O que fazer:** Implementar ping-pong a cada 30s
**Impacto:** Detectar conexões mortas rápido

---

**Documento compilado em:** 2025-11-20
**Versão da aplicação:** v1.0.33
**Status:** 🔴 Precisa de correções urgentes de reconexão

