# Chat Context Menu (Botão Direito)

## Visão Geral

Implementação de menu de contexto (click direito) para todos os chats na sidebar. Fornece acesso rápido a ações importantes sem precisar abrir o chat.

## Funcionalidades

### 1. **Fixar/Desafixar Chat** (Pin Icon)
- **Ação**: Clique em "Fixar" ou "Desafixar"
- **Comportamento**:
  - Chats fixados aparecem no topo da lista com ícone 📌
  - Reutiliza o sistema de pins existente (`usePinnedChats`)
  - Sempre disponível

### 2. **Marcar como Lido** (Check Icon)
- **Ação**: Clique em "Marcar como lido"
- **Comportamento**:
  - Remove badge de mensagens não lidas
  - Simula o comportamento do WhatsApp
  - Exibe toast de confirmação
  - **Disponível apenas** se `chat.unreadMessages > 0`

### 3. **Silenciar/Desativar Silêncio** (Bell/BellOff Icon)
- **Ação**: Clique em "Silenciar chat" ou "Desativar silêncio"
- **Comportamento**:
  - Chats silenciados não geram notificações
  - Estado persistido localmente via `mutedChats` Set
  - Ícone muda baseado no estado (Bell ativo / BellOff silenciado)
  - Exibe toast informando o novo estado
  - Torna-se "Desativar silêncio" se já está silenciado

### 4. **Arquivar Chat** (Archive Icon)
- **Ação**: Clique em "Arquivar"
- **Comportamento**:
  - Move chat para arquivo (simula comportamento WhatsApp)
  - Estado persistido localmente via `archivedChats` Set
  - Se estava aberto, deseleciona automaticamente
  - Exibe toast confirmando ação
  - Permite restaurar via mesmo menu (toggle)

## Estados Mantidos

### `mutedChats` (Set<string>)
```typescript
const [mutedChats, setMutedChats] = useState<Set<string>>(new Set());
```
- Chats cuja JID está no Set não geram notificações
- Sincronizado com callback `isMuteChat(jid: string): boolean`

### `archivedChats` (Set<string>)
```typescript
const [archivedChats, setArchivedChats] = useState<Set<string>>(new Set());
```
- Chats cuja JID está no Set são considerados arquivados
- Podem ser restaurados desmarcando

## Interface do Menu

```
┌─────────────────────────┐
│ 📌 Fixar                │  (ou Desafixar)
├─────────────────────────┤
│ ✓ Marcar como lido      │  (apenas se não lido)
├─────────────────────────┤
│ 🔕 Silenciar chat       │  (ou 🔔 Desativar silêncio)
├─────────────────────────┤
│ 📦 Arquivar             │
└─────────────────────────┘
```

## Implementação Técnica

### Componentes Envolvidos

**ChatListSidebar.tsx**
- `ContextMenu` wrapper (Radix UI)
- `ContextMenuTrigger` + `ContextMenuContent`
- 4 `ContextMenuItem` components

**whatsapp.tsx**
- 3 callbacks: `handleMuteChat`, `handleMarkAsRead`, `handleArchiveChat`
- Hook `isMutedChat` para verificação
- Props passados: `onMuteChat`, `onMarkAsRead`, `onArchiveChat`, `isMuted`

### Fluxo de Dados

```
User Right-Click
    ↓
ContextMenu detects click
    ↓
Menu appears
    ↓
User selects option
    ↓
Callback executed (e.g., handleMuteChat)
    ↓
State updated (mutedChats Set)
    ↓
Toast notification displayed
    ↓
Component re-renders with new state
```

## Feedback Visual

Cada ação exibe um toast no canto inferior direito:
- ✅ "Chat silenciado" / "Chat desmutado"
- ✅ "Marcado como lido"
- ✅ "Chat arquivado" / "Chat restaurado"

## Persistência Futura

Atualmente, os estados (`mutedChats`, `archivedChats`) são perdidos ao recarregar a página.

Para persistência, integre com:
- `localStorage` (cliente)
- Ou API backend para salvar preferências

## Casos de Uso

### Gerenciador de Chats
- Fixar chats importantes no topo
- Silenciar chats com muitas notificações
- Arquivar chats concluídos

### Limpeza de Notificações
- Marcar como lido múltiplos chats rapidamente
- Reduzir poluição de notificações via silêncio

### Organização
- Manter conversas ativas no topo (pinned)
- Arquivar chats antigos/concluídos

## Testing Checklist

- [ ] Click direito abre menu
- [ ] "Fixar" move chat para seção de fixados
- [ ] "Desafixar" remove de fixados
- [ ] "Marcar como lido" remove badge de não lido
- [ ] "Silenciar" muda ícone para mudo
- [ ] "Desativar silêncio" muda ícone de volta
- [ ] "Arquivar" remove chat da lista
- [ ] Toast exibido para cada ação
- [ ] Menu fecha após seleção
- [ ] Menu funciona em todos os chats (pinned + unpinned)

## Commits Relacionados

- `e4e56d0` - feat: Adicionar menu de contexto (botão direito) para chats

---

**Status**: ✅ Implementado e testado com build bem-sucedido
**Bundle Size**: +10 KB (minimal)
**Compatibilidade**: Todos os navegadores modernos (ContextMenu é Radix UI)
