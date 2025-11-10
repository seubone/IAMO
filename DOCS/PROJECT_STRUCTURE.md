# Estrutura de Diretórios do Projeto

Este documento descreve a organização semântica do projeto após refatoração.

## Estrutura Geral

```
.
├── client/                  # Aplicação frontend (React + Vite)
├── server/                  # API backend (Express.js)
├── shared/                  # Código compartilhado entre cliente e servidor
├── DOCS/                    # Documentação e arquivos de referência
├── attachments/             # Imagens e assets do projeto
└── __tests__/               # Testes do projeto
```

## 📂 Diretório `server/`

A estrutura do servidor foi organizada de forma semântica:

### `server/config/`
**Configuração e inicialização de conexões**
- `env.ts` - Validação de variáveis de ambiente
- `db.ts` - Conexão com banco de dados local (Drizzle ORM)
- `db-storage.ts` - Implementação de storage usando banco local
- `evolution-db.ts` - Pool de conexão com banco Evolution API
- `supabase.ts` - Cliente Supabase para autenticação

### `server/services/`
**Serviços e integrações externas**
- `bot-instances-supabase.ts` - Gerenciamento de instâncias bot no Supabase
- `evolution-api.ts` - Integração com Evolution API (WhatsApp)
- `uazapi-supabase.ts` - Gerenciamento de tokens UazAPI no Supabase
- `whatsapp-media-decrypt.ts` - Descriptografia de mídia WhatsApp

### `server/middleware/`
**Middlewares Express**
- `auth.ts` - Autenticação JWT e Supabase
- `rbac.ts` - Controle de acesso baseado em papéis

### `server/routes/`
**Definição de rotas e endpoints**
- `bot-config.routes.ts` - Rotas de configuração de bot
- `ia-config.routes.ts` - Rotas de configuração de IA
- `ai-data.routes.ts` - Rotas de dados de IA
- `routes.ts` - Arquivo principal com todas as rotas consolidadas

### `server/utils/`
**Utilidades e helpers**
- `logger.ts` - Sistema de logging
- `vite.ts` - Configuração e setup do Vite para desenvolvimento
- `send-strategy.ts` - Estratégia unificada de envio de mensagens
- `storage.ts` - Interface abstrata de storage

#### `server/utils/senders/`
**Implementações de senders para diferentes APIs**
- `evolution-sender.ts` - Sender para Evolution API
- `uazapi-sender.ts` - Sender para UazAPI

#### `server/utils/types/`
**Definições de tipos TypeScript**
- `sender.types.ts` - Tipos relacionados a envio de mensagens

### `server/scripts/`
**Scripts de utilidade e migração**
- `check_data.ts` - Script para verificar dados
- `check_instance_number.ts` - Verificar número de instância
- `check_instance_phone.ts` - Verificar telefone de instância
- `check_instance_schema.ts` - Verificar schema de instância
- `check_message_schema.ts` - Verificar schema de mensagem
- `run-migration.ts` - Executar migrations do banco
- `seed.ts` - Seed de dados para desenvolvimento

### `server/migrations/`
**Migrations do banco de dados**
- `add-send-api-to-supabase.ts`
- `run-all-migrations.ts`
- `run-migration.ts`

## 📂 Diretório `client/`

Frontend organizado por funcionalidades:

### `client/src/components/`
**Componentes reutilizáveis**
- Componentes de UI (botões, diálogos, etc.)
- Componentes de negócio (ChatMessage, InstanceSelector, etc.)
- Componentes de layout (Sidebar, ThemeProvider, etc.)

### `client/src/pages/`
**Páginas da aplicação**
- `login.tsx` - Página de login com Google OAuth
- `auth-callback.tsx` - Callback de autenticação OAuth
- Outras páginas da aplicação

### `client/src/examples/`
**Componentes e páginas de exemplo**
- `components/` - Exemplos de componentes
- `pages/` - Exemplos de páginas

### `client/src/lib/`
**Bibliotecas e utilitários**
- `supabase.ts` - Cliente Supabase
- `google-auth.ts` - Funções de autenticação Google OAuth
- Outras utilidades

## 📂 Diretório `DOCS/`

Documentação e referências:

- `PROJECT_STRUCTURE.md` - Este arquivo
- `GOOGLE_OAUTH_SETUP.md` - Guia de setup do Google OAuth
- `CHECKPOINT.txt` - Checkpoint do projeto
- `ARQUIVOS_WHATSAPP.txt` - Referência de arquivos WhatsApp
- `archive/` - SQL scripts e migrations antigas

## 📂 Diretório `attachments/`

Imagens e assets do projeto:
- Screenshots de testes
- Imagens de referência
- Outros assets visuais

## 📂 Diretório `shared/`

Código compartilhado entre cliente e servidor:
- `schema.ts` - Schemas de banco de dados (Drizzle)
- `bot-instance.types.ts` - Tipos de instância bot
- Tipos e interfaces comuns

## 🔄 Benefícios da Nova Estrutura

1. **Clareza Semântica**: Cada diretório tem um propósito claro
2. **Escalabilidade**: Fácil adicionar novos serviços ou componentes
3. **Manutenibilidade**: Código organizado por funcionalidade
4. **Testabilidade**: Scripts de teste organizados e identificáveis
5. **Separação de Responsabilidades**: Config, services, utils claramente separados

## 📋 Mapas de Import Comuns

### Do servidor para config:
```typescript
import { validateEnv } from "./config/env";
import { supabase } from "./config/supabase";
import { evolutionPool } from "./config/evolution-db";
```

### Do servidor para services:
```typescript
import { getUazapiTokenByInstanceNumber } from "./services/uazapi-supabase";
import { unifiedSender } from "./utils/send-strategy";
```

### Do cliente para lib:
```typescript
import { signInWithGoogle } from "@/lib/google-auth";
import { supabase } from "@/lib/supabase";
```

## ✅ Verificação Estrutural

Para verificar se a estrutura está correta:

```bash
# Build do projeto
npm run build

# Verificação de tipos
npm run type-check

# Linting
npm run lint
```
