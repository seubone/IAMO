# Monitor IA 🤖

Sistema completo de monitoramento de Inteligências Artificiais integrado com N8N, Evolution API e Supabase.

## 📚 Documentação

Toda a documentação está organizada na pasta [`DOCS/`](./DOCS/):
- **[DOCS/INDEX.md](./DOCS/INDEX.md)** - Índice completo de documentação
- **[DOCS/DEV_STARTUP_GUIDE.md](./DOCS/DEV_STARTUP_GUIDE.md)** - Como iniciar desenvolvimento
- **[DOCS/TROUBLESHOOTING_GUIDE.md](./DOCS/TROUBLESHOOTING_GUIDE.md)** - Guia de troubleshooting

## ✨ Features Principais

- 🔐 Autenticação Segura com Supabase (verificação de email)
- 📊 Dashboard em Tempo Real com métricas de performance
- 💬 Chat Integrado com WhatsApp via Evolution API
- 🎫 Sistema de Tickets com priorização e rastreamento
- 📱 Monitoramento WhatsApp com polling automático
- 🔍 Auditoria Completa de ações de usuários
- 🎨 UI Moderna com tema claro/escuro
- 📈 Métricas de IA (taxa de resposta, conversão, etc)
- 👥 RBAC (Role-Based Access Control) nativo
- 🔄 Sincronização Automática entre Supabase e BD local

## 🚀 Quick Start

### Pré-requisitos

- Node.js >= 18.x
- npm ou yarn
- PostgreSQL (para BD local)
- Conta Supabase (para autenticação)

### Instalação

1. Clone o repositório
   ```bash
   git clone https://github.com/seubone/IAMO.git
   cd IAMO
   ```

2. Instale as dependências
   ```bash
   npm install
   ```

3. Configure variáveis de ambiente
   ```bash
   cp .env.example .env
   ```

4. Execute migrations
   ```bash
   npm run db:push
   ```

5. Inicie o servidor
   ```bash
   npm run dev
   ```

6. Acesse a aplicação
   - Frontend: http://localhost:5000
   - Backend API: http://localhost:5051

## 🔐 Autenticação

### Fluxo de Login
1. Usuário preenche credenciais
2. Backend autentica com Supabase
3. Supabase retorna JWT token
4. Token armazenado no localStorage
5. Usuário redirecionado ao dashboard

### Fluxo de Registro com Email Verification
1. Usuário preenche formulário
2. Backend cria conta no Supabase
3. Supabase envia email de confirmação
4. Usuário clica no link
5. Callback processa confirmação
6. Usuário autenticado automaticamente

## 🗄️ Banco de Dados

Usa Drizzle ORM com PostgreSQL:
- users - Usuários do sistema com RBAC
- ias - Inteligências artificiais monitoradas
- tickets - Sistema de tickets
- conversations - Conversas do WhatsApp
- messages - Mensagens de chat
- metrics - Métricas de performance
- actions - Log de auditoria
- settings - Configurações globais

## 🔌 API Endpoints

### Autenticação
- POST /api/auth/register - Criar conta
- POST /api/auth/login - Fazer login
- GET /api/auth/me - Dados do usuário

### Monitoramento
- GET /api/ias - Listar IAs
- GET /api/tickets - Listar tickets
- GET /api/actions - Log de auditoria

## 🛠️ Stack Tecnológico

### Frontend
- React 18.3, TypeScript 5.6, Vite 5.4
- TailwindCSS 3.4, Shadcn/ui, TanStack Query
- Wouter (router), Zustand (state)

### Backend
- Express 4.21, Node.js 22, PostgreSQL
- Drizzle ORM, Supabase, WebSocket

## 📝 Licença

MIT License

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📊 Status do Projeto

| Feature | Status |
|---------|--------|
| Autenticação Supabase | ✅ |
| Email Verification | ✅ |
| Dashboard | ✅ |
| WhatsApp Integration | ✅ |
| Sistema de Tickets | ✅ |
| Auditoria | ✅ |
| RBAC | ✅ |
| WebSocket Real-time | ✅ |
| Dark Mode | ✅ |

---

Desenvolvido com ❤️ por Claude

Última atualização: Outubro 2025
