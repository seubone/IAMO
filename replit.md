# Monitor IA - AI Monitoring System

## Overview

Monitor IA is a comprehensive web-based monitoring system for AI agents integrated with N8N workflow automation. The system provides real-time monitoring, ticket management, chat interfaces, performance dashboards, and audit trails for managing multiple AI instances. Built as a full-stack TypeScript application, it enables operations teams to monitor AI performance, intervene when issues occur, and track all system actions.

## Recent Changes

### January 14, 2025 (Evening)
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