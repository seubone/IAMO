export interface ReleaseItem {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: string[];
  type: 'feature' | 'fix' | 'perf' | 'docs';
}

export interface DocumentationSection {
  id: string;
  title: string;
  description: string;
  content: string;
  subsections?: {
    id: string;
    title: string;
    content: string;
  }[];
}

export const releases: ReleaseItem[] = [
  {
    version: "v1.0.3",
    date: "2025-11-18",
    title: "Version Display & UI Polish",
    description: "Added version display throughout the application for better tracking and polished message styling.",
    type: 'feature',
    changes: [
      "Display version in bottom-right corner of login page",
      "Display version below logout button in sidebar footer",
      "Changed message bubble color to exact hex #3A4ACD for better visual hierarchy",
      "Centralized version configuration for easy updates",
      "Docker images pushed: v1.0.3 and latest tags"
    ]
  },
  {
    version: "v1.0.2",
    date: "2025-11-17",
    title: "Performance Optimization - Message Rendering",
    description: "Implemented instant message appearance with optimized state management and zero-latency rendering.",
    type: 'perf',
    changes: [
      "Implemented true instant message appearance with polling pause optimization",
      "Eliminated message rendering delays with staleTime configuration",
      "Added memoization for expensive component calculations",
      "Optimized React Query cache strategies for real-time messaging",
      "Achieved 0ms latency message appearance"
    ]
  },
  {
    version: "v1.0.1",
    date: "2025-11-16",
    title: "Database & Audio Fixes",
    description: "Fixed critical database connection timeouts and AudioContext cleanup issues.",
    type: 'fix',
    changes: [
      "Fixed database connection timeouts on Evolution API integration",
      "Implemented proper AudioContext cleanup in recording component",
      "Reduced connection pool size from 10 to 5 to prevent overload",
      "Added 120-second idle timeout for remote database connections",
      "Fixed audio recorder cleanup on component unmount",
      "Added error handling for stream track stopping"
    ]
  },
  {
    version: "v1.0.0",
    date: "2025-11-15",
    title: "Initial Release",
    description: "Simonia Platform - Complete AI Monitoring and WhatsApp Integration System.",
    type: 'feature',
    changes: [
      "Full authentication system with JWT and Supabase integration",
      "Real-time chat interface with WhatsApp Evolution API integration",
      "AI-powered conversation monitoring and analysis",
      "Message tagging system (engaged, payment_link, quote, paid)",
      "Audio message recording and transcription support",
      "Dashboard with analytics and metrics",
      "Ticket management system",
      "Audit logging for compliance",
      "Dark/Light theme support",
      "Responsive UI design for all devices",
      "PostgreSQL database with Drizzle ORM",
      "Multi-instance WhatsApp account management"
    ]
  }
];

export const documentation: DocumentationSection[] = [
  {
    id: "system-overview",
    title: "System Overview",
    description: "Complete overview of Simonia Platform architecture and components",
    content: `Simonia is a comprehensive AI-powered monitoring platform designed to manage and analyze WhatsApp conversations at scale. The system integrates with Evolution API for WhatsApp messaging and provides real-time monitoring, analytics, and conversation management capabilities.

The platform consists of three main layers:
- Frontend: React-based UI with real-time updates
- Backend: Node.js/Express server with REST API
- Database: PostgreSQL for persistent storage and Evolution API database for WhatsApp data`,
    subsections: [
      {
        id: "architecture",
        title: "Architecture",
        content: `The system follows a modern microservices-inspired architecture with clear separation of concerns:

**Frontend (React + Vite):**
- Component-based UI using Shadcn/ui components
- React Query for server state management
- Wouter for lightweight routing
- TailwindCSS for styling
- Real-time message updates with optimized polling

**Backend (Node.js + Express):**
- RESTful API with JWT authentication
- Drizzle ORM for type-safe database queries
- Lazy-loaded database connections
- Integration with Evolution API for WhatsApp
- Support for both native PostgreSQL and Neon connections

**Database:**
- Main Database (Neon PostgreSQL): User data, conversations, tickets
- Evolution Database (PostgreSQL): WhatsApp instance data and messages
- Separate connection pools for optimal performance`
      },
      {
        id: "authentication",
        title: "Authentication Flow",
        content: `Users authenticate through:
1. Email/Password login with bcrypt hashing
2. Google OAuth integration via Supabase
3. JWT token generation and validation
4. Secure token storage in localStorage
5. Remember-me functionality (email only, never password)

All API endpoints require valid JWT tokens in the Authorization header:
\`Authorization: Bearer <token>\``
      }
    ]
  },
  {
    id: "features",
    title: "Features",
    description: "Detailed documentation of all platform features",
    content: `Simonia provides comprehensive features for WhatsApp conversation management and AI monitoring.`,
    subsections: [
      {
        id: "chat-interface",
        title: "Chat Interface",
        content: `Real-time chat interface for managing WhatsApp conversations:

**Message Types:**
- Text messages with word wrapping
- Media messages (images, documents, audio)
- System messages for status updates

**Message Tagging:**
- Lead Engajado (Engaged Lead) - prospect shows interest
- Link de Pagamento (Payment Link) - payment initiated
- Orçamento (Quote) - quote provided to customer
- Pago (Paid) - payment received

**Message Actions:**
- Mark messages as read
- React with emojis
- Delete messages
- Display read receipts
- Presence indicators (typing, recording)`
      },
      {
        id: "multi-instance",
        title: "Multi-Instance Management",
        description: "Managing multiple WhatsApp accounts",
        content: `Manage multiple WhatsApp accounts simultaneously:

**Instance Selection:**
- Quick instance switcher in modal
- Search by name, number, or JID
- Filter by connection status (connected, disconnected, connecting)
- Instance profile pictures and metadata
- Instance settings and configuration

**Connection Status:**
- Open (Connected): Instance ready to use
- Close (Disconnected): Instance needs reconnection
- Connecting: Instance in connection process`
      },
      {
        id: "analytics",
        title: "Analytics & Dashboard",
        content: `Monitor conversation metrics and performance:

**Available Metrics:**
- Total conversations by status
- Message volume over time
- Response times and engagement rates
- Tag distribution analysis
- Instance performance statistics

**Dashboard Features:**
- Real-time data updates
- Customizable date ranges
- Export capabilities
- Performance insights`
      }
    ]
  },
  {
    id: "api-documentation",
    title: "API Documentation",
    description: "REST API endpoints and integration guide",
    content: `Complete API documentation for integrating with Simonia backend.`,
    subsections: [
      {
        id: "authentication-endpoints",
        title: "Authentication Endpoints",
        content: `\`\`\`
POST /api/auth/login
- Email/password authentication
- Returns: { user, token }

POST /api/auth/register
- Create new account
- Returns: { user, token }

GET /api/auth/me
- Get current user info
- Requires: Authorization header

PATCH /api/auth/profile
- Update user profile
- Body: { name?, avatar?, preferences? }

PATCH /api/auth/password
- Change password
- Body: { currentPassword, newPassword }
\`\`\``
      },
      {
        id: "whatsapp-endpoints",
        title: "WhatsApp Endpoints",
        content: `\`\`\`
GET /api/whatsapp/instances
- List available WhatsApp instances
- Query: ?inactive=true (optional)

GET /api/whatsapp/instance/status/:instanceNumber
- Get instance connection status

POST /api/whatsapp/send-message
- Send text message
- Body: { instanceNumber, recipientNumber, text }

POST /api/whatsapp/send-media
- Send media files
- Body: { instanceNumber, recipientNumber, type, file, text?, docName? }

POST /api/whatsapp/mark-read
- Mark messages as read
- Body: { instanceNumber, messageIds[] }

POST /api/whatsapp/react
- React to message
- Body: { instanceNumber, number, text, id }

POST /api/whatsapp/delete
- Delete message
- Body: { instanceNumber, id }

POST /api/whatsapp/presence
- Set presence status
- Body: { instanceNumber, number, presence, delay? }

POST /api/whatsapp/chat/archive
- Archive chat
- Body: { instanceNumber, number, archive }

POST /api/whatsapp/chat/pin
- Pin chat
- Body: { instanceNumber, number, pin }

POST /api/whatsapp/chat/read
- Mark chat as read
- Body: { instanceNumber, number, read }

POST /api/whatsapp/chat/check
- Check if numbers are valid WhatsApp users
- Body: { instanceNumber, numbers[] }
\`\`\``
      },
      {
        id: "conversation-endpoints",
        title: "Conversation Endpoints",
        content: `\`\`\`
GET /api/conversations
- List all conversations
- Pagination supported

GET /api/conversations/attendance/:attendanceId
- Get messages for specific conversation

POST /api/conversations
- Create new conversation
- Body: conversation data

PATCH /api/conversations/:id
- Update conversation
- Body: partial conversation data
\`\`\``
      }
    ]
  },
  {
    id: "database",
    title: "Database Schema",
    description: "Database structure and relationships",
    content: `Simonia uses PostgreSQL with Drizzle ORM for type-safe database operations.`,
    subsections: [
      {
        id: "main-tables",
        title: "Main Tables",
        content: `**Users:**
- id: UUID
- email: String (unique)
- name: String
- password: String (hashed)
- role: String
- created_at: Timestamp
- updated_at: Timestamp

**Conversations:**
- id: UUID
- user_id: UUID (FK)
- instance_id: String
- participant_number: String
- status: String
- created_at: Timestamp
- updated_at: Timestamp

**Messages:**
- id: UUID
- conversation_id: UUID (FK)
- sender: String (user/ia/system)
- content: Text
- tags: Array<String>
- timestamp: Timestamp

**Bot Instances:**
- id: Integer
- instance_number: String
- ai_config: JSON
- status: String
- created_at: Timestamp`
      },
      {
        id: "evolution-database",
        title: "Evolution API Database",
        content: `The Evolution database is a separate PostgreSQL instance that stores WhatsApp-specific data:

**Connection Details:**
- Separate connection pool for read operations
- Max 5 simultaneous connections
- 2-minute idle timeout
- 90-second query timeout

**Data Sync:**
- Real-time sync from Evolution API
- Separate schema for WhatsApp data
- Optimized for high-volume message handling
- Automatic cleanup of old data`
      }
    ]
  },
  {
    id: "development",
    title: "Development Guide",
    description: "Setup and development instructions",
    content: `Guide for setting up and developing on the Simonia platform.`,
    subsections: [
      {
        id: "setup",
        title: "Environment Setup",
        content: `**Prerequisites:**
- Node.js 20+
- PostgreSQL 13+
- Docker (recommended)

**Installation:**
1. Clone repository
2. Install dependencies: \`npm install\`
3. Configure .env with database credentials
4. Run migrations: \`npm run migrate\`
5. Start development: \`npm run dev\`

**Environment Variables:**
- DATABASE_URL: Main PostgreSQL connection
- EVOLUTION_DB_*: Evolution API database credentials
- SUPABASE_URL: Supabase project URL
- JWT_SECRET: JWT signing secret
- PORT: Backend server port (default 5049)
- FRONTEND_PORT: Frontend dev server port (default 5051)`
      },
      {
        id: "development-workflow",
        title: "Development Workflow",
        content: `**Frontend Development:**
\`\`\`bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run type-check   # Run TypeScript checks
\`\`\`

**Backend Development:**
- Server runs on port 5049
- Auto-reload enabled with nodemon
- Environment variables loaded from .env

**Database Migrations:**
\`\`\`bash
npm run migrate      # Apply migrations
npm run migrate:dev  # Development migrations
\`\`\`

**Docker Development:**
\`\`\`bash
docker build -t simonia:latest .
docker run -p 5049:5049 -p 5051:5051 simonia:latest
\`\`\``
      }
    ]
  },
  {
    id: "deployment",
    title: "Deployment",
    description: "Production deployment guide",
    content: `Instructions for deploying Simonia to production.`,
    subsections: [
      {
        id: "docker-deployment",
        title: "Docker Deployment",
        content: `**Building Docker Image:**
\`\`\`bash
docker build -t cainanmaia/simonia:v1.0.3 .
docker push cainanmaia/simonia:v1.0.3
\`\`\`

**Running Container:**
\`\`\`bash
docker run -d \\
  --name simonia \\
  -p 5049:5049 \\
  -e DATABASE_URL=postgresql://... \\
  -e EVOLUTION_DB_HOST=... \\
  cainanmaia/simonia:latest
\`\`\`

**Environment Configuration:**
All sensitive data should be passed via environment variables or Docker secrets.`
      },
      {
        id: "vps-deployment",
        title: "VPS Deployment",
        content: `**Prerequisites:**
- VPS with Docker installed
- Docker Hub account
- Domain and SSL certificate

**Deployment Steps:**
1. Push Docker image to Docker Hub
2. SSH into VPS
3. Pull latest image: \`docker pull cainanmaia/simonia:latest\`
4. Stop old container: \`docker stop simonia\`
5. Run new container with environment variables
6. Verify with health checks

**Monitoring:**
- Check container logs: \`docker logs simonia\`
- Monitor resource usage: \`docker stats\`
- Setup health checks for auto-restart`
      }
    ]
  }
];
