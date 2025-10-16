# Monitor IA - AI Monitoring System

## Overview

Monitor IA is a comprehensive web-based monitoring system for AI agents integrated with N8N workflow automation. The system provides real-time monitoring, ticket management, chat interfaces, performance dashboards, and audit trails for managing multiple AI instances. Built as a full-stack TypeScript application, it enables operations teams to monitor AI performance, intervene when issues occur, and track all system actions.

## Recent Changes

### January 16, 2025 (Latest)
- **Real-Time Polling Monitor - Multi-User Architecture Implemented**:
  - Backend: Polling loop (2s interval) checks Evolution DB for new messages
  - Smart instance tracking: Only monitors instances actively viewed by any connected user
  - WebSocket registration system: Clients send register_instance/unregister_instance messages
  - Backend maintains `activeInstances` Map tracking which clients monitor which instances
  - Backend maintains `lastMessageTimestamps` Map to detect new messages per instance
  - Polling loop iterates only over `activeInstances.keys()` - stops when all users close instance
  - Message queuing system in useWebSocket: Buffers register/unregister messages when WebSocket is CONNECTING
  - Automatic re-registration on reconnections: `activeInstancesRef` tracks desired subscriptions
  - When WebSocket.onopen fires: flushes pending queue + re-registers all active instances
  - Eliminates race condition where register_instance was lost during CONNECTING state
  - Backend emits `whatsapp_new_messages` event only to clients subscribed to that instance
  - Frontend invalidates React Query cache on event to trigger UI update
  - E2E tested: Architect-approved as robust and production-ready
- **Sistema de Notificações do WhatsApp Implementado**:
  - Backend: Novo webhook POST /webhooks/evolution/message para receber eventos do Evolution API (LEGACY - polling is now primary)
  - Webhook processa events messages.upsert e messages.update
  - Emite evento WebSocket "whatsapp_message_received" para todos os clientes conectados
  - Frontend: Lógica de notificação corrigida - notifica SEMPRE exceto quando chat está aberto E aba está visível
  - Toast melhorado com nome do remetente (pushName ou JID) e preview da mensagem (50 chars)
  - Suporte a preview de diferentes tipos de mídia: texto, imagem 📷, áudio 🎵, documento 📄
  - Notificações do navegador (Notification API) quando aba está inativa
  - Solicitação automática de permissão de notificações após 2 segundos (melhor UX)
  - Badge contador no título da página: "(N) Monitor IA - Chat" quando há mensagens não lidas
  - Bug fix: Movida declaração de isPageVisible para evitar erro LSP "used before declaration"

### January 15, 2025 (Evening)
- **Settings Page - IA Management Section**:
  - Created complete "Gerenciar IAs" section in Settings page
  - IA creation dialog with validated form (name, status, tags)
  - List view of all IAs with status badges and delete functionality
  - Backend routes: POST /api/ias (admin only) and DELETE /api/ias/:id (admin only)
  - React Query mutations with cache invalidation and toast feedback
  - Proper authorization checks with requireRole middleware
- **IASelector Component Created**:
  - Reusable dropdown component for IA selection across the application
  - Loads IAs via React Query with loading state
  - Integrated with Shadcn Select primitives
  - Test IDs for all interactive elements
- **Bug Fixes**:
  - Fixed critical apiRequest bug: Now handles 204 No Content responses without JSON parsing
  - This fixes IA deletion flow that was silently failing
  - All mutations now properly trigger success callbacks and cache invalidation

### January 15, 2025 (Morning)
- **Monitoring Page - IA Status Actions**:
  - Created IAStatusDialog component with reason/motivo input required before status changes
  - Integrated IA action buttons (Ativar/Pausar/Inativar) in Monitoring page IADetailPanel
  - Actions trigger PATCH /api/ias/:id with status and reason
  - Automatic audit trail creation for all IA status changes
  - Real-time UI updates via React Query cache invalidation
  - Toast notifications for success/error feedback
  - E2E tested and fully functional
- **Bug Fixes**:
  - Fixed date serialization: ticket.createdAt and action.createdAt handled as strings
  - Fixed TicketCard rendering: Added fallback for invalid errorType values
  - Added "unknown" type config with neutral border color (border-l-muted-foreground)
  - Normalized database tickets: All error_type values validated and corrected
  - Added defensive fallbacks for severity and errorType in TicketCard component

### January 14, 2025 (Evening)
- **Kanban Drag-and-Drop Added**:
  - Tickets page now supports full drag-and-drop functionality
  - Cards can be dragged between "Novo Ticket", "Em Atendimento", and "Resolvido" columns
  - HTML5 drag-and-drop API with visual feedback (bg-accent/5 on hover)
  - PATCH /api/tickets/:id mutation updates status in real-time
  - Toast notifications for success/error feedback
  - React Query integration for loading tickets from database
  - Maps ticket.iaId to IA names by querying both endpoints
  - Fixed critical auth bug: queryClient now includes Authorization headers for all API requests
- **User Registration System Added**:
  - Login page now includes tabbed interface with "Entrar" (Login) and "Cadastrar" (Register)
  - Complete registration flow with validation (name, email, password, confirm password)
  - Backend route POST /api/auth/register with duplicate email checking and bcrypt hashing
  - New users are created with default 'viewer' role
  - Automatic authentication and redirect after successful registration
  - E2E tested and fully functional
- **Navigation Reorganized**: Sidebar menu now follows requested order: Monitoramento → Dashboard → Chat → Tickets → Auditoria → Perfil → Configurações
- **Database Schema Expanded**:
  - users: Added avatar, personalIntegrations, updatedAt
  - ias: Added parameters, statusHistory for AI audit trail
  - conversations: Added channel, metadata
  - messages: Added attachments, actions
  - New table: settings for global configurations
- **Chat Page Rebuilt**:
  - Sidebar with searchable conversation list
  - Header showing contact name, channel, and IA status controls (Activate/Pause/Deactivate)
  - Message area with proper sender differentiation
  - Input bar with attachment button and send functionality
  - Empty states and loading indicators
  - IA status mutation with UI updates
- **Profile Page Created**:
  - Tabs: Personal Data, Preferences, Personal Integrations
  - Avatar display and editing with live preview (URL input field)
  - Functional profile update with mutations and toast notifications (name + avatar)
  - Password change with full validation and confirmation
  - API routes: PATCH /api/auth/profile, PATCH /api/auth/password
  - User interface extended with avatar field in auth state
  
### January 14, 2025 (Morning)
- **Fixed Critical Login Bug**: Resolved "Failed to execute 'fetch'" error when accessing login via external link
  - Root cause: TypeScript errors in `getAuthHeaders()` preventing correct compilation
  - Solution: Added explicit `Record<string, string>` return type to `getAuthHeaders()`
  - Impact: Login now works correctly from external URLs and all authentication flows are stable
- **Database Storage Migration**: Fully migrated from in-memory to PostgreSQL
  - Aligned all `DatabaseStorage` method names with `IStorage` interface
  - Added idempotent seed data loading (checks if data exists before inserting)
  - All 7 database tables operational: users, ias, tickets, actions, conversations, messages, metrics
- **Code Quality**: Eliminated all TypeScript LSP errors across the codebase

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type safety
- Vite as the build tool for fast development and optimized production builds
- Wouter for lightweight client-side routing
- TailwindCSS with Shadcn UI components for consistent, accessible design
- React Query (TanStack Query) for server state management and caching
- Zustand with persistence for client-side state (authentication)

**Design System:**
- Custom theme system supporting light/dark modes with CSS variables
- Design tokens defined in `tailwind.config.ts` and `client/src/index.css`
- Component library based on Radix UI primitives with custom styling
- Typography using Inter (UI/data) and Poppins (headings) font families
- Color palette optimized for operational clarity with semantic colors for status indicators

**Key UI Patterns:**
- Status ticker for real-time IA monitoring at the top of the application
- Sidebar navigation for main feature access
- Card-based layouts for data presentation
- Real-time updates via WebSocket connections
- Responsive grid layouts for metrics and dashboards

### Backend Architecture

**Technology Stack:**
- Node.js with Express for HTTP server
- TypeScript for type safety across the stack
- WebSocket (ws library) for real-time bidirectional communication
- Drizzle ORM for database interactions
- JWT for stateless authentication
- bcryptjs for password hashing

**API Structure:**
- RESTful endpoints under `/api/*` for CRUD operations
- WebSocket endpoint at `/ws` for real-time updates
- Webhook endpoint at `/webhooks/n8n/log` for N8N integration
- Rate limiting on authentication and webhook endpoints

**Authentication & Authorization:**
- JWT-based authentication with 7-day token expiration
- Role-Based Access Control (RBAC) with three roles:
  - **Admin**: Full system access including IA creation/deactivation
  - **Operator**: Manage tickets and IA actions
  - **Viewer**: Read-only access
- Middleware stack: `authMiddleware` → `requireRole`/`requirePermission`
- WebSocket connections require JWT token authentication

**Real-Time Communication:**
- WebSocket server handles authenticated connections
- Broadcasts events: `ia_created`, `ia_updated`, `ticket_created`, `ticket_updated`, `message_created`
- Client-side hook (`use-websocket`) auto-invalidates React Query cache on updates
- Maintains set of active WebSocket clients for broadcasting

### Data Storage

**Database:**
- PostgreSQL via Neon serverless database
- Drizzle ORM for schema definition and migrations
- Connection pooling via `@neondatabase/serverless`
- Schema defined in `shared/schema.ts` with Zod validation schemas

**Data Models:**
- **Users**: Authentication, roles, preferences
- **IAs**: AI instances with status (active/paused/inactive) and tags
- **Tickets**: Error/issue tracking linked to IAs and attendances
- **Actions**: Audit log of all user actions on IAs
- **Conversations**: Chat sessions with leads
- **Messages**: Individual chat messages with sender type
- **Metrics**: Performance data for dashboards

**Storage Layer:**
- Abstracted storage interface in `server/storage.ts`
- **Production Implementation**: PostgreSQL via `DatabaseStorage` class (`server/db-storage.ts`)
- Fully aligned with IStorage interface for type safety
- Seed data automatically loaded on first start (idempotent)
- Database initialization creates all 7 tables automatically

### Integration Points

**N8N Webhook Integration:**
- Endpoint: `POST /webhooks/n8n/log`
- Rate limited to 100 requests/minute
- Accepts log/error data from N8N workflows
- Automatically creates tickets with severity classification
- Triggers WebSocket broadcast to connected clients

**WebSocket Integration:**
- Protocol: `ws://` (development) or `wss://` (production)
- Authentication: JWT token via query parameter or header
- Automatic reconnection handling in client
- Real-time cache invalidation pattern

## External Dependencies

### Third-Party Services

**Database:**
- Neon Serverless PostgreSQL
- Configuration via `DATABASE_URL` environment variable
- WebSocket connection using `ws` library

**Authentication:**
- JWT tokens (jsonwebtoken library)
- bcryptjs for password hashing
- No external auth provider integration

### Key NPM Packages

**UI Components:**
- @radix-ui/* - Headless accessible components
- TailwindCSS - Utility-first CSS framework
- class-variance-authority - Component variant management
- lucide-react - Icon library

**State & Data:**
- @tanstack/react-query - Server state management
- zustand - Client state management
- drizzle-orm - Type-safe ORM
- zod - Runtime validation

**Development:**
- Vite - Build tool
- TypeScript - Type system
- express-rate-limit - API rate limiting

### Environment Configuration

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing (defaults to dev key)
- `NODE_ENV` - Environment mode (development/production)

### Build & Deployment

- Development: `npm run dev` (concurrent Vite + Express)
- Production build: `npm run build` (Vite frontend + esbuild backend)
- Production start: `npm start`
- Database migrations: `npm run db:push` (Drizzle Kit)