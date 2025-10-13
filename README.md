# Monitor IA - Sistema de Monitoramento de Inteligências Artificiais

Sistema completo de monitoramento de IAs integrado com N8N, desenvolvido com React + Node.js + TypeScript.

## 🚀 Funcionalidades

### Core Features
- **Monitoramento em Tempo Real**: Ticker dinâmico exibindo status das IAs (Ativo 🟢, Pausado 🟡, Inativo 🔴)
- **Sistema de Tickets**: Feed em tempo real de logs/erros com busca, filtros e paginação
- **Chat com Leads**: Conversação em tempo real com tags automáticas e notas
- **Dashboard de Métricas**: KPIs de performance, conversão e engajamento
- **Kanban de Tickets**: Visualização em colunas (Novo/Atendimento/Resolvido)
- **Auditoria Completa**: Registro de todas as ações dos usuários

### Segurança e Autenticação
- **JWT Authentication**: Autenticação segura com tokens JWT
- **RBAC (Role-Based Access Control)**: 3 níveis de permissão:
  - **Admin**: Acesso completo + criar/inativar IAs
  - **Operador**: Gerenciar tickets e ações das IAs
  - **Visualizador**: Apenas visualização

### Integrações
- **N8N Webhook**: Endpoint `/webhooks/n8n/log` para receber logs/erros automaticamente
- **WebSocket**: Comunicação em tempo real (requer autenticação JWT)
- **Rate Limiting**: Proteção contra abuso de endpoints

## 🛠 Stack Tecnológica

### Frontend
- React 18 + Vite
- TypeScript
- TailwindCSS + Shadcn UI
- React Query (TanStack Query)
- Zustand (state management)
- Wouter (routing)
- WebSocket client

### Backend
- Node.js + Express
- TypeScript
- WebSocket (ws)
- JWT + bcryptjs
- Zod (validação)
- Rate limiting

### Database
- PostgreSQL (via Neon)
- Drizzle ORM
- In-memory storage (desenvolvimento)

## 📋 Pré-requisitos

- Node.js 20+
- npm ou yarn

## 🔧 Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure variáveis de ambiente (opcional):
```bash
# .env
JWT_SECRET=seu-secret-aqui
DATABASE_URL=postgresql://...
```

## 🚀 Executando o Projeto

### Desenvolvimento
```bash
npm run dev
```

O servidor estará disponível em: `http://localhost:5000`

### Produção
```bash
npm run build
npm start
```

## 🔑 Credenciais de Acesso

O sistema vem com usuários pré-configurados para desenvolvimento:

| Perfil | Email | Senha | Permissões |
|--------|-------|-------|------------|
| **Admin** | admin@monitor.ia | admin123 | Acesso total |
| **Operador** | operador@monitor.ia | operator123 | Gerenciar tickets/IAs |
| **Visualizador** | viewer@monitor.ia | viewer123 | Apenas visualização |

## 📡 API Endpoints

### Autenticação
- `POST /api/auth/register` - Criar novo usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Obter usuário atual (requer auth)

### IAs
- `GET /api/ias` - Listar todas as IAs
- `GET /api/ias/:id` - Obter IA específica
- `POST /api/ias` - Criar IA (admin only)
- `PATCH /api/ias/:id` - Atualizar status da IA

### Tickets
- `GET /api/tickets` - Listar todos os tickets
- `GET /api/tickets/ia/:iaId` - Tickets de uma IA específica
- `POST /api/tickets` - Criar ticket
- `PATCH /api/tickets/:id` - Atualizar status do ticket

### Auditoria
- `GET /api/actions` - Listar todas as ações
- `GET /api/actions/ia/:iaId` - Ações de uma IA específica

### Conversas e Mensagens
- `GET /api/conversations` - Listar conversas
- `GET /api/conversations/attendance/:id` - Conversa por ID de atendimento
- `PATCH /api/conversations/:id` - Atualizar conversa
- `GET /api/messages/conversation/:id` - Mensagens de uma conversa
- `POST /api/messages` - Criar mensagem

### Métricas
- `GET /api/metrics/ia/:iaId` - Métricas de uma IA

### Webhook N8N
- `POST /webhooks/n8n/log` - Receber logs do N8N

**Formato do webhook:**
```json
{
  "iaId": "uuid-da-ia",
  "attendanceId": "ATD-12345",
  "errorType": "prompt|automation|negotiation",
  "severity": "low|medium|high|critical",
  "message": "Descrição do erro",
  "suggestion": "Sugestão de correção (opcional)",
  "origin": "N8N Webhook"
}
```

## 🔌 WebSocket

Conecte ao WebSocket em tempo real para receber atualizações:

```javascript
const token = "seu-jwt-token";
const ws = new WebSocket(`ws://localhost:5000/ws?token=${token}`);

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  // type: 'ia_created' | 'ia_updated' | 'ticket_created' | 'ticket_updated' | 'message_created'
  console.log(type, data);
};
```

## 🎨 Temas

O sistema suporta tema claro e escuro:

### Paleta de Cores
- **Background Light**: `#FFFFFF`
- **Background Dark**: `#0B0B0D`
- **Primary (Amarelo)**: `#FBC000`
- **Primary Contrast**: `#050403`

### Design Tokens
- Sucesso: Verde (`#059669`)
- Aviso: Amarelo (`#FBC000`)
- Erro: Vermelho (`#EF4444`)
- Info: Azul (`#3B82F6`)

## 🏗 Estrutura do Projeto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilitários e API client
│   │   └── App.tsx        # Componente raiz
│   └── index.html
│
├── server/                # Backend Node.js
│   ├── middleware/        # Auth, RBAC
│   ├── routes.ts          # API routes + WebSocket
│   ├── storage.ts         # Interface de storage
│   ├── seed.ts            # Dados iniciais
│   └── index.ts           # Entry point
│
├── shared/                # Código compartilhado
│   └── schema.ts          # Schema Drizzle + Zod
│
└── README.md
```

## 🔐 Segurança

### Implementações de Segurança
- ✅ JWT com expiração de 7 dias
- ✅ Senhas hasheadas com bcrypt (10 rounds)
- ✅ Rate limiting em rotas sensíveis
- ✅ WebSocket autenticado via JWT
- ✅ RBAC com 3 níveis de permissão
- ✅ Validação de dados com Zod

### Recomendações para Produção
- [ ] Configurar `JWT_SECRET` forte (32+ caracteres aleatórios)
- [ ] Usar HTTPS em produção
- [ ] Configurar CORS adequadamente
- [ ] Implementar refresh tokens
- [ ] Adicionar 2FA para admins
- [ ] Configurar logs estruturados
- [ ] Implementar monitoramento (Sentry, DataDog)

## 📝 Fluxos de Uso

### 1. Monitorar IAs
1. Login no sistema
2. Visualizar ticker com status em tempo real
3. Filtrar tickets por severidade/tipo
4. Clicar em ticket para ver detalhes
5. Painel direito exibe ações disponíveis

### 2. Intervir em uma IA
1. Selecionar IA no painel
2. Escolher ação (Ativar/Pausar/Inativar)
3. Informar motivo da ação
4. Ação é registrada em auditoria
5. WebSocket notifica todos os clientes conectados

### 3. Gerenciar Chat
1. Acessar módulo de Chat
2. Visualizar conversa em tempo real
3. Ativar/desativar IA no chat
4. Adicionar notas à conversa
5. Tags são aplicadas automaticamente

### 4. Visualizar Dashboard
1. Acessar Dashboard
2. Selecionar período (7/30/90 dias)
3. Visualizar KPIs principais
4. Analisar métricas por IA
5. Identificar oportunidades de melhoria

## 🧪 Testing

```bash
# Unit tests (futuramente)
npm test

# E2E tests (futuramente)
npm run test:e2e
```

## 📦 Build

```bash
npm run build
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é licenciado sob a MIT License.

## 🆘 Suporte

Para suporte, entre em contato através do email: suporte@monitor.ia

---

**Monitor IA** - Desenvolvido com ❤️ usando React, Node.js e TypeScript
