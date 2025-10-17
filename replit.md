# Monitor IA - AI Monitoring System

## Overview

Monitor IA is a comprehensive web-based monitoring system for AI agents integrated with N8N workflow automation. It provides real-time monitoring, ticket management, chat interfaces, performance dashboards, and audit trails for managing multiple AI instances. Built as a full-stack TypeScript application, its purpose is to enable operations teams to monitor AI performance, intervene when issues occur, and track all system actions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:** React 18, TypeScript, Vite, Wouter, TailwindCSS with Shadcn UI, React Query (TanStack Query), Zustand.

**Design System:** Custom theme (light/dark modes), TailwindCSS-based design tokens, Radix UI primitives, Inter/Poppins fonts, semantic color palette.

**Key UI Patterns:** Real-time IA status ticker, sidebar navigation, card-based layouts, real-time updates via WebSockets, responsive grids.

### Backend Architecture

**Technology Stack:** Node.js, Express, TypeScript, WebSocket (ws library), Drizzle ORM, JWT, bcryptjs.

**API Structure:** RESTful endpoints (`/api/*`), WebSocket endpoint (`/ws`), N8N webhook (`/webhooks/n8n/log`). Rate limiting on auth and webhook endpoints.

**Authentication & Authorization:** JWT-based authentication (7-day expiration), Role-Based Access Control (RBAC) with Admin, Operator, and Viewer roles. Middleware for authorization checks. WebSocket connections require JWT.

**Real-Time Communication:** WebSocket server handles authenticated connections, broadcasts events (`ia_created`, `ia_updated`, `ticket_created`, `ticket_updated`, `message_created`), and utilizes client-side React Query cache invalidation.

### Data Storage

**Database:** PostgreSQL (Neon serverless) with Drizzle ORM for schema definition and migrations.

**Data Models:** Users, IAs, Tickets, Actions, Conversations, Messages, Metrics.

**Storage Layer:** Abstracted `IStorage` interface implemented by `DatabaseStorage` for PostgreSQL. Seed data is loaded idempotently on first start.

### Integration Points

**N8N Webhook Integration:** `POST /webhooks/n8n/log` receives log/error data from N8N, creates tickets, and triggers WebSocket broadcasts.

**WebSocket Integration:** `ws://` or `wss://` protocol with JWT authentication via query parameter or header. Client-side handles auto-reconnection and real-time cache invalidation.

**UazAPI WhatsApp Integration:** Sistema completo de envio de mensagens e mídias via WhatsApp:
- `POST /api/whatsapp/send-message` - Envio de mensagens de texto
- `POST /api/whatsapp/send-media` - Envio de mídias (imagens, vídeos, áudios, documentos)
- Suporta tipos: image, video, document, audio, ptt (push-to-talk), sticker
- Upload via URL ou base64
- Legendas opcionais e nomes personalizados para documentos

### Funcionalidade de Envio de Mídias

**Interface do Chat:**
- Menu de seleção de tipo de mídia (estilo WhatsApp) ao clicar no botão de anexo
- Preview interativo antes do envio para cada tipo de mídia
- Campo de legenda opcional
- Suporte para múltiplos formatos de arquivo
- Estados de loading/progresso durante upload
- Exibição de mensagens com mídia no histórico do chat

**Configuração Necessária:**
Para enviar mídias, os metadados da conversa (`metadata` campo JSONB) devem conter:
- `instanceNumber`: Número da instância WhatsApp (formato brasileiro: 55XXYYYYYYYY)
- `phoneNumber`: Número do destinatário

**Tipos de Mídia Suportados:**
- **Imagens**: JPG, PNG (preferência por JPG)
- **Vídeos**: MP4
- **Documentos**: PDF, DOCX, XLSX, TXT
- **Áudio**: MP3, OGG

**Fluxo de Envio:**
1. Usuário seleciona tipo de mídia no menu
2. Sistema abre seletor de arquivo com filtros apropriados
3. Preview da mídia é exibido em dialog
4. Usuário pode adicionar legenda opcional
5. Sistema valida configuração (instanceNumber e phoneNumber)
6. Mídia é enviada via UazAPI
7. Mensagem é salva no banco local com referência à mídia
8. Chat é atualizado em tempo real via WebSocket

## External Dependencies

### Third-Party Services

**Database:** Neon Serverless PostgreSQL (configured via `DATABASE_URL`).

### Key NPM Packages

**UI Components:** `@radix-ui/*`, `TailwindCSS`, `class-variance-authority`, `lucide-react`.

**State & Data:** `@tanstack/react-query`, `zustand`, `drizzle-orm`, `zod`.

**Development:** `Vite`, `TypeScript`, `express-rate-limit`.

### Environment Configuration

**Required Environment Variables:** `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`.