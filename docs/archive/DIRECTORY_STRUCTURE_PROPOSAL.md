# 📁 Proposta de Reorganização de Diretórios

**Data:** 2025-11-20
**Versão:** v1.0.34+ (future)
**Objetivo:** Organizar código de forma escalável e manutenível

---

## 🎯 Problemas com Estrutura Atual

### Frontend
```
client/src/
├── components/           ← MISTURADO (UI + Features)
├── pages/               ← MISTURADO (Rotas + Lógica)
├── hooks/               ← MISTURADO (Global + Local)
├── config/              ← Config espalhada
├── data/                ← Dados estáticos
├── examples/            ← Código de exemplo (não precisa)
├── lib/                 ← Utilities diversas
├── types/               ← Types espalhados
└── utils/               ← Utils diversas
```

**Problemas:**
- ❌ Components de UI misturados com Features
- ❌ Hooks globais misturados com locais
- ❌ Difícil encontrar código específico
- ❌ Sem separação clara de responsabilidades
- ❌ Pages muito grande (2200 linhas)
- ❌ Imports confusos e longos

### Backend
```
server/
├── routes.ts            ← GIGANTE (2800+ linhas!)
├── config/
├── middleware/
├── routes/              ← Rotas separadas
├── services/
├── utils/
├── migrations/
├── scripts/
└── index.ts
```

**Problemas:**
- ❌ routes.ts muito grande (2800 linhas!)
- ❌ Sem camada clara de lógica de negócio
- ❌ WebSocket misturado com HTTP
- ❌ Banco de dados operations espalhadas
- ❌ Sem separação de concerns

---

## ✅ Estrutura Proposta - FRONTEND

### Nova Estrutura

```
client/src/
│
├── @types/                      # Type definitions (exportadas por conveniência)
│   ├── index.ts
│   ├── entities.ts              # Tipos de domínio (User, Message, Instance)
│   ├── api.ts                   # Tipos de API
│   └── hooks.ts                 # Tipos de hooks
│
├── assets/                       # Imagens, fonts, vídeos
│   ├── images/
│   ├── fonts/
│   ├── videos/
│   └── icons/
│
├── components/                   # Componentes reutilizáveis (puros - sem lógica)
│   ├── ui/                       # UI components (shadcn, built-in)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── [outros UI]
│   │
│   ├── common/                   # Componentes comuns
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Navigation.tsx
│   │   └── ErrorBoundary.tsx
│   │
│   ├── layout/                   # Layouts
│   │   ├── MainLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── EmptyState.tsx
│   │
│   └── index.ts                  # Export barrel
│
├── features/                     # Features com lógica (Nova!)
│   │
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── LogoutButton.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── hooks/
│   │   │   ├── useLogin.ts
│   │   │   ├── useLogout.ts
│   │   │   └── useUser.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   ├── services/             # Serviços da feature
│   │   │   └── auth.service.ts
│   │   ├── store/                # Zustand store
│   │   │   └── auth.store.ts
│   │   ├── utils/
│   │   │   ├── parseJwt.ts
│   │   │   └── validateToken.ts
│   │   └── index.ts
│   │
│   ├── chat/
│   │   ├── components/
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatList.tsx
│   │   │   └── MessageComposer.tsx
│   │   ├── hooks/
│   │   │   ├── useChat.ts
│   │   │   ├── useSendMessage.ts
│   │   │   └── useMessages.ts
│   │   ├── types/
│   │   │   └── chat.types.ts
│   │   ├── services/
│   │   │   └── chat.service.ts
│   │   ├── utils/
│   │   │   ├── formatMessage.ts
│   │   │   └── parseMessage.ts
│   │   └── index.ts
│   │
│   ├── instances/
│   │   ├── components/
│   │   │   ├── InstanceSelector.tsx
│   │   │   ├── InstanceList.tsx
│   │   │   ├── CreateInstanceDialog.tsx
│   │   │   └── InstanceStatus.tsx
│   │   ├── hooks/
│   │   │   ├── useInstances.ts
│   │   │   ├── useSelectedInstance.ts
│   │   │   └── useInstanceStatus.ts
│   │   ├── types/
│   │   │   └── instances.types.ts
│   │   ├── services/
│   │   │   └── instances.service.ts
│   │   ├── store/
│   │   │   └── instances.store.ts
│   │   └── index.ts
│   │
│   ├── whatsapp/
│   │   ├── components/
│   │   │   ├── WhatsAppInterface.tsx
│   │   │   ├── ChatListSidebar.tsx
│   │   │   └── MessageArea.tsx
│   │   ├── hooks/
│   │   │   ├── useWhatsApp.ts
│   │   │   └── useWebSocket.ts          # ← MOVED FROM ROOT
│   │   ├── types/
│   │   │   └── whatsapp.types.ts
│   │   ├── services/
│   │   │   └── whatsapp.service.ts
│   │   └── index.ts
│   │
│   ├── ia/
│   │   ├── components/
│   │   │   ├── IAList.tsx
│   │   │   ├── IAConfig.tsx
│   │   │   └── IAStatus.tsx
│   │   ├── hooks/
│   │   │   └── useIA.ts
│   │   ├── types/
│   │   │   └── ia.types.ts
│   │   └── index.ts
│   │
│   └── index.ts
│
├── hooks/                       # Hooks reutilizáveis globais (APENAS globais)
│   ├── useQuery.ts              # React Query wrapper
│   ├── useMutation.ts
│   ├── useApi.ts                # API call hook
│   ├── useAsync.ts
│   ├── useLocalStorage.ts
│   └── index.ts
│
├── pages/                       # Pages/rotas (SIMPLES - apenas layout)
│   ├── auth/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── ForgotPassword.tsx
│   ├── app/
│   │   ├── WhatsApp.tsx         # Main app
│   │   ├── Dashboard.tsx
│   │   ├── Instances.tsx
│   │   ├── Settings.tsx
│   │   └── Releases.tsx
│   ├── NotFound.tsx
│   └── index.ts
│
├── config/                      # Configuration
│   ├── version.ts               # APP_VERSION
│   ├── api.config.ts            # API configuration
│   ├── feature-flags.ts         # Feature flags
│   └── constants.ts             # App constants
│
├── lib/                         # Utilities & Helpers (exportáveis)
│   ├── api.ts                   # API client setup
│   ├── storage.ts               # LocalStorage wrapper
│   ├── logger.ts                # Logging utilities
│   ├── validators.ts            # Validators
│   └── formatters.ts            # Formatters
│
├── services/                    # Global services
│   ├── api.service.ts           # API service
│   ├── websocket.service.ts     # WebSocket service (mais tarde)
│   └── storage.service.ts       # Storage service
│
├── store/                       # Zustand stores (global state)
│   ├── useAuth.ts               # Auth store
│   ├── useUI.ts                 # UI state
│   ├── useCache.ts              # Cache management
│   └── index.ts
│
├── data/                        # Static data
│   ├── releases.ts
│   ├── documentation.ts
│   └── constants.ts
│
├── App.tsx                      # Root component
├── App.css
├── index.tsx                    # Entry point
└── index.css

```

### Explicação das Mudanças

#### 1. **Separação de Features**
- Cada feature (auth, chat, instances) em sua própria pasta
- Cada feature tem: components, hooks, types, services, store
- **Benefício:** Escalável, componentes podem ser removidos facilmente

#### 2. **Hooks Organizados**
- `features/*/hooks/` → Hooks específicos da feature
- `hooks/` → Hooks globais reutilizáveis
- **Benefício:** Fácil encontrar e reutilizar

#### 3. **Components Puros**
- `components/` → Apenas UI components puros (sem lógica)
- `features/*/components/` → Componentes com lógica da feature
- **Benefício:** Components reutilizáveis, testes mais fáceis

#### 4. **Services**
- `lib/` → Utilities exportáveis
- `features/*/services/` → Serviços da feature
- `services/` → Serviços globais
- **Benefício:** Separação clara de responsabilidades

#### 5. **Types**
- `@types/` → Tipos globais (convenient imports)
- `features/*/types/` → Tipos específicos da feature
- **Benefício:** Tipos organizados e fáceis de encontrar

---

## ✅ Estrutura Proposta - BACKEND

### Nova Estrutura

```
server/
│
├── src/                         # Novo! (agrupar código fonte)
│   │
│   ├── core/                    # Núcleo da aplicação
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   ├── entities.ts      # Tipos de domínio
│   │   │   ├── api.ts           # Tipos de API
│   │   │   └── errors.ts        # Tipos de erro
│   │   │
│   │   ├── errors/              # Error handling
│   │   │   ├── AppError.ts
│   │   │   ├── ValidationError.ts
│   │   │   ├── NotFoundError.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── index.ts
│   │   │
│   │   └── constants/
│   │       ├── messages.ts
│   │       ├── status.ts
│   │       └── index.ts
│   │
│   ├── features/                # Features com lógica
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.controller.ts       # Request handlers
│   │   │   ├── auth.service.ts          # Business logic
│   │   │   ├── auth.routes.ts           # Route definitions
│   │   │   ├── auth.types.ts            # Types
│   │   │   └── index.ts
│   │   │
│   │   ├── chat/
│   │   │   ├── chat.controller.ts
│   │   │   ├── chat.service.ts
│   │   │   ├── chat.routes.ts
│   │   │   ├── chat.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── instances/
│   │   │   ├── instances.controller.ts
│   │   │   ├── instances.service.ts     # Moved from services/
│   │   │   ├── instances.routes.ts
│   │   │   ├── instances.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── whatsapp/
│   │   │   ├── whatsapp.controller.ts   # Split from routes.ts
│   │   │   ├── whatsapp.service.ts
│   │   │   ├── whatsapp.websocket.ts    # WebSocket handlers
│   │   │   ├── whatsapp.routes.ts
│   │   │   ├── whatsapp.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── ia/
│   │   │   ├── ia.controller.ts
│   │   │   ├── ia.service.ts
│   │   │   ├── ia.routes.ts
│   │   │   ├── ia.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── bot/
│   │   │   ├── bot.controller.ts
│   │   │   ├── bot.service.ts
│   │   │   ├── bot.routes.ts
│   │   │   ├── bot.types.ts
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── infrastructure/          # Camada de infraestrutura
│   │   │
│   │   ├── database/
│   │   │   ├── supabase.ts       # Supabase config
│   │   │   ├── evolution-db.ts   # Evolution DB pool
│   │   │   └── migrations/       # (move migrations here)
│   │   │
│   │   ├── external/             # APIs externas
│   │   │   ├── evolution-api.ts
│   │   │   ├── uazapi.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── storage/              # Storage (S3, etc)
│   │   │   └── supabase-storage.ts
│   │   │
│   │   └── messaging/            # Message queues
│   │       └── index.ts
│   │
│   ├── shared/                  # Código compartilhado
│   │   │
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   ├── helpers.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── services/             # Serviços globais
│   │   │   ├── websocket.service.ts
│   │   │   ├── logger.service.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── decorators/           # TypeScript decorators
│   │   │   └── index.ts
│   │   │
│   │   ├── guards/               # Route guards
│   │   │   ├── auth.guard.ts
│   │   │   ├── permission.guard.ts
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── webhooks/                 # Webhook handlers
│   │   ├── evolution.webhook.ts
│   │   ├── stripe.webhook.ts     # (se usar)
│   │   └── index.ts
│   │
│   ├── app.ts                    # Express app setup
│   ├── server.ts                 # Server startup
│   └── index.ts                  # Entry point
│
├── config/                      # (Keep, but move core to src/core)
│   ├── env.ts
│   └── [outros]
│
├── migrations/                  # (Can stay or move to src/infrastructure)
│
├── scripts/                     # Build, seed scripts
│
├── package.json
└── tsconfig.json

```

### Explicação das Mudanças

#### 1. **Features Pattern (Controllers + Services)**
```typescript
// Antes: Tudo em routes.ts
app.post("/api/send-message", authMiddleware, async (req, res) => {
  // 500 linhas de lógica aqui
});

// Depois: Separado em camadas
// routes.ts
app.post("/api/send-message", authMiddleware, whatsappController.sendMessage);

// controller.ts
export const sendMessage = async (req: AuthRequest, res: Response) => {
  // Validação
  // Chamada de service
  // Retorno
};

// service.ts
export const sendMessage = async (instanceId, message) => {
  // Business logic aqui
};
```

#### 2. **Separação de Concerns**
- **Controller:** Request/Response handling
- **Service:** Business logic
- **Routes:** Route definitions
- **Types:** TypeScript types
- **Middleware:** Authentication, validation

#### 3. **WebSocket Separado**
- Novo arquivo: `features/whatsapp/whatsapp.websocket.ts`
- Contém: event handlers, registration, broadcast
- Benefício: routes.ts fica menor, lógica centralizada

#### 4. **Infrastructure Layer**
- Database connections
- External APIs
- Storage
- Mensaging queues
- Benefício: Fácil trocar implementação (ex: mudar de Supabase para AWS)

#### 5. **Shared/Core**
- Utilities, decorators, guards globais
- Error handling
- Logging
- Benefício: Reutilizável em todas as features

---

## 📊 Comparação: Antes vs Depois

### FRONTEND

**Antes:**
```
client/src/
├── components/           (150+ files misturados)
├── pages/               (whatsapp.tsx com 2200 linhas)
├── hooks/               (20+ hooks misturados)
└── utils/
```

**Depois:**
```
client/src/
├── features/
│   ├── auth/
│   ├── chat/
│   ├── instances/
│   ├── whatsapp/
│   └── ia/
├── components/          (apenas UI puro)
├── pages/               (simples rotas)
├── hooks/               (apenas global)
└── lib/
```

**Benefícios:**
- ✅ Cada feature isolada
- ✅ Fácil encontrar código
- ✅ Reutilizável
- ✅ Escalável
- ✅ Testável

### BACKEND

**Antes:**
```
server/
├── routes.ts            (2800 linhas!)
├── routes/              (outras rotas)
├── config/
├── services/
└── middleware/
```

**Depois:**
```
server/src/
├── features/
│   ├── auth/
│   ├── chat/
│   ├── whatsapp/
│   └── instances/
├── core/
├── infrastructure/
├── shared/
└── webhooks/
```

**Benefícios:**
- ✅ Cada feature em seu próprio módulo
- ✅ routes.ts fica pequeno e gerenciável
- ✅ WebSocket separado
- ✅ Fácil adicionar novas features
- ✅ Testável com DI

---

## 🚀 Implementação por Fases

### Fase 1: Preparação (1-2 horas)
- [x] Criar estrutura de diretórios
- [x] Documentação pronta
- [ ] Criar arquivos base sem mover código

### Fase 2: Frontend (4-6 horas)
- [ ] Mover componentes UI
- [ ] Reorganizar features
- [ ] Reorganizar hooks
- [ ] Atualizar imports
- [ ] Testar funcionalidade

### Fase 3: Backend (6-8 horas)
- [ ] Separar routes.ts em features
- [ ] Criar controllers + services
- [ ] Reorganizar infrastructure
- [ ] Atualizar imports
- [ ] Testar endpoints

### Fase 4: Testes & Deploy (2-3 horas)
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Deploy v1.0.35
- [ ] Monitorar erros

---

## 📝 Checklist de Migração

### Frontend
- [ ] Criar estrutura de diretórios
- [ ] Mover components/ui
- [ ] Criar features/auth
- [ ] Criar features/chat
- [ ] Criar features/instances
- [ ] Criar features/whatsapp
- [ ] Mover hooks para features
- [ ] Atualizar todos os imports
- [ ] Testar funcionalidade
- [ ] Lint and format
- [ ] Commit e deploy

### Backend
- [ ] Criar src/
- [ ] Criar features/
- [ ] Separar routes.ts
- [ ] Criar controllers
- [ ] Criar services
- [ ] Mover middleware para core
- [ ] Reorganizar infrastructure
- [ ] Atualizar imports
- [ ] Testar endpoints
- [ ] Lint and format
- [ ] Commit e deploy

---

## 🔄 Impacto na Equipe

### Para Desenvolvedores
- ✅ Mais fácil encontrar código
- ✅ Menos conflitos de merge
- ✅ Mais fácil adicionar features
- ✅ Padrão claro para novo código

### Para QA/Testes
- ✅ Testes isolados por feature
- ✅ Mais fácil testar componentes
- ✅ Melhor rastreamento de bugs

### Para DevOps/CI
- ✅ Build mais rápido (tree-shaking)
- ✅ Melhor tracking de dependências
- ✅ Mais fácil debugar erros

---

## 📞 Próximos Passos

1. **Avaliar proposta** (15 minutos)
2. **Criar estrutura vazia** (30 minutos)
3. **Migração gradual** (2-3 dias)
4. **Testar completo** (1 dia)
5. **Deploy v1.0.35** (com nova estrutura)

---

**Status:** 📋 Proposta Completa
**Esforço Estimado:** 15-20 horas (sem refactoring profundo)
**Benefício:** Massivo (escalabilidade, manutenibilidade, performance)

