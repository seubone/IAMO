# 🏗️ ARQUITETURA COMPLETA DA VPS - MAPA HIERÁRQUICO

**VPS IP:** `31.97.255.54`
**Data:** 11 de Novembro de 2025
**Status:** ✅ Em Produção

---

## 📊 ESTRUTURA HIERÁRQUICA VISUAL

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          INTERNET / USUÁRIOS FINAIS                          │
│         (Navegadores, Apps Mobile, APIs de terceiros, Webhooks)             │
└──────────────────────────────────────────────────────────────────────────────┘
                                     ↓
                              (HTTP/HTTPS)
                                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                    🌐 CAMADA 1: REVERSE PROXY (GATEWAY)                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    TRAEFIK 3.3.7 (Reverse Proxy)                       │ │
│  │                                                                        │ │
│  │  PORTAS LISTENING:                                                   │ │
│  │  • :80    → HTTP (automático redirect para HTTPS)                    │ │
│  │  • :443   → HTTPS (SSL/TLS com Let's Encrypt)                       │ │
│  │  • :8080  → Dashboard (API & UI de configuração)                    │ │
│  │                                                                      │ │
│  │  ROTEAMENTO (Host-based routing):                                   │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │ portainer-cabone.cabonesolucoes.com.br → Portainer:9000      │  │ │
│  │  │ evolution-cabone.cabonesolucoes.com.br → Evolution API:8080  │  │ │
│  │  │ chatwoot-cabone.cabonesolucoes.com.br  → Chatwoot:3001       │  │ │
│  │  │ monitor-cabone.cabonesolucoes.com.br   → Monitor IA:5051     │  │ │
│  │  │ api-cabone.cabonesolucoes.com.br       → API Backend:3000    │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                      │ │
│  │  CERTIFICADOS SSL:                                                 │ │
│  │  • Let's Encrypt automático (ACME HTTP Challenge)                 │ │
│  │  • Email: ti@carbonecompany.com.br                                │ │
│  │  • Armazenamento: /letsencrypt/acme.json (volume persistente)     │ │
│  │  • Renovação: Automática (60 dias antes de expirar)              │ │
│  │                                                                      │ │
│  │  FUNCIONALIDADES:                                                  │ │
│  │  ✓ Load balancing entre múltiplas instâncias                     │ │
│  │  ✓ Middleware de compressão (gzip)                              │ │
│  │  ✓ Rate limiting (DDoS protection)                              │ │
│  │  ✓ CORS headers automático                                       │ │
│  │  ✓ Health checks (readiness probes)                             │ │
│  │  ✓ Logs estruturados (JSON)                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                     ↓
                    (Roteia para containers internos)
                                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│           🎛️ CAMADA 2: GERENCIAMENTO & ORQUESTRAÇÃO (CONTROL PLANE)         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    PORTAINER-CE (Container Management)                │ │
│  │                                                                        │ │
│  │  PORTAS:                                                             │ │
│  │  • :8000  → Edge Agent (comunicação interna)                        │ │
│  │  • :9000  → HTTP Web UI (para administradores)                      │ │
│  │  • :9443  → HTTPS Web UI (TLS nativo)                               │ │
│  │  • :80/:443 → Via Traefik (reverse proxy)                          │ │
│  │                                                                      │ │
│  │  FUNCIONALIDADES:                                                  │ │
│  │  ✓ Dashboard visual de todos os containers                         │ │
│  │  ✓ Deploy de Docker Compose stacks                                 │ │
│  │  ✓ Gerenciamento de volumes e backups                             │ │
│  │  ✓ Logs em tempo real com busca/filtro                            │ │
│  │  ✓ Métricas de CPU, memória, rede (Prometheus)                   │ │
│  │  ✓ Gerenciamento de imagens Docker                                │ │
│  │  ✓ Webhooks integrados (deploy automático no push)               │ │
│  │  ✓ RBAC (Role-Based Access Control) para usuários                │ │
│  │  ✓ Registry integrado (Docker Hub, Private Registry)             │ │
│  │                                                                      │ │
│  │  VOLUME PERSISTENTE:                                               │ │
│  │  └─ portainer_data:/data → Configurações e BD SQLite             │ │
│  │                                                                      │ │
│  │  ACESSO:                                                           │ │
│  │  • URL: https://portainer-cabone.cabonesolucoes.com.br           │ │
│  │  • Usuário: admin (definido no primeiro acesso)                  │ │
│  │  • Senha: Configurada na instalação                              │ │
│  │                                                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                     ↓
          (Executa e gerencia containers via Docker Socket)
                                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│              🐳 CAMADA 3: APLICAÇÕES E SERVIÇOS (DATA PLANE)                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗ │
│  ║                  📦 GRUPO 1: INFRA COMPARTILHADA                       ║ │
│  ║                   (Suporta todos os outros serviços)                   ║ │
│  ╠════════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                        ║ │
│  ║  ┌──────────────────────────────────────────────────────────────────┐║ │
│  ║  │ 🗄️ POSTGRESQL 15-ALPINE (Banco de Dados Central)                ││ │
│  ║  │                                                                  ││ │
│  ║  │ CONTAINER: postgres_main                                        ││ │
│  ║  │ IMAGE: postgres:15-alpine                                       ││ │
│  ║  │ PORTA: 5432 (interna)                                          ││ │
│  ║  │ STATUS: ✅ Em execução                                         ││ │
│  ║  │                                                                  ││ │
│  ║  │ CREDENCIAIS:                                                    ││ │
│  ║  │ ├─ User: postgres                                              ││ │
│  ║  │ ├─ Pass: postgres_secure_pass_123                              ││ │
│  ║  │ └─ SuperUser: Acesso total (não compartilhado)                ││ │
│  ║  │                                                                  ││ │
│  ║  │ BANCOS DE DADOS:                                               ││ │
│  ║  │ ├─ monitor_ia                                                  ││ │
│  ║  │ │  ├─ Usado por: Monitor IA (Backend Node.js)                ││ │
│  ║  │ │  ├─ Tabelas: users, conversations, analytics               ││ │
│  ║  │ │  └─ Backup: Diário às 02:00 UTC                            ││ │
│  ║  │ │                                                               ││ │
│  ║  │ ├─ chatwoot                                                    ││ │
│  ║  │ │  ├─ Usado por: Evolution API + Chatwoot (WhatsApp)         ││ │
│  ║  │ │  ├─ Tabelas: conversations, messages, contacts, etc         ││ │
│  ║  │ │  └─ Backup: Diário às 02:30 UTC                            ││ │
│  ║  │ │                                                               ││ │
│  ║  │ └─ main_db                                                     ││ │
│  ║  │    ├─ Uso: Futuros projetos e integrações                    ││ │
│  ║  │    └─ Vazio (pronto para usar)                               ││ │
│  ║  │                                                                  ││ │
│  ║  │ VOLUME PERSISTENTE:                                            ││ │
│  ║  │ └─ postgres_data:/var/lib/postgresql/data                     ││ │
│  ║  │                                                                  ││ │
│  ║  │ HEALTH CHECK:                                                  ││ │
│  ║  │ └─ pg_isready (a cada 10s)                                    ││ │
│  ║  │                                                                  ││ │
│  ║  │ RESTART POLICY:                                                ││ │
│  ║  │ └─ unless-stopped (reinicia automático em crash)              ││ │
│  ║  │                                                                  ││ │
│  ║  └──────────────────────────────────────────────────────────────────┘║ │
│  ║                                                                        ║ │
│  ║  ┌──────────────────────────────────────────────────────────────────┐║ │
│  ║  │ ⚡ REDIS 7-ALPINE (Cache & Session Storage)                       ││ │
│  ║  │                                                                  ││ │
│  ║  │ CONTAINER: redis_main                                          ││ │
│  ║  │ IMAGE: redis:7-alpine                                          ││ │
│  ║  │ PORTA: 6379 (interna)                                          ││ │
│  ║  │ STATUS: ✅ Em execução                                         ││ │
│  ║  │                                                                  ││ │
│  ║  │ CREDENCIAIS:                                                    ││ │
│  ║  │ └─ Password: redis_secure_pass_123                             ││ │
│  ║  │                                                                  ││ │
│  ║  │ FUNCIONALIDADE:                                                 ││ │
│  ║  │ ├─ Cache de sessões de usuário (Evolution + Monitor)           ││ │
│  ║  │ ├─ Rate limiting (requisições por IP)                         ││ │
│  ║  │ ├─ Job queue (background tasks)                               ││ │
│  ║  │ ├─ Pub/Sub (real-time updates)                                ││ │
│  ║  │ └─ Temporary data storage                                      ││ │
│  ║  │                                                                  ││ │
│  ║  │ VOLUME PERSISTENTE:                                            ││ │
│  ║  │ └─ redis_data:/data (RDB snapshots)                           ││ │
│  ║  │                                                                  ││ │
│  ║  │ CONFIGURAÇÃO:                                                  ││ │
│  ║  │ ├─ appendonly yes (durabilidade)                              ││ │
│  ║  │ ├─ requirepass redis_secure_pass_123 (autenticação)           ││ │
│  ║  │ └─ maxmemory 1gb (limite de memória)                          ││ │
│  ║  │                                                                  ││ │
│  ║  │ HEALTH CHECK:                                                  ││ │
│  ║  │ └─ redis-cli PING (a cada 10s)                                ││ │
│  ║  │                                                                  ││ │
│  ║  └──────────────────────────────────────────────────────────────────┘║ │
│  ║                                                                        ║ │
│  ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗ │
│  ║              🔗 GRUPO 2: EVOLUTION (WhatsApp Management)               ║ │
│  ║                   ⏳ Status: Planejado (Futura Implementação)          ║ │
│  ╠════════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                        ║ │
│  ║  ┌──────────────────────────────────────────────────────────────────┐║ │
│  ║  │ 📱 EVOLUTION API (WhatsApp Instance Management)                 ││ │
│  ║  │                                                                  ││ │
│  ║  │ CONTAINER: evolution_main                                       ││ │
│  ║  │ IMAGE: evolution:latest (ou versão específica)                 ││ │
│  ║  │ PORTA: 8080 (interna)                                          ││ │
│  ║  │ STATUS: ⏳ A ser iniciado                                       ││ │
│  ║  │                                                                  ││ │
│  ║  │ ACESSO EXTERNO:                                                 ││ │
│  ║  │ └─ https://evolution-cabone.cabonesolucoes.com.br (via Traefik)││ │
│  ║  │                                                                  ││ │
│  ║  │ FUNCIONALIDADE:                                                 ││ │
│  ║  │ ├─ Gerenciar múltiplas instâncias WhatsApp                    ││ │
│  ║  │ ├─ QR Code para autenticação                                  ││ │
│  ║  │ ├─ Enviar/receber mensagens                                   ││ │
│  ║  │ ├─ Webhook para eventos (mensagens recebidas, status)         ││ │
│  ║  │ ├─ REST API para integração                                   ││ │
│  ║  │ ├─ Dashboard de instâncias                                    ││ │
│  ║  │ └─ Autenticação por API Key                                   ││ │
│  ║  │                                                                  ││ │
│  ║  │ CONEXÕES:                                                       ││ │
│  ║  │ ├─ PostgreSQL: chatwoot (armazena dados de instâncias)        ││ │
│  ║  │ ├─ Redis: redis_main (cache e sessions)                       ││ │
│  ║  │ └─ Traefik: para acesso externo seguro                        ││ │
│  ║  │                                                                  ││ │
│  ║  │ VOLUMES PERSISTENTES:                                          ││ │
│  ║  │ ├─ evolution_instances:/app/instances (dados WhatsApp)        ││ │
│  ║  │ └─ evolution_media:/app/media (mídia armazenada localmente)   ││ │
│  ║  │                                                                  ││ │
│  ║  │ VARIÁVEIS DE AMBIENTE:                                         ││ │
│  ║  │ ├─ SERVER_URL: https://evolution-cabone.cabonesolucoes...     ││ │
│  ║  │ ├─ DATABASE_URL: postgresql://postgres:...@postgres_main:5432 ││ │
│  ║  │ ├─ REDIS_URL: redis://:redis_secure_pass_123@redis_main:6379 ││ │
│  ║  │ ├─ API_KEY: evolution_api_key_123456789 (gerado aleatoriamente)││ │
│  ║  │ └─ LOG_LEVEL: info                                            ││ │
│  ║  │                                                                  ││ │
│  ║  │ DOCKER COMPOSE FILE:                                           ││ │
│  ║  │ └─ /opt/evolution_recovery/docker-compose.yml                 ││ │
│  ║  │                                                                  ││ │
│  ║  │ API ENDPOINTS (via Traefik):                                   ││ │
│  ║  │ ├─ POST   /instances            → Criar nova instância        ││ │
│  ║  │ ├─ GET    /instances            → Listar todas as instâncias  ││ │
│  ║  │ ├─ GET    /instances/{id}       → Detalhes de uma instância   ││ │
│  ║  │ ├─ POST   /instances/{id}/qr    → Gerar QR Code               ││ │
│  ║  │ ├─ POST   /instances/{id}/send  → Enviar mensagem             ││ │
│  ║  │ ├─ DELETE /instances/{id}       → Deletar instância           ││ │
│  ║  │ └─ POST   /webhook/receive      → Receber webhooks            ││ │
│  ║  │                                                                  ││ │
│  ║  └──────────────────────────────────────────────────────────────────┘║ │
│  ║                                                                        ║ │
│  ║  ┌──────────────────────────────────────────────────────────────────┐║ │
│  ║  │ 💬 CHATWOOT (WhatsApp Interface & Conversations)                ││ │
│  ║  │                                                                  ││ │
│  ║  │ CONTAINER: chatwoot_recovery                                   ││ │
│  ║  │ IMAGE: chatwoot/chatwoot:v4.6.0                                ││ │
│  ║  │ PORTA: 3001 (interna)                                          ││ │
│  ║  │ STATUS: ✅ Em execução                                         ││ │
│  ║  │                                                                  ││ │
│  ║  │ ACESSO EXTERNO:                                                 ││ │
│  ║  │ └─ https://chatwoot-cabone.cabonesolucoes.com.br (via Traefik)││ │
│  ║  │                                                                  ││ │
│  ║  │ FUNCIONALIDADE:                                                 ││ │
│  ║  │ ├─ Interface de atendimento (agent inbox)                     ││ │
│  ║  │ ├─ Gerenciar conversas WhatsApp                               ││ │
│  ║  │ ├─ Histórico de mensagens                                     ││ │
│  ║  │ ├─ Roteamento inteligente de conversa                         ││ │
│  ║  │ ├─ Canned responses (respostas pré-definidas)                ││ │
│  ║  │ ├─ Reports e analytics                                        ││ │
│  ║  │ ├─ Integração com Evolution API                               ││ │
│  ║  │ └─ Multi-agent collaboration                                  ││ │
│  ║  │                                                                  ││ │
│  ║  │ CONEXÕES:                                                       ││ │
│  ║  │ ├─ PostgreSQL: chatwoot (todas as conversas e dados)          ││ │
│  ║  │ ├─ Redis: redis_main (sessions e caching)                     ││ │
│  ║  │ └─ Evolution API: para receber/enviar mensagens               ││ │
│  ║  │                                                                  ││ │
│  ║  │ VOLUMES PERSISTENTES:                                          ││ │
│  ║  │ ├─ chatwoot_app:/app/storage (uploads e attachments)          ││ │
│  ║  │ └─ chatwoot_data:/var/lib/postgresql (banco de dados)         ││ │
│  ║  │                                                                  ││ │
│  ║  │ VARIÁVEIS DE AMBIENTE:                                         ││ │
│  ║  │ ├─ FRONTEND_URL: https://chatwoot-cabone.cabonesolucoes...    ││ │
│  ║  │ ├─ DATABASE_URL: postgresql://postgres:...@postgres_main      ││ │
│  ║  │ ├─ REDIS_URL: redis://:redis_secure_pass_123@redis_main       ││ │
│  ║  │ ├─ SECRET_KEY_BASE: 475e4e83fde589d2c4de7f9e150a997c          ││ │
│  ║  │ ├─ RAILS_ENV: production                                      ││ │
│  ║  │ └─ DEFAULT_LOCALE: pt_BR                                      ││ │
│  ║  │                                                                  ││ │
│  ║  │ DOCKER COMPOSE FILE:                                           ││ │
│  ║  │ └─ /opt/chatwoot_recovery/docker-compose.yml                  ││ │
│  ║  │                                                                  ││ │
│  ║  └──────────────────────────────────────────────────────────────────┘║ │
│  ║                                                                        ║ │
│  ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗ │
│  ║         📊 GRUPO 3: MONITOR IA (Analytics & Intelligence)              ║ │
│  ║                   ⏳ Status: Planejado (Futura Implementação)           ║ │
│  ╠════════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                        ║ │
│  ║  ┌──────────────────────────────────────────────────────────────────┐║ │
│  ║  │ 🤖 MONITOR IA (Backend + Frontend Dashboard)                    ││ │
│  ║  │                                                                  ││ │
│  ║  │ CONTAINER: monitor_ia_app                                       ││ │
│  ║  │ IMAGE: monitor-ia:latest (custom build)                        ││ │
│  ║  │ PORTA: 5051 (interna)                                          ││ │
│  ║  │ STATUS: ⏳ A ser iniciado                                       ││ │
│  ║  │                                                                  ││ │
│  ║  │ ACESSO EXTERNO:                                                 ││ │
│  ║  │ └─ https://monitor-cabone.cabonesolucoes.com.br (via Traefik)  ││ │
│  ║  │                                                                  ││ │
│  ║  │ STACK TECNOLÓGICO:                                              ││ │
│  ║  │ ├─ Backend: Node.js 20 + Express.js                           ││ │
│  ║  │ ├─ Frontend: React 18 + Vite                                   ││ │
│  ║  │ ├─ Autenticação: Supabase Auth                                 ││ │
│  ║  │ ├─ Comunicação: REST API + WebSockets (real-time)             ││ │
│  ║  │ └─ Deployment: Docker (multi-stage build)                     ││ │
│  ║  │                                                                  ││ │
│  ║  │ FUNCIONALIDADE:                                                 ││ │
│  ║  │ ├─ Dashboard de conversas WhatsApp                            ││ │
│  ║  │ ├─ Analytics em tempo real (mensagens, usuários ativos)       ││ │
│  ║  │ ├─ Integração de IA (análise de sentimentos, tags)            ││ │
│  ║  │ ├─ Exportação de dados (CSV, PDF, Excel)                     ││ │
│  ║  │ ├─ Relatórios automáticos                                     ││ │
│  ║  │ ├─ Webhook triggers para automação                            ││ │
│  ║  │ ├─ Integração com Supabase (usuários, permissões)             ││ │
│  ║  │ └─ API para terceiros (webhooks, REST)                        ││ │
│  ║  │                                                                  ││ │
│  ║  │ CONEXÕES:                                                       ││ │
│  ║  │ ├─ PostgreSQL: monitor_ia (analytics, conversations, users)    ││ │
│  ║  │ ├─ PostgreSQL: chatwoot (leitura de dados Evolution)          ││ │
│  ║  │ ├─ Redis: redis_main (cache de analytics)                     ││ │
│  ║  │ ├─ Supabase: autenticação de usuários                         ││ │
│  ║  │ └─ Evolution API: WebSocket para eventos em tempo real         ││ │
│  ║  │                                                                  ││ │
│  ║  │ VOLUMES PERSISTENTES:                                          ││ │
│  ║  │ └─ monitor_ia_data:/app/data (uploads e relatórios)           ││ │
│  ║  │                                                                  ││ │
│  ║  │ VARIÁVEIS DE AMBIENTE:                                         ││ │
│  ║  │ ├─ DATABASE_URL: postgresql://postgres:...@postgres_main      ││ │
│  ║  │ ├─ EVOLUTION_DB_HOST: postgres_main                           ││ │
│  ║  │ ├─ EVOLUTION_DB_NAME: chatwoot                                ││ │
│  ║  │ ├─ JWT_SECRET: super-secret-key-change-in-production          ││ │
│  ║  │ ├─ SUPABASE_URL: https://svfucusuhnwmwyojmxgr.supabase.co     ││ │
│  ║  │ ├─ SUPABASE_ANON_KEY: [key aqui]                              ││ │
│  ║  │ ├─ PORT: 5051                                                 ││ │
│  ║  │ └─ NODE_ENV: production                                       ││ │
│  ║  │                                                                  ││ │
│  ║  │ DOCKERFILE:                                                     ││ │
│  ║  │ └─ /opt/monitor_ia/Dockerfile (multi-stage: builder + runtime)││ │
│  ║  │                                                                  ││ │
│  ║  │ DOCKER COMPOSE FILE:                                           ││ │
│  ║  │ └─ /opt/monitor_ia/docker-compose.yml                         ││ │
│  ║  │                                                                  ││ │
│  ║  │ API ENDPOINTS (via Traefik):                                   ││ │
│  ║  │ ├─ GET    /api/health              → Status do servidor       ││ │
│  ║  │ ├─ GET    /api/analytics/summary   → Sumário de analytics     ││ │
│  ║  │ ├─ GET    /api/conversations       → Listar conversas         ││ │
│  ║  │ ├─ GET    /api/conversations/{id}  → Detalhes conversa        ││ │
│  ║  │ ├─ POST   /api/reports/generate    → Gerar relatório          ││ │
│  ║  │ ├─ GET    /api/export/{format}     → Exportar dados           ││ │
│  ║  │ ├─ POST   /api/webhook/register    → Registrar webhook        ││ │
│  ║  │ └─ GET    /api/user/profile        → Perfil do usuário        ││ │
│  ║  │                                                                  ││ │
│  ║  └──────────────────────────────────────────────────────────────────┘║ │
│  ║                                                                        ║ │
│  ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗ │
│  ║           🚀 GRUPO 4: EXTENSÕES FUTURAS (Roadmap)                     ║ │
│  ║                        ⏳ Status: Planejado                            ║ │
│  ╠════════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                        ║ │
│  ║  ┌─────────────────────────────────────────────────────────────────┐ ║ │
│  ║  │ 🤖 AI Bot Service (Node.js/Python)                             │ ║ │
│  ║  │ • Processamento de NLP (resposta automática)                   │ ║ │
│  ║  │ • Integração com OpenAI/Hugging Face                          │ ║ │
│  ║  │ • Fila de processamento (Bull Queue)                          │ ║ │
│  ║  └─────────────────────────────────────────────────────────────────┘ ║ │
│  ║                                                                        ║ │
│  ║  ┌─────────────────────────────────────────────────────────────────┐ ║ │
│  ║  │ 🪝 Webhook Handler Service (Node.js)                            │ ║ │
│  ║  │ • Processa eventos de Evolution/Chatwoot                       │ ║ │
│  ║  │ • Retries automáticos com backoff exponencial                  │ ║ │
│  ║  │ • Integração com serviços externos (Zapier, Make)             │ ║ │
│  ║  └─────────────────────────────────────────────────────────────────┘ ║ │
│  ║                                                                        ║ │
│  ║  ┌─────────────────────────────────────────────────────────────────┐ ║ │
│  ║  │ 📈 Advanced Analytics (Python/R)                               │ ║ │
│  ║  │ • Previsões de demanda (ML models)                            │ ║ │
│  ║  │ • Clustering de usuários (K-means, DBSCAN)                    │ ║ │
│  ║  │ • Anomaly detection                                           │ ║ │
│  ║  └─────────────────────────────────────────────────────────────────┘ ║ │
│  ║                                                                        ║ │
│  ║  ┌─────────────────────────────────────────────────────────────────┐ ║ │
│  ║  │ 📞 Phone Integration (Twilio/Vonage)                           │ ║ │
│  ║  │ • Suporte a ligações telefônicas                              │ ║ │
│  ║  │ • SMS integrado com WhatsApp                                  │ ║ │
│  ║  └─────────────────────────────────────────────────────────────────┘ ║ │
│  ║                                                                        ║ │
│  ║  ┌─────────────────────────────────────────────────────────────────┐ ║ │
│  ║  │ 🎯 CRM Integration (HubSpot, Salesforce)                       │ ║ │
│  ║  │ • Sync de contatos bidirecional                               │ ║ │
│  ║  │ • Pipeline de vendas automático                               │ ║ │
│  ║  └─────────────────────────────────────────────────────────────────┘ ║ │
│  ║                                                                        ║ │
│  ║  ┌─────────────────────────────────────────────────────────────────┐ ║ │
│  ║  │ 🔔 Notification Service (Push, Email, SMS)                     │ ║ │
│  ║  │ • Alertas para agentes                                        │ ║ │
│  ║  │ • Relatórios automáticos por email                            │ ║ │
│  ║  └─────────────────────────────────────────────────────────────────┘ ║ │
│  ║                                                                        ║ │
│  ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│            💾 CAMADA 4: ARMAZENAMENTO PERSISTENTE (VOLUMES)                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Local de Armazenamento: /var/lib/docker/volumes/                          │
│                                                                              │
│  ┌─ DADOS DE INFRA                                                         │
│  │  ├─ portainer_data/          [100 MB]  Config + BD SQLite              │
│  │  ├─ postgres_data/           [5-10 GB] PostgreSQL (schemas + índices)  │
│  │  ├─ redis_data/              [500 MB]  RDB snapshots + AOF logs        │
│  │  └─ traefik_data/            [50 MB]   Certificados SSL (ACME)         │
│  │                                                                          │
│  ├─ DADOS DE EVOLUTION                                                    │
│  │  ├─ evolution_instances/     [2-5 GB]  Dados de instâncias WhatsApp    │
│  │  └─ evolution_media/         [5-20 GB] Mídia armazenada localmente     │
│  │                                                                          │
│  ├─ DADOS DE CHATWOOT                                                     │
│  │  ├─ chatwoot_data/           [1-3 GB]  PostgreSQL internal (separado)  │
│  │  └─ chatwoot_app/            [2-5 GB]  Uploads, attachments, avatars   │
│  │                                                                          │
│  └─ DADOS DE MONITOR IA                                                   │
│     ├─ monitor_ia_data/         [500 MB]  Uploads, relatórios, cache      │
│     └─ monitor_ia_logs/         [100 MB]  Logs estruturados (JSON)        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│             ☁️ INTEGRAÇÕES EXTERNAS (Fora da VPS)                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  • Supabase Cloud (Autenticação de usuários)                              │
│  • Let's Encrypt (Certificados SSL automáticos)                           │
│  • DNS Provider (Domínios: cabonesolucoes.com.br)                        │
│  • WhatsApp Official API (Opcional: complementar Evolution)               │
│  • External Storage (S3, Backblaze B2 para backups)                       │
│  • Monitoring (Datadog, New Relic para métricas)                          │
│  • Log Aggregation (ELK Stack ou Loki para logs centralizados)            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 FLUXO DE DADOS E CONECTIVIDADE

```
┌─────────────────────────────┐
│   USUÁRIO FINAL             │
│  (Browser/Mobile)           │
└──────────────┬──────────────┘
               │ (HTTPS)
               ↓
┌──────────────────────────────────────────────────────────────┐
│ TRAEFIK (Reverse Proxy)                                      │
│                                                              │
│ Host: portainer-cabone... → Port 9000 (Portainer)          │
│ Host: evolution-cabone...  → Port 8080 (Evolution)          │
│ Host: chatwoot-cabone...   → Port 3001 (Chatwoot)          │
│ Host: monitor-cabone...    → Port 5051 (Monitor IA)         │
└──────────────┬───────────────────────────────────────────────┘
               │
               ↓
    ┌──────────┴────────────┐
    │                       │
    ↓                       ↓
┌─────────────┐      ┌──────────────┐
│  Portainer  │      │  Aplicações  │
│             │      │              │
│  Docker UI  │      │  Evolution   │
│  +          │      │  Chatwoot    │
│  Management │      │  Monitor IA  │
└─────┬───────┘      └────────┬─────┘
      │                       │
      │    ┌──────────────────┘
      │    │
      └────┼──────────────────┐
           │                  │
           ↓                  ↓
    ┌─────────────┐  ┌──────────────┐
    │ PostgreSQL  │  │    Redis     │
    │             │  │              │
    │ 3 Bancos:   │  │ Cache &      │
    │ -monitor_ia │  │ Sessions     │
    │ -chatwoot   │  │              │
    │ -main_db    │  │ Porta: 6379  │
    │             │  │              │
    │ Porta: 5432 │  └──────────────┘
    └─────────────┘

┌────────────────────────────────────────┐
│  INTEGRAÇÕES EXTERNAS                  │
│                                        │
│  • Supabase (Auth)                    │
│  • Let's Encrypt (SSL)                │
│  • WhatsApp (API opcional)            │
│  • External Services (Webhooks)       │
└────────────────────────────────────────┘
```

---

## 🗂️ ESTRUTURA DE DIRETÓRIOS NA VPS

```
/opt/
│
├─ portainer_stack/                    ✅ ATIVO
│  ├─ docker-compose.yml               (PostgreSQL + Redis + Traefik + Portainer)
│  ├─ .env                             (Variáveis de ambiente)
│  └─ /letsencrypt/                    (Certificados SSL automáticos)
│     └─ acme.json                     (Dados do Let's Encrypt)
│
├─ evolution_recovery/                 ⏳ PLANEJADO
│  ├─ docker-compose.yml               (Evolution API)
│  └─ .env
│
├─ chatwoot_recovery/                  ✅ ATIVO
│  ├─ docker-compose.yml               (Chatwoot v4.6.0)
│  └─ .env
│
├─ monitor_ia/                         ⏳ PLANEJADO
│  ├─ Dockerfile                       (Multi-stage build)
│  ├─ docker-compose.yml               (Monitor IA app)
│  ├─ .env
│  ├─ package.json                     (Node.js dependencies)
│  └─ /src/
│     ├─ /server/                      (Backend Express)
│     │  ├─ index.js
│     │  ├─ routes/
│     │  ├─ middleware/
│     │  └─ utils/
│     └─ /client/                      (Frontend React)
│        ├─ index.html
│        ├─ src/
│        │  ├─ App.tsx
│        │  ├─ pages/
│        │  ├─ components/
│        │  └─ hooks/
│        └─ vite.config.ts
│
├─ backups/                            🔒 CRÍTICO
│  ├─ postgres_backup.sql              (Backup diário PostgreSQL)
│  ├─ redis_backup.rdb                 (Backup Redis)
│  ├─ volumes_backup.tar.gz            (Backup de volumes)
│  ├─ schedule.sh                      (Script cron)
│  └─ /remote/                         (Sync para S3/external)
│
└─ monitoring/                         📊 ADICIONAL
   ├─ prometheus.yml                   (Scrape targets)
   ├─ grafana/                         (Dashboards)
   └─ alerting-rules.yml               (Alertas)
```

---

## 📋 MAPA DE PORTAS CONSOLIDADO

| Porta | Serviço | Container | Protocolo | Acesso | Status |
|-------|---------|-----------|-----------|--------|--------|
| **80** | Traefik HTTP | traefik_main | HTTP | Público | ✅ |
| **443** | Traefik HTTPS | traefik_main | HTTPS | Público | ✅ |
| **8080** | Traefik Dashboard | traefik_main | HTTP | Interno | ✅ |
| **8080** | Evolution API | evolution_main | HTTP (via Traefik) | Público | ⏳ |
| **9000** | Portainer HTTP | portainer_main | HTTP | Interno | ✅ |
| **9443** | Portainer HTTPS | portainer_main | HTTPS | Interno | ✅ |
| **3001** | Chatwoot | chatwoot_recovery | HTTP (via Traefik) | Público | ✅ |
| **5051** | Monitor IA | monitor_ia_app | HTTP (via Traefik) | Público | ⏳ |
| **5432** | PostgreSQL | postgres_main | TCP | Apenas Docker | ✅ |
| **6379** | Redis | redis_main | TCP | Apenas Docker | ✅ |

---

## 🔐 REDE DOCKER

```
Network: portainer_network (bridge mode)

┌─────────────────────────────────────────────────────────────┐
│                  DOCKER NETWORK (Internal)                  │
│                                                              │
│  Containers conectados:                                     │
│  • postgres_main       (hostname: postgres_main:5432)      │
│  • redis_main          (hostname: redis_main:6379)         │
│  • traefik_main        (hostname: traefik_main)            │
│  • portainer_main      (hostname: portainer_main)          │
│  • evolution_main      (hostname: evolution_main)          │
│  • chatwoot_recovery   (hostname: chatwoot_recovery)       │
│  • monitor_ia_app      (hostname: monitor_ia_app)          │
│                                                              │
│  DNS Resolution:                                            │
│  Todos os containers podem se comunicar usando hostnames   │
│  Exemplo: evolution → postgresql://postgres_main:5432      │
│                                                              │
│  Isolamento:                                                │
│  ✓ Não expõe porta 5432 (PostgreSQL) diretamente          │
│  ✓ Não expõe porta 6379 (Redis) diretamente               │
│  ✓ Apenas Traefik com acesso ao Docker socket             │
│  ✓ Acesso externo apenas via Traefik (ports 80/443)       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ SEGURANÇA - Camadas de Proteção

```
1️⃣ NETWORK SECURITY
   ├─ Firewall na VPS (iptables/ufw)
   │  └─ Portas abertas: 22, 80, 443 (SSH, HTTP, HTTPS)
   ├─ Docker bridge network (containers isolados)
   └─ Docker socket permission (apenas root/docker group)

2️⃣ APPLICATION SECURITY
   ├─ HTTPS/TLS obrigatório (Let's Encrypt)
   ├─ Senha PostgreSQL: postgres_secure_pass_123
   ├─ Senha Redis: redis_secure_pass_123
   ├─ API Key Evolution: Gerada aleatoriamente
   ├─ JWT Secret: Armazenado em /opt/portainer_stack/.env
   └─ Autenticação Portainer: Configurada no primeiro acesso

3️⃣ DATA SECURITY
   ├─ Volumes persistentes (não ephemeral)
   ├─ Backup automático diário (cron)
   ├─ Backup remoto (S3/Backblaze - opcional)
   ├─ Encryption at rest (filesystem level - opcional)
   └─ Encryption in transit (TLS/HTTPS)

4️⃣ CONTAINER SECURITY
   ├─ Images verificadas (chatwoot, postgres oficial)
   ├─ Non-root users (containers não rodam como root)
   ├─ Resource limits (CPU, memória)
   ├─ Health checks automáticos
   └─ Restart policies (unless-stopped)

5️⃣ MONITORING & LOGGING
   ├─ Docker logs centralizados
   ├─ Portainer logs e alertas
   ├─ PostgreSQL slow query logs
   ├─ Traefik access logs (JSON)
   └─ Application logs (strukturert JSON)
```

---

## 📊 DIMENSIONAMENTO E RECURSOS

```
RECOMENDADO PARA VPS COM:
┌──────────────────────────────┐
│ CPU: 4 cores (mínimo 2)      │
│ RAM: 8 GB (mínimo 4 GB)      │
│ Storage: 100 GB (mínimo 50GB)│
│ Bandwidth: Ilimitado          │
└──────────────────────────────┘

ALOCAÇÃO POR CONTAINER:
┌────────────────────────────────────────────────────┐
│ Portainer:          0.5 CPU, 512 MB RAM            │
│ PostgreSQL:         1.0 CPU, 2 GB RAM             │
│ Redis:              0.5 CPU, 512 MB RAM           │
│ Traefik:            0.5 CPU, 256 MB RAM           │
│ Evolution API:      1.0 CPU, 2 GB RAM             │
│ Chatwoot:           1.0 CPU, 2 GB RAM             │
│ Monitor IA:         1.0 CPU, 1.5 GB RAM           │
├────────────────────────────────────────────────────┤
│ TOTAL:              5.5 CPU, 10.3 GB RAM          │
│ Com margem (200%):  11 CPU, 20.6 GB RAM           │
└────────────────────────────────────────────────────┘

ATUAL: 31.97.255.54 parece ter ±4 cores e 4-8 GB
→ Suficiente para fase inicial
→ Planejar upgrade conforme crescimento
```

---

## ✅ CHECKLIST DE IMPLANTAÇÃO

### Fase 1: ✅ CONCLUÍDA
- [x] Docker oficial instalado
- [x] Portainer + PostgreSQL + Redis rodando
- [x] Traefik configurado (portas 80/443)
- [x] Volumes persistentes criados
- [x] SSL/TLS automático via Let's Encrypt

### Fase 2: ⏳ PRÓXIMA
- [ ] Apontar DNS (portainer-cabone... → 31.97.255.54)
- [ ] Criar login Portainer (primeiro acesso)
- [ ] Testar acesso via HTTPS (domínio)
- [ ] Criar backup script automatizado
- [ ] Configurar monitoramento (Portainer/Prometheus)

### Fase 3: 🚀 EVOLUTION + CHATWOOT
- [ ] Deploy Evolution API via Portainer
- [ ] Integrar Chatwoot com Evolution
- [ ] Testar fluxo WhatsApp end-to-end
- [ ] Configurar webhooks

### Fase 4: 📊 MONITOR IA
- [ ] Build Docker do Monitor IA
- [ ] Deploy via Portainer
- [ ] Integração com banco chatwoot (leitura)
- [ ] Integração com Supabase (auth)
- [ ] Testes de analytics

### Fase 5: 🔒 HARDENING & PRODUÇÃO
- [ ] Backup automático (cron jobs)
- [ ] Monitoramento contínuo (alertas)
- [ ] Load testing
- [ ] Security audit
- [ ] Documentação final

---

## 📞 CONTATO & SUPORTE

**Gerenciamento:** Portainer: https://portainer-cabone.cabonesolucoes.com.br
**Email:** ti@carbonecompany.com.br
**Documentação:** Este arquivo (VPS_ARCHITECTURE.md)
**Status de Saúde:** Acessar Portainer → Containers → Health checks
