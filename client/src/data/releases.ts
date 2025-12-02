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
    version: "v1.0.52",
    date: "2025-12-02",
    title: "Fix: Automatic Evolution DB Fallback",
    description: "Correção definitiva do erro 'database simonia does not exist' - o sistema agora usa automaticamente Evolution DB sem necessidade de DATABASE_URL ou comandos manuais.",
    type: 'fix',
    changes: [
      "✅ DATABASE_URL agora é OPCIONAL - sistema usa Evolution DB automaticamente",
      "✅ Detecção inteligente: se DATABASE_URL aponta para 'simonia' inexistente, faz fallback automático",
      "✅ Connection string construída automaticamente a partir de EVOLUTION_DB_* variables",
      "✅ Logging claro mostrando qual banco está sendo usado",
      "✅ .env.example atualizado documentando configuração simplificada",
      "✅ Zero comandos manuais necessários - deploy direto via Easypanel/Docker",
      "✅ Compatível com arquitetura de produção (Supabase + Evolution DB apenas)"
    ]
  },
  {
    version: "v1.0.51",
    date: "2025-12-02",
    title: "Fix: Database Setup & Deployment Scripts",
    description: "Correção completa do erro 'database simonia does not exist' com scripts automatizados e documentação detalhada para setup do banco de dados em produção.",
    type: 'fix',
    changes: [
      "✅ Script automatizado de setup do banco (scripts/setup-production-db.sh)",
      "✅ Migration standalone sem FK para Supabase (create-instance-contact-status-table-standalone.sql)",
      "✅ Documentação completa de setup do banco (docs/DATABASE_SETUP.md)",
      "✅ Guia rápido de correção (FIX_DATABASE_ERROR.md)",
      "✅ DEPLOY_v1.0.5.md atualizado com instruções de pré-requisitos",
      "✅ .gitignore permite commits de scripts/*.sh para facilitar deployment",
      "✅ Correção do erro de bot-status-maintenance falhando ao iniciar"
    ]
  },
  {
    version: "v1.0.4",
    date: "2025-12-01",
    title: "Code Review Completo & Limpeza de Codebase",
    description: "Análise profunda de instabilidade, documentação de problemas e propostas de solução. Codebase limpo removendo 80+ arquivos desnecessários.",
    type: 'docs',
    changes: [
      "✅ Code Review completo identificando causa raiz de instâncias caindo",
      "✅ 5 documentos de análise técnica gerados (2000+ linhas)",
      "✅ Solução pronta para reconexão automática WebSocket (v1.0.4+)",
      "✅ Proposta de reorganização de código (features pattern)",
      "✅ Codebase limpo: removidos 80+ arquivos obsoletos e .env desnecessários",
      "✅ Apenas documentação ÚTIL mantida no projeto"
    ]
  },
  {
    version: "v1.0.33",
    date: "2025-11-20",
    title: "Melhorias de Confiabilidade no Carregamento de Instâncias",
    description: "Corrige travamentos e melhora a performance ao carregar instâncias com otimizações no pool de conexão do banco Evolution.",
    type: 'perf',
    changes: [
      "Aumentado timeout de query de 5s para 10s para melhor tolerância a conexões lentas",
      "Pool de conexão otimizado: máximo de 10 conexões (de 5) com 2 conexões aquecidas",
      "Cleanup adequado de timers para evitar memory leaks",
      "Validação de tipo para respostas do DB e API",
      "Logging detalhado com contexto de erro para melhor debug",
      "Status HTTP 503 para erros de serviço (ao invés de 500)"
    ]
  },
  {
    version: "v1.0.32",
    date: "2025-11-19",
    title: "Envio de Mensagens Restaurado & Fallback de Instâncias",
    description: "Garante que o composer de mensagens sempre apareça e adiciona fallback automático para listar instâncias mesmo quando o banco Evolution está lento.",
    type: 'fix',
    changes: [
      "Composer permanece visível sempre que há instância selecionada, mesmo sem número salvo",
      "Seleção automática de chat garante campo de texto pronto para digitar ao abrir o chat",
      "Endpoint /api/whatsapp/instances aplica timeout de 5s e faz fallback na Evolution API quando o banco Evolution falha",
      "Exibição de versão atualizada para v1.0.32 em todo o app",
      "Preparado build/pipeline Docker para a tag v1.0.32"
    ]
  },
  {
    version: "v1.0.31",
    date: "2025-11-18",
    title: "Exibição de Versão & Polimento da Interface",
    description: "Adicionada exibição de versão em toda a aplicação para melhor rastreamento e polimento de estilo das mensagens.",
    type: 'feature',
    changes: [
      "Exibição de versão no canto inferior direito da página de login",
      "Exibição de versão abaixo do botão de sair na barra lateral",
      "Alterada cor da caixa de mensagem para hex exato #3A4ACD",
      "Configuração de versão centralizada para atualizações fáceis",
      "Imagens Docker enviadas: tags v1.0.31 e latest"
    ]
  },
  {
    version: "v1.0.2",
    date: "2025-11-17",
    title: "Otimização de Performance - Renderização de Mensagens",
    description: "Implementado aparecimento instantâneo de mensagens com gerenciamento de estado otimizado e renderização com latência zero.",
    type: 'perf',
    changes: [
      "Implementado aparecimento verdadeiramente instantâneo de mensagens",
      "Eliminadas demoras de renderização com configuração de staleTime",
      "Adicionada memoização para cálculos de componentes caros",
      "Otimizadas estratégias de cache do React Query",
      "Alcançada latência de 0ms no aparecimento de mensagens"
    ]
  },
  {
    version: "v1.0.1",
    date: "2025-11-16",
    title: "Correções de Banco de Dados & Áudio",
    description: "Corrigidos timeouts críticos de conexão com banco de dados e problemas de limpeza do AudioContext.",
    type: 'fix',
    changes: [
      "Corrigidos timeouts de conexão com banco de dados na integração Evolution API",
      "Implementada limpeza apropriada do AudioContext no componente de gravação",
      "Reduzido tamanho do pool de conexões de 10 para 5 para prevenir sobrecarga",
      "Adicionado timeout de 120 segundos para conexões de banco de dados remoto",
      "Corrigida limpeza do gravador de áudio ao desmontar componente",
      "Adicionado tratamento de erro para parar de rastrear fluxo"
    ]
  },
  {
    version: "v1.0.0",
    date: "2025-11-15",
    title: "Lançamento Inicial",
    description: "Plataforma Simonia - Sistema Completo de Monitoramento de IA e Integração WhatsApp.",
    type: 'feature',
    changes: [
      "Sistema completo de autenticação com JWT e integração Supabase",
      "Interface de chat em tempo real com integração Evolution API WhatsApp",
      "Monitoramento e análise de conversas alimentada por IA",
      "Sistema de marcação de mensagens (engajado, link_pagamento, orçamento, pago)",
      "Suporte para gravação e transcrição de mensagens de áudio",
      "Dashboard com análise e métricas",
      "Sistema de gerenciamento de tickets",
      "Log de auditoria para conformidade",
      "Suporte para temas escuro/claro",
      "Design responsivo para todos os dispositivos",
      "Banco de dados PostgreSQL com Drizzle ORM",
      "Gerenciamento de múltiplas contas WhatsApp"
    ]
  }
];

export const documentation: DocumentationSection[] = [
  {
    id: "system-overview",
    title: "Visão Geral do Sistema",
    description: "Visão geral completa da arquitetura e componentes da plataforma Simonia",
    content: `Simonia é uma plataforma abrangente de monitoramento alimentada por IA, projetada para gerenciar e analisar conversas do WhatsApp em escala. O sistema se integra com a Evolution API para mensagens do WhatsApp e oferece recursos de monitoramento em tempo real, análise e gerenciamento de conversas.

A plataforma consiste em três camadas principais:
- Frontend: UI baseada em React com atualizações em tempo real
- Backend: Servidor Node.js/Express com API REST
- Banco de Dados: PostgreSQL para armazenamento persistente e banco de dados Evolution API para dados WhatsApp`,
    subsections: [
      {
        id: "architecture",
        title: "Arquitetura",
        content: `O sistema segue uma arquitetura moderna inspirada em microsserviços com separação clara de responsabilidades:

**Frontend (React + Vite):**
- UI baseada em componentes usando componentes Shadcn/ui
- React Query para gerenciamento de estado do servidor
- Wouter para roteamento leve
- TailwindCSS para estilos
- Atualizações de mensagens em tempo real com polling otimizado

**Backend (Node.js + Express):**
- API RESTful com autenticação JWT
- Drizzle ORM para consultas tipo-seguras
- Conexões de banco de dados carregadas preguiçosamente
- Integração com Evolution API para WhatsApp
- Suporte para conexões nativas PostgreSQL e Neon

**Banco de Dados:**
- Banco de Dados Principal (Neon PostgreSQL): Dados de usuários, conversas, tickets
- Banco de Dados Evolution (PostgreSQL): Dados específicos WhatsApp e mensagens
- Pools de conexão separados para desempenho ótimo`
      },
      {
        id: "authentication",
        title: "Fluxo de Autenticação",
        content: `Os usuários se autenticam através de:
1. Login com Email/Senha com hash bcrypt
2. Integração Google OAuth via Supabase
3. Geração e validação de token JWT
4. Armazenamento seguro de token no localStorage
5. Funcionalidade Lembrar-me (apenas email, nunca senha)

Todos os endpoints da API exigem tokens JWT válidos no cabeçalho Authorization:
\`Authorization: Bearer <token>\``
      }
    ]
  },
  {
    id: "features",
    title: "Recursos",
    description: "Documentação detalhada de todos os recursos da plataforma",
    content: `Simonia oferece recursos abrangentes para gerenciamento de conversas do WhatsApp e monitoramento de IA.`,
    subsections: [
      {
        id: "chat-interface",
        title: "Interface de Chat",
        content: `Interface de chat em tempo real para gerenciar conversas do WhatsApp:

**Tipos de Mensagem:**
- Mensagens de texto com quebra de linha
- Mensagens de mídia (imagens, documentos, áudio)
- Mensagens de sistema para atualizações de status

**Marcação de Mensagens:**
- Lead Engajado - prospect demonstra interesse
- Link de Pagamento - pagamento iniciado
- Orçamento - orçamento fornecido ao cliente
- Pago - pagamento recebido

**Ações de Mensagem:**
- Marcar mensagens como lidas
- Reagir com emojis
- Deletar mensagens
- Exibir confirmações de leitura
- Indicadores de presença (digitando, gravando)`
      },
      {
        id: "multi-instance",
        title: "Gerenciamento de Múltiplas Instâncias",
        description: "Gerenciamento de múltiplas contas WhatsApp",
        content: `Gerencie múltiplas contas WhatsApp simultaneamente:

**Seleção de Instância:**
- Seletor rápido de instância em modal
- Pesquisa por nome, número ou JID
- Filtro por status de conexão (conectado, desconectado, conectando)
- Fotos de perfil da instância e metadados
- Configurações e configuração da instância

**Status de Conexão:**
- Open (Conectado): Instância pronta para usar
- Close (Desconectado): Instância precisa reconectar
- Connecting: Instância em processo de conexão`
      },
      {
        id: "analytics",
        title: "Analytics & Dashboard",
        content: `Monitore métricas de conversação e desempenho:

**Métricas Disponíveis:**
- Total de conversas por status
- Volume de mensagens ao longo do tempo
- Tempos de resposta e taxas de engajamento
- Análise de distribuição de tags
- Estatísticas de desempenho da instância

**Recursos do Dashboard:**
- Atualizações de dados em tempo real
- Intervalos de data personalizáveis
- Recursos de exportação
- Insights de desempenho`
      }
    ]
  },
  {
    id: "api-documentation",
    title: "Documentação da API",
    description: "Endpoints REST e guia de integração",
    content: `Documentação completa da API para integração com backend Simonia.`,
    subsections: [
      {
        id: "authentication-endpoints",
        title: "Endpoints de Autenticação",
        content: `\`\`\`
POST /api/auth/login
- Autenticação de email/senha
- Retorna: { user, token }

POST /api/auth/register
- Criar nova conta
- Retorna: { user, token }

GET /api/auth/me
- Obter informações do usuário atual
- Requer: Cabeçalho Authorization

PATCH /api/auth/profile
- Atualizar perfil do usuário
- Body: { name?, avatar?, preferences? }

PATCH /api/auth/password
- Alterar senha
- Body: { currentPassword, newPassword }
\`\`\``
      },
      {
        id: "whatsapp-endpoints",
        title: "Endpoints WhatsApp",
        content: `\`\`\`
GET /api/whatsapp/instances
- Lista instâncias WhatsApp disponíveis
- Query: ?inactive=true (opcional)

GET /api/whatsapp/instance/status/:instanceNumber
- Obter status da conexão da instância

POST /api/whatsapp/send-message
- Enviar mensagem de texto
- Body: { instanceNumber, recipientNumber, text }

POST /api/whatsapp/send-media
- Enviar arquivos de mídia
- Body: { instanceNumber, recipientNumber, type, file, text?, docName? }

POST /api/whatsapp/mark-read
- Marcar mensagens como lidas
- Body: { instanceNumber, messageIds[] }

POST /api/whatsapp/react
- Reagir a mensagem
- Body: { instanceNumber, number, text, id }

POST /api/whatsapp/delete
- Deletar mensagem
- Body: { instanceNumber, id }

POST /api/whatsapp/presence
- Definir status de presença
- Body: { instanceNumber, number, presence, delay? }

POST /api/whatsapp/chat/archive
- Arquivar chat
- Body: { instanceNumber, number, archive }

POST /api/whatsapp/chat/pin
- Fixar chat
- Body: { instanceNumber, number, pin }

POST /api/whatsapp/chat/read
- Marcar chat como lido
- Body: { instanceNumber, number, read }

POST /api/whatsapp/chat/check
- Verificar se números são usuários WhatsApp válidos
- Body: { instanceNumber, numbers[] }
\`\`\``
      },
      {
        id: "conversation-endpoints",
        title: "Endpoints de Conversação",
        content: `\`\`\`
GET /api/conversations
- Lista todas as conversas
- Paginação suportada

GET /api/conversations/attendance/:attendanceId
- Obter mensagens de conversação específica

POST /api/conversations
- Criar nova conversação
- Body: dados de conversação

PATCH /api/conversations/:id
- Atualizar conversação
- Body: dados parciais de conversação
\`\`\``
      }
    ]
  },
  {
    id: "database",
    title: "Schema do Banco de Dados",
    description: "Estrutura do banco de dados e relacionamentos",
    content: `Simonia usa PostgreSQL com Drizzle ORM para operações tipo-seguras.`,
    subsections: [
      {
        id: "main-tables",
        title: "Tabelas Principais",
        content: `**Usuários:**
- id: UUID
- email: String (único)
- name: String
- password: String (hash)
- role: String
- created_at: Timestamp
- updated_at: Timestamp

**Conversas:**
- id: UUID
- user_id: UUID (FK)
- instance_id: String
- participant_number: String
- status: String
- created_at: Timestamp
- updated_at: Timestamp

**Mensagens:**
- id: UUID
- conversation_id: UUID (FK)
- sender: String (user/ia/system)
- content: Text
- tags: Array<String>
- timestamp: Timestamp

**Instâncias do Bot:**
- id: Integer
- instance_number: String
- ai_config: JSON
- status: String
- created_at: Timestamp`
      },
      {
        id: "evolution-database",
        title: "Banco de Dados Evolution API",
        content: `O banco de dados Evolution é uma instância PostgreSQL separada que armazena dados específicos do WhatsApp:

**Detalhes de Conexão:**
- Pool de conexão separado para operações de leitura
- Máximo 5 conexões simultâneas
- Timeout de inatividade de 2 minutos
- Timeout de consulta de 90 segundos

**Sincronização de Dados:**
- Sincronização em tempo real da Evolution API
- Schema separado para dados WhatsApp
- Otimizado para manipulação de mensagens de alto volume
- Limpeza automática de dados antigos`
      }
    ]
  },
  {
    id: "development",
    title: "Guia de Desenvolvimento",
    description: "Instruções de configuração e desenvolvimento",
    content: `Guia para configurar e desenvolver na plataforma Simonia.`,
    subsections: [
      {
        id: "setup",
        title: "Configuração do Ambiente",
        content: `**Pré-requisitos:**
- Node.js 20+
- PostgreSQL 13+
- Docker (recomendado)

**Instalação:**
1. Clone o repositório
2. Instale dependências: \`npm install\`
3. Configure .env com credenciais do banco de dados
4. Execute migrações: \`npm run migrate\`
5. Inicie desenvolvimento: \`npm run dev\`

**Variáveis de Ambiente:**
- DATABASE_URL: Conexão PostgreSQL principal
- EVOLUTION_DB_*: Credenciais banco de dados Evolution API
- SUPABASE_URL: URL do projeto Supabase
- JWT_SECRET: Secret para assinatura JWT
- PORT: Porta do servidor backend (padrão 5049)
- FRONTEND_PORT: Porta do servidor dev frontend (padrão 5051)`
      },
      {
        id: "development-workflow",
        title: "Fluxo de Desenvolvimento",
        content: `**Desenvolvimento Frontend:**
\`\`\`bash
npm run dev          # Inicia servidor dev Vite
npm run build        # Build para produção
npm run type-check   # Executa verificações TypeScript
\`\`\`

**Desenvolvimento Backend:**
- Servidor executa na porta 5049
- Auto-reload habilitado com nodemon
- Variáveis de ambiente carregadas do .env

**Migrações de Banco de Dados:**
\`\`\`bash
npm run migrate      # Aplicar migrações
npm run migrate:dev  # Migrações de desenvolvimento
\`\`\`

**Desenvolvimento Docker:**
\`\`\`bash
docker build -t simonia:latest .
docker run -p 5049:5049 -p 5051:5051 simonia:latest
\`\`\``
      }
    ]
  },
  {
    id: "deployment",
    title: "Implantação",
    description: "Guia de implantação em produção",
    content: `Instruções para implantar Simonia em produção.`,
    subsections: [
      {
        id: "docker-deployment",
        title: "Implantação Docker",
        content: `**Construindo Imagem Docker:**
\`\`\`bash
docker build -t cainanmaia/simonia:v1.0.32 .
docker push cainanmaia/simonia:v1.0.32
\`\`\`

**Executando Container:**
\`\`\`bash
docker run -d \\
  --name simonia \\
  -p 5049:5049 \\
  -e DATABASE_URL=postgresql://... \\
  -e EVOLUTION_DB_HOST=... \\
  cainanmaia/simonia:latest
\`\`\`

**Configuração de Ambiente:**
Todos os dados sensíveis devem ser passados via variáveis de ambiente ou Docker secrets.`
      },
      {
        id: "vps-deployment",
        title: "Implantação em VPS",
        content: `**Pré-requisitos:**
- VPS com Docker instalado
- Conta Docker Hub
- Domínio e certificado SSL

**Passos de Implantação:**
1. Fazer push da imagem Docker para Docker Hub
2. SSH para a VPS
3. Fazer pull da imagem mais recente: \`docker pull cainanmaia/simonia:latest\`
4. Parar container antigo: \`docker stop simonia\`
5. Executar novo container com variáveis de ambiente
6. Verificar com health checks

**Monitoramento:**
- Verificar logs do container: \`docker logs simonia\`
- Monitorar uso de recursos: \`docker stats\`
- Configurar health checks para auto-restart`
      }
    ]
  }
];
