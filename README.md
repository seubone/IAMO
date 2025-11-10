# Monitor IA

Monitor IA e um monorepo que integra monitoramento de modelos de IA, operacoes de atendimento via WhatsApp e paines operacionais. O projeto combina React + Vite no frontend, Express + Drizzle ORM no backend e integra Supabase, Evolution API, UazAPI e fluxos N8N para automacoes.

## Visao geral

- Autenticacao segura com Supabase (registro, verificacao por email, sessao JWT).
- Dashboard em tempo real com metricas de IAs, tickets e conversas.
- Integra, monitora e envia mensagens via WhatsApp utilizando Evolution API e UazAPI com fallback automatico.
- Sistema de auditoria completo com logs de acoes e trilhas de compliance.
- UI responsiva com tema claro/escuro e componentes shadcn/tailwind.

## Estrutura do repositorio

| Caminho | Descricao |
|---------|-----------|
| `client/` | Aplicacao React (Vite, Tailwind, Zustand, React Query). |
| `server/` | API Express (Node 22, Drizzle ORM, integracoes externas). |
| `shared/` | Tipagens e utilitarios compartilhados entre client e server. |
| `DOCS/` | Documentacao oficial; veja `DOCS/INDEX.md` para o indice completo. |
| `__tests__/` | Suites de testes e ferramentas de validacao. |
| `dist/` | Build de producao gerado por `npm run build`. |
| `attached_assets/`, `after_*.png` | Referencias visuais e assets de design. |

## Stack principal

**Frontend**
- React 18, TypeScript 5, Vite 5
- TailwindCSS 3, shadcn/ui, Radix, Zustand, TanStack Query
- Wouter para roteamento leve

**Backend**
- Node 22, Express 4, WebSocket
- Drizzle ORM (PostgreSQL), Supabase Auth, pg, dotenv
- Integracoes Evolution API, UazAPI, N8N

**Ferramentas de apoio**
- Drizzle Kit para migrations
- TSX para desenvolvimento em TypeScript
- Concurrently para orquestrar client + server

## Principais features

- Autenticacao completa (login, registro, confirmacao de email).
- Dashboard de monitoramento com cards, graficos e auditoria.
- Envio e recebimento de mensagens WhatsApp com fallback automatico entre UazAPI e Evolution API.
- Sistema de tickets integrado ao fluxo de conversas.
- Administracao de instancias, chaves e configuracoes via UI.
- Auditoria de eventos e trilhas de acao por usuario.

## Configuracao rapida (dev)

### 1. Dependencias

- Node.js 18+
- npm ou yarn
- PostgreSQL disponivel (local ou hospedado)
- Conta Supabase (Auth + tabela `uazapi_instances`)
- Credenciais Evolution API e UazAPI

### 2. Instalar e configurar

```bash
git clone https://github.com/seubone/IAMO.git
cd IAMO
npm install
cp .env.example .env
# edite .env com chaves do Supabase, DB, Evolution, UazAPI, N8N
```

### 3. Banco e migrations

```bash
npm run db:push       # aplica schema com Drizzle
```

### 4. Desenvolvimento

```bash
npm run dev           # sobe API + client (porta API 5051, web 5000)
# ou
npm run dev:ordered   # garante servidor pronto antes do client
```

### 5. Producoes

```bash
npm run build         # build client + bundle server em dist/
npm start             # roda server em modo producao
```

## Scripts uteis

| Script | Descricao |
|--------|-----------|
| `npm run dev` | Sobe `server/index.ts` (TSX watch) e Vite na porta 5000. |
| `npm run dev:server` | API em modo desenvolvimento com reload. |
| `npm run dev:client` | Vite isolado (usa env do client). |
| `npm run build` | Build Vite + bundle server via esbuild. |
| `npm start` | Executa API em producao usando `dist/index.js`. |
| `npm run check` | `tsc` para verificar tipos. |
| `npm run db:push` | Aplica schema Drizzle no banco configurado. |

## Integracao WhatsApp (Evolution + UazAPI)

1. **Sincronize instancias**: `POST /api/sync/uazapi-instances` povoa `instance_number`, `send_api` e dados do Evolution no Supabase.
2. **Tokens UazAPI**: cada instancia deve ter `api_token` valido armazenado em `uazapi_instances` (edite via modal do front ou SQL).  
   Use o SQL abaixo para validar rapidamente:
   ```sql
   SELECT instance_number, send_api,
     CASE
       WHEN api_token IS NULL OR api_token = '' THEN 'TOKEN AUSENTE'
       ELSE 'TOKEN OK (' || length(api_token) || ' chars)'
     END AS token_status
   FROM uazapi_instances;
   ```
3. **Estrategia de envio**: o backend tenta UazAPI primeiro; se falhar por token ou resposta 5xx, usa Evolution API automaticamente.
4. **Logs**: verifique `server/send-strategy.ts` para mensagens como `Enviando via uazapi` e `Fallback para evolution`.

### Checklist de verificacao rapida

| Item | Como verificar | Esperado |
|------|---------------|----------|
| URL base UazAPI | `server/senders/uazapi-sender.ts` | `https://quatro-cinco.uazapi.com` |
| Endpoints UazAPI | mesmo arquivo | `/send/text` e `/send/media` |
| API padrao | `server/send-strategy.ts` | `send_api = 'uazapi'` com fallback Evolution |
| Evolution API | `.env` e `server/send-strategy.ts` | URL `https://chatwoot-evolution-api.eee3i0.easypanel.host` e key `429683C4C977415CAAFCCE10F7D57E11` (substitua na producao) |
| Token presente | SQL acima no Supabase | `token_status` indicado como `TOKEN OK (...)` |
| Log ao enviar | Terminal do backend | `Configuração de envio ... uazapi` seguido de sucesso ou fallback |

### Correcoes aplicadas (outubro/2025)

- **Sincronizacao de instancias**: endpoint `POST /api/sync/uazapi-instances` preenche `instance_number`, define `send_api` padrao e alinha Evolution-Supabase.
- **Busca de token correta**: `uazapi-sender.ts` agora utiliza Supabase; fallback Evolution foi mantido em `send-strategy`.
- **UI de envio destravada**: input de mensagem nao depende mais do token UazAPI. Selecione uma instancia para liberar o campo e, opcionalmente, sincronize tokens antes do envio.
- **Tratamento de erros**: `server/send-strategy.ts` registra qual API foi usada e orienta acao de correção quando retornar 401/404.
- **Passos sugeridos**:
  1. Executar o SQL de verificação de tokens.
  2. Reiniciar o backend (`npm run dev:server`) e monitorar logs.
  3. Testar envio via WhatsApp garantindo que `send_api` esteja como `uazapi`.

> O conteudo original foi arquivado em `DOCS/archive/README_FIXES_2025-10-28.md` e `DOCS/archive/README_VERIFICATION_2025-10-28.md` para referencia historica.

## Documentacao adicional

- `DOCS/INDEX.md`: indice geral de arquitetura, guias de desenvolvimento e operacao.
- `DOCS/DEV_STARTUP_GUIDE.md`: passo a passo completo de setup local.
- `DOCS/TROUBLESHOOTING_GUIDE.md`: erros comuns e correcoes.
- `ALL_IMPROVEMENTS.md`: backlog de melhorias aplicadas.
- `ARQUIVOS_WHATSAPP.txt`, `CHAT_CONTEXT_MENU.md` e demais arquivos na raiz: referencias especificas de features.

## Troubleshooting rapido

| Sintoma | Investigacao | Solucao |
|---------|--------------|---------|
| `Missing token` ao enviar mensagem | Token UazAPI ausente no Supabase | Atualize `api_token` via modal da instancia ou SQL. |
| `relation uazapi_instances does not exist` | Supabase nao possui a tabela | Rode migrations e confirme schema listado em `DOCS/SETUP_SUPABASE.md` (se aplicavel). |
| Frontend nao sobe apos `npm run dev` | API nao respondeu `/api/config/public` | Use `npm run dev:ordered` ou verifique erros no terminal do server. |
| Dashboard sem dados | Falta configurar variaveis `.env` para Supabase ou Evolution | Revise `.env` e reinicie com `npm run dev`. |

Para um troubleshooting completo, veja `DOCS/TROUBLESHOOTING_GUIDE.md` e `README_VERIFICATION.md` (historico).

## Padroes de codigo

- Frontend segue convencoes de hooks React, Zustand para estado e componentes isolados em `client/src/components`.
- Backend organiza casos de uso em `server/send-strategy.ts`, `server/senders/`, `server/routes.ts` e migrations em `server/migrations`.
- Utilize `npm run check` antes de abrir PR.

## Contribuindo

1. Crie um fork, abra branch `feature/nome`.
2. Rode `npm run check` e garanta que as migrations estejam aplicadas.
3. Abra PR descrevendo contexto, testes executados e impactos.
4. Utilize o padrao de commit convencional (`feat:`, `fix:`, etc.) quando possivel.

## Licenca

Este projeto esta sob licenca MIT (veja `LICENSE` se existir, ou defina antes do deploy).*** End Patch
