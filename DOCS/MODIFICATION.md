# Refatoração do Gerenciamento de Status da IA

Este documento detalha as alterações realizadas para corrigir o erro `column "ai_name" does not exist` e refatorar o sistema de gerenciamento de status dos agentes de IA (ativo, pausado, inativo).

## 1. Descrição

### O que foi feito?

O sistema de gerenciamento de status das IAs foi completamente refatorado para centralizar a lógica e usar uma única fonte de verdade. As principais mudanças foram:

1.  **Migração da Lógica:** A lógica de negócios foi migrada de uma implementação antiga que usava uma tabela `ias` local para uma nova abordagem que utiliza a tabela `bot_instances` no Supabase.
2.  **Schema do Banco de Dados:** Uma nova coluna `bot_paused` (BOOLEAN) foi adicionada à tabela `bot_instances` no Supabase para suportar explicitamente o estado de "pausa".
3.  **Refatoração de API:** A API do backend foi ajustada. A rota `PATCH /api/ai-data/:id` agora manipula os campos `has_bot_enabled` e `bot_paused` para controlar o status.
4.  **Refatoração do Frontend:** A página de Monitoramento (`monitoring.tsx`) foi reescrita para consumir a API correta (`/api/ai-data`) e para interpretar o status da IA com base na nova lógica.

### Por que foi feito?

A mudança foi necessária para corrigir um erro crítico (`column "ai_name" does not exist`) que impedia a aplicação de funcionar. O erro era causado por uma inconsistência entre o código (que tentava acessar uma tabela `ias` desatualizada) e a arquitetura de dados correta (baseada na tabela `bot_instances` do Supabase).

A refatoração aproveitou a oportunidade para implementar o requisito de um sistema de três estados (ativo, pausado, inativo) de forma explícita e robusta, eliminando a ambiguidade anterior.

## 2. Impacto

As seguintes áreas do projeto foram impactadas:

-   **Banco de Dados (Supabase):**
    -   A tabela `public.bot_instances` foi alterada. Foi necessário executar o script `0001_add_paused_column.sql` para adicionar a coluna `bot_paused BOOLEAN DEFAULT FALSE NOT NULL`.

-   **Código Compartilhado (`shared`):
    -   `shared/bot-instance.types.ts`:** A interface `BotInstanceConfig` foi atualizada para incluir a propriedade `bot_paused: boolean`.

-   **Backend (`server`):
    -   `server/routes/ai-data.routes.ts`:** A rota `PATCH /api/ai-data/:id` foi modificada para aceitar e processar os campos `has_bot_enabled` e `bot_paused` no corpo da requisição, permitindo o controle fino do estado da IA.

-   **Frontend (`client`):
    -   `client/lib/api.ts`:** O objeto `iaAPI` (que apontava para a API obsoleta `/api/ias`) foi removido e substituído pelo `aiDataAPI`, que interage com os endpoints corretos em `/api/ai-data`.
    -   `client/src/pages/monitoring.tsx`:** Este arquivo foi o mais impactado. Toda a lógica de busca de dados (`useQuery`) e de atualização (`useMutation`) foi alterada para usar o `aiDataAPI`. A função `mapStatus` foi criada para interpretar o estado da IA (`active`, `paused`, `inactive`) a partir dos campos `has_bot_enabled` e `bot_paused`. A função `handleConfirmStatusChange` foi atualizada para enviar o payload correto para o backend em cada ação.

## 3. Testes e Verificação

Para garantir que as mudanças funcionam como esperado e não introduziram novos problemas, os seguintes passos de verificação foram considerados:

-   **Verificação Estática (Análise de Código):**
    -   O código foi inspecionado para garantir que todas as referências à API `/api/ias` e à tabela `ias` nas áreas relevantes foram substituídas pelas referências corretas à API `/api/ai-data` e à tabela `bot_instances`.
    -   A nova lógica de mapeamento de status no frontend e a lógica de atualização no backend foram revisadas para garantir consistência.

-   **Verificação Funcional (Passos para Teste Manual):**
    1.  **Pré-requisito:** Confirmar que o script `0001_add_paused_column.sql` foi executado com sucesso no banco de dados do Supabase.
    2.  **Carregamento da Página:** Iniciar a aplicação e navegar para a página de Monitoramento. A lista de IAs deve carregar sem erros.
    3.  **Ação de Ativar:** Selecionar uma IA inativa e clicar em "Ativar". A IA deve passar para o estado "ativo". No Supabase, a linha correspondente deve ter `has_bot_enabled: true` e `bot_paused: false`.
    4.  **Ação de Pausar:** Selecionar uma IA ativa e clicar em "Pausar". A IA deve passar para o estado "pausado". No Supabase, a linha deve ter `has_bot_enabled: true` e `bot_paused: true`.
    5.  **Ação de Desativar:** Selecionar uma IA ativa ou pausada e clicar em "Desativar". A IA deve passar para o estado "inativo". No Supabase, a linha deve ter `has_bot_enabled: false`.

---

# Correção de Problemas Recentes

Este documento detalha as correções implementadas para resolver problemas de interface e tratamento de erros de mídia.

## 1. Correção do Problema de Interface Travada

### Descrição:

-   **Problema:** A interface do usuário estava visível, mas não respondia a cliques, dando a impressão de estar "travada".
-   **Causa:** Uma regra CSS global em `client/src/index.css` estava aplicando `z-index: 999` a um pseudo-elemento transparente (`::after`) em elementos com as classes `.hover-elevate` e `.active-elevate`. Este pseudo-elemento, embora invisível, estava sobrepondo toda a aplicação e bloqueando os eventos de clique.

### Impacto:

-   **Frontend (`client`):
    -   `client/src/index.css`:** A regra CSS foi modificada.

### Solução:

-   O `z-index` do pseudo-elemento `::after` foi alterado de `999` para `-1` em `client/src/index.css`. Isso garante que o pseudo-elemento fique atrás do conteúdo, permitindo que os eventos de clique alcancem os elementos interativos da interface.

## 2. Melhoria no Tratamento de Erros de Descriptografia de Mídia (HTTP 403)

### Descrição:

-   **Problema:** O backend estava retornando `500 Internal Server Error` quando tentava descriptografar mídias do WhatsApp que estavam expiradas ou inacessíveis, resultando em logs de erro excessivos e mensagens de erro genéricas para o frontend.
-   **Causa:** O bloco `catch` na rota `GET /api/whatsapp/media/decrypt/:messageId` em `server/routes.ts` não tratava especificamente erros `HTTP 403` provenientes dos servidores de mídia do WhatsApp. Esses erros, que indicam mídia expirada ou acesso negado, eram tratados como erros desconhecidos.

### Impacto:

-   **Backend (`server`):
    -   `server/routes.ts`:** O bloco `catch` da rota `/api/whatsapp/media/decrypt/:messageId` foi modificado.

### Solução:

-   O bloco `catch` em `server/routes.ts` foi atualizado para verificar explicitamente erros que contenham a mensagem `HTTP 403`. Quando detectado, a API agora retorna um status `410 Gone` (o mesmo status usado para mídias `404` ou `MediaExpiredError`) com uma mensagem mais informativa para o frontend. Isso permite que o frontend exiba uma mensagem adequada ao usuário e evita que o servidor registre esses eventos como erros internos críticos.

## 3. Resolução de `ReferenceError: ias is not defined`

### Descrição:

-   **Problema:** O servidor falhava ao iniciar com um `ReferenceError: ias is not defined` após a remoção inicial da tabela `ias`.
-   **Causa:** A remoção do código obsoleto da tabela `ias` foi incompleta, deixando para trás referências a ela em vários arquivos.

### Impacto:

-   **Código Compartilhado (`shared`):
    -   `shared/schema.ts`:** As definições das tabelas `tickets` e `actions` foram modificadas. A linha `export const insertIASchema = createInsertSchema(ias)...` e as exportações dos tipos `IA` e `InsertIA` foram removidas.

-   **Backend (`server`):
    -   `server/db-storage.ts`:** A importação dos tipos `IA` e `InsertIA` foi removida.
    -   `server/routes.ts`:** A importação de `insertIASchema` foi removida.

### Solução:

-   **`shared/schema.ts`:**
    -   As referências `.references(() => ias.id)` foram removidas das definições da coluna `iaId` nas tabelas `tickets` e `actions`.
    -   A linha `export const insertIASchema = createInsertSchema(ias)...` foi removida.
    -   As exportações dos tipos `IA` e `InsertIA` foram removidas.
-   **`server/db-storage.ts`:** A importação de `IA` e `InsertIA` foi removida.
-   **`server/routes.ts`:** A importação de `insertIASchema` foi removida.

Essas alterações garantem que todas as referências ao código obsoleto da tabela `ias` foram removidas, permitindo que o servidor inicie corretamente e a aplicação funcione com a nova lógica baseada na tabela `bot_instances` do Supabase.

---

# Implementação e Correções Recentes

Este documento detalha as implementações de UI para controle de IA e as correções de bugs.

## 1. Implementação da UI para Controle de IA por Conversa (Tela de Chat)

### Descrição:

-   **Problema:** Necessidade de interface para controlar o status da IA (ativo, pausado, inativo) em nível de conversa, conforme nova arquitetura proposta.
-   **Solução:**
    -   Criação do componente `client/src/components/IAConversationStatusBadge.tsx` para exibir o status da IA com cores e textos para os estados 'active', 'paused' e 'inactive'.
    -   Criação do componente `client/src/components/IAConversationActions.tsx` para o menu de ações (Ativar, Pausar, Desativar), exibindo as opções condicionalmente com base no estado atual da IA.
    -   Integração desses componentes na tela de chat (`client/src/pages/whatsapp.tsx`), com um estado de placeholder (`iaStatusForChat`) para simular os três estados e funções de callback para as ações.

### Impacto:

-   **Frontend (`client`):
    -   `client/src/components/IAConversationStatusBadge.tsx`:** Novo componente criado e modificado.
    -   `client/src/components/IAConversationActions.tsx`:** Novo componente criado e modificado.
    -   `client/src/pages/whatsapp.tsx`:** Modificado para importar e usar os novos componentes, e para gerenciar o estado de simulação da IA por conversa.

### Testes e Verificação:

-   Visualizar a tela de chat e interagir com o menu de ações para observar a mudança do badge de status e as notificações de toast.

## 2. Implementação da UI para Status de IA na Página de Monitoramento

### Descrição:

-   **Problema:** Atualizar a interface da página de Monitoramento para refletir os três estados da IA de forma consistente com a nova UI de chat.
-   **Solução:**
    -   Integração do `IAConversationStatusBadge` no `client/src/components/IADetailPanel.tsx` para exibir o status da IA de forma padronizada.
    -   Reversão da lógica de renderização condicional dos botões de ação no `IADetailPanel.tsx` para a lógica anterior que usa a propriedade `disabled`. Isso garante que todos os botões sejam visíveis, mas apenas as ações relevantes estejam ativas, evitando problemas de layout.

### Impacto:

-   **Frontend (`client`):
    -   `client/src/components/IADetailPanel.tsx`:** Modificado para importar `IAConversationStatusBadge` e ajustar a lógica dos botões.

### Testes e Verificação:

-   Navegar para a página de Monitoramento, clicar em um ticket (após a correção do problema de clique) e verificar se o painel de detalhes da IA exibe o badge de status correto e os botões de ação com o estado `disabled` apropriado.

## 3. Correção para Cards de Tickets Não Clicáveis

### Descrição:

-   **Problema:** Os cards de tickets na seção de Monitoramento não eram clicáveis, impedindo a exibição do `IADetailPanel` e, consequentemente, o acesso aos botões de controle da IA.
-   **Causa:** Um `z-index: -1;` aplicado ao pseudo-elemento `::after` das classes `.hover-elevate` e `.active-elevate` em `client/src/index.css` estava criando um contexto de empilhamento que, apesar do `pointer-events: none;`, bloqueava os eventos de clique nos cards.

### Impacto:

-   **Frontend (`client`):
    -   `client/src/index.css`:** A regra CSS foi modificada.

### Solução:

-   Remoção da propriedade `z-index: -1;` do pseudo-elemento `::after` das classes `.hover-elevate` e `.active-elevate` no arquivo `client/src/index.css`. Esta correção resolve o problema de empilhamento e permite que os eventos de clique sejam processados corretamente pelos cards de tickets.

### Testes e Verificação:

-   Navegar para a página de Monitoramento e verificar se os cards de tickets agora são clicáveis e se o painel de detalhes da IA é exibido ao clicar em um deles.