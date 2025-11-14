# Changelog: Sistema de Instâncias Evolution API

## Versão 1.0.0 - 2025-11-14

### Implementações Principais

#### Backend

- **`server/services/evolution-instances.ts`** (NEW)
  - Service completo para integração com Evolution API
  - Funções para criar, conectar, reiniciar, deletar instâncias
  - Validação de dados com Zod
  - Tratamento robusto de erros
  - Normalização de números de telefone

- **`server/routes/instances.routes.ts`** (NEW)
  - 7 endpoints HTTP para gerenciar instâncias
  - POST `/api/instances` - Criar (com QR Code obrigatório)
  - GET `/api/instances` - Listar
  - GET `/api/instances/{id}/connect` - Gerar QR Code
  - PUT `/api/instances/{id}/restart` - Reiniciar
  - GET `/api/instances/{id}/connection-state` - Estado
  - DELETE `/api/instances/{id}/logout` - Logout
  - DELETE `/api/instances/{id}` - Deletar
  - POST `/api/instances/{id}/presence` - Presença
  - Middleware para validar credenciais Evolution API
  - Sincronização automática com Supabase

- **`server/routes.ts`** (MODIFIED)
  - Registrado novo router: `registerInstanceRoutes(app)`
  - Importado: `import { registerInstanceRoutes }`

#### Frontend - Componentes

- **`client/src/components/CreateInstanceDialog.tsx`** (REFACTORED)
  - Design melhorado com Tabs (Básico + Avançado)
  - QR Code gerado AUTOMATICAMENTE (não é mais opcional)
  - Sem emojis
  - Cores e espaçamento profissionais
  - Instruções passo-a-passo para escanear
  - 4 configurações avançadas:
    - Sempre Online
    - Marcar Mensagens como Lido
    - Ler Status de Contatos
    - Rejeitar Chamadas Automaticamente
  - Validação de formulário completa
  - Toast notifications para erro/sucesso
  - Loading states

- **`client/src/components/RegenerateQRCodeDialog.tsx`** (NEW)
  - Componente exclusivo para gerar QR Code em instâncias desconectadas
  - Dialog modal com instruções visuais
  - Geração automática ao abrir
  - Opção de gerar novo código
  - Instruções de reconexão
  - Tratamento de erros

- **`client/src/components/ChatListSidebar.tsx`** (MODIFIED)
  - Adicionado prop `onCreateInstanceClick`
  - Novo botão "+" para criar instância
  - Integrado com `CreateInstanceDialog`

- **`client/src/pages/whatsapp.tsx`** (MODIFIED)
  - Adicionado import do `CreateInstanceDialog`
  - Novo state: `isCreateInstanceDialogOpen`
  - Passado prop `onCreateInstanceClick` para ChatListSidebar
  - Renderizado `CreateInstanceDialog` ao final

#### Frontend - APIs

- **`client/src/lib/apis.ts`** (NEW)
  - Arquivo centralizado com todas as APIs
  - **evolutionInstancesAPI** - Todas operações com instâncias
  - **aiDataAPI** - Gerenciamento de IAs
  - **whatsappAPI** - Envio de mensagens
  - **cacheHelpers** - Invalidação de cache React Query
  - Tratamento de erros padronizado
  - Tipos TypeScript completos
  - Headers de autenticação automáticos

#### Documentação

- **`docs/CRIAR_INSTANCIA.md`** (NEW)
  - Guia completo de criação de instâncias
  - Endpoints da API com exemplos cURL
  - Troubleshooting
  - Estrutura técnica
  - Fluxo de dados

- **`docs/SETUP_INSTANCIAS.md`** (NEW)
  - Setup passo-a-passo
  - Pré-requisitos e configuração
  - Fluxo de uso
  - Endpoints resumidos
  - FAQ
  - Best practices
  - Tratamento de erros comum

- **`CHANGELOG_INSTANCIAS.md`** (NEW)
  - Este arquivo com histórico de mudanças

### Mudanças Importantes

#### QR Code é OBRIGATÓRIO
- ✅ QR Code sempre é gerado ao criar instância
- ✅ Campo é desabilitado no formulário (apenas informativo)
- ✅ Componente `RegenerateQRCodeDialog` para reconectar

#### Design
- ✅ Sem emojis (removidos completamente)
- ✅ Abas separando configuração básica e avançada
- ✅ Cores profissionais (verde, azul, âmbar)
- ✅ Instruções visuais com números
- ✅ Melhor espaçamento e tipografia

#### APIs Organizadas
- ✅ Arquivo centralizado `apis.ts`
- ✅ Funções reutilizáveis
- ✅ Tratamento de erro padrão
- ✅ Cache invalidation helpers
- ✅ Tipos TypeScript completos

### Endpoints Implementados

```
Criar Instância
POST /api/instances
├─ Validação Zod
├─ QR Code automático
└─ Sincronização Supabase

Listar Instâncias
GET /api/instances

Gerar QR Code / Conectar
GET /api/instances/{id}/connect

Reiniciar
PUT /api/instances/{id}/restart

Estado de Conexão
GET /api/instances/{id}/connection-state

Fazer Logout
DELETE /api/instances/{id}/logout

Deletar
DELETE /api/instances/{id}

Presença
POST /api/instances/{id}/presence
```

### Componentes Criados

| Componente | Localização | Descrição |
|-----------|-----------|-----------|
| CreateInstanceDialog | `client/src/components/` | Criar nova instância com QR Code |
| RegenerateQRCodeDialog | `client/src/components/` | Gerar QR Code em desconectadas |
| evolutionInstancesAPI | `client/src/lib/apis.ts` | API client para instâncias |

### Modificações em Arquivos Existentes

| Arquivo | Mudança | Linha |
|---------|---------|-------|
| server/routes.ts | Adicionado `registerInstanceRoutes` | 19, 2666 |
| client/src/components/ChatListSidebar.tsx | Adicionado botão "+" | 16, 75, 348-357 |
| client/src/pages/whatsapp.tsx | Adicionado dialog state e integração | 48, 253, 1232, 2166-2169 |

### Requisitos Atendidos

- ✅ Criar instâncias via API Evolution
- ✅ QR Code automático (obrigatório)
- ✅ Geração de QR Code em desconectadas
- ✅ Design sem emojis
- ✅ Organização de APIs em arquivo centralizado
- ✅ Abas para configurações básicas e avançadas
- ✅ Sincronização com Supabase
- ✅ Validação de dados completa
- ✅ Documentação detalhada
- ✅ Tratamento de erros robusto

### Como Usar

1. **Configure as credenciais** no `.env`:
   ```env
   EVOLUTION_API_URL=https://seu-api.com
   EVOLUTION_API_KEY=sua-chave
   ```

2. **Reinicie o servidor**:
   ```bash
   npm run dev:server
   ```

3. **Acesse** `/chat` e clique no botão **"+"**

4. **Preencha o formulário** e crie a instância

5. **QR Code será gerado automaticamente**

6. **Escaneie com WhatsApp** para conectar

### Próximos Passos (Sugestões)

- [ ] Adicionar webhook para notificações de status
- [ ] Integração com N8N
- [ ] Histórico de instâncias
- [ ] Métricas de conexão
- [ ] Alertas de desconexão
- [ ] Backup de configurações

---

**Desenvolvedor:** Claude Code
**Data:** 2025-11-14
**Status:** ✅ Completo
