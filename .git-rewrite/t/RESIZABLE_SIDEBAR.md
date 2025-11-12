# Sidebar Redimensionável - Documentação

## Visão Geral

Implementado recurso de redimensionamento dinâmico da sidebar, permitindo que os usuários ajustem a largura da lista de conversas conforme necessário.

## Como Funciona

### Interface do Usuário

```
┌─────────────────┐─────────────────────────┐
│                 │ │                       │
│    SIDEBAR      │ │   CHAT MESSAGES       │
│   400px padrão  │ │   AREA (flex-1)       │
│                 │ │                       │
└─────────────────┘─────────────────────────┘
    ↑ Drag here ↑
```

### Comportamento

1. **Passe o mouse** sobre o divisor entre sidebar e mensagens
   - Divisor muda de cor (transparente → primary/40)
   - Cursor muda para `col-resize`

2. **Clique e arraste** para esquerda ou direita
   - Divisor fica mais visível (primary/60)
   - Sidebar redimensiona em tempo real
   - Área de mensagens se adapta automaticamente

3. **Solte o mouse** quando estiver satisfeito
   - Largura é salva automaticamente em localStorage
   - Na próxima visita, a largura será restaurada

## Limites de Redimensionamento

| Limite | Valor | Descrição |
|--------|-------|-----------|
| Mínimo | 250px | Sidebar não pode ficar muito pequena |
| Máximo | 600px | Sidebar não pode ocupar toda tela |
| Padrão | 400px | Largura inicial |

## Implementação

### Hook: useSidebarWidth()

**Arquivo:** `client/src/hooks/use-sidebar-width.ts`

```typescript
const {
  sidebarWidth,      // Largura atual em px (número)
  isResizing,        // Se está sendo arrastado (booleano)
  setIsResizing,     // Função para iniciar/parar resize
  MIN_WIDTH,         // 250
  MAX_WIDTH,         // 600
  DEFAULT_WIDTH,     // 400
} = useSidebarWidth();
```

**Funcionalidades:**
- Carrega largura salva do localStorage ao montar
- Salva largura no localStorage quando muda
- Gerencia eventos de mousemove e mouseup
- Valida limites mín/máx
- Reseta automaticamente se valor inválido

### Integração em whatsapp.tsx

**Sidebar Container:**
```tsx
<div
  style={{ width: `${sidebarWidth}px` }}
  className="relative"
>
  <ChatListSidebar {...props} />

  {/* Resize Handle */}
  <div
    onMouseDown={() => setIsResizing(true)}
    className="w-1 bg-border/20 hover:bg-primary/40 cursor-col-resize"
  />
</div>
```

## Estilos CSS

### Divisor (Resize Handle)

```
Estado Padrão:
- Largura: 1px
- Background: border/20 (transparente)
- Cursor: col-resize

State Hover:
- Background: primary/40 (visível)
- Cursor: col-resize

State Arrastando:
- Background: primary/60 (bem visível)
```

## LocalStorage

**Chave:** `chat-sidebar-width`
**Tipo:** String (convertida para número ao carregar)
**Exemplo:**
```javascript
// localStorage
{
  "chat-sidebar-width": "480"  // "480px"
}
```

## Responsividade

- **Desktop (md+):** Sidebar redimensionável normalmente
- **Mobile:** Sidebar ainda usa display:hidden/flex conforme necessário
- Resize handle só aparece em telas maiores (md+)

## Casos de Uso

✅ **Usuários quer mais espaço para mensagens**
- Redimensiona sidebar para 250px (mínimo)

✅ **Usuários quer ver melhor os contatos**
- Redimensiona sidebar para 600px (máximo)

✅ **Layout personalizado**
- Cada usuário pode ter sua própria configuração salva

## Problemas e Soluções

| Problema | Solução |
|----------|---------|
| Resize muito lento | Usa mousemove nativo, não há throttle necessário |
| Valor inválido salvo | Hook valida contra MIN/MAX ao carregar |
| Não funciona em mobile | Hook apenas em desktop (responsivo) |

## Testing

```typescript
// Test: Drag handle exists
screen.getByTestId('sidebar-resize-handle')

// Test: LocalStorage updated
localStorage.getItem('chat-sidebar-width')

// Test: Width applied
const sidebar = document.querySelector('[style*="width"]')
expect(sidebar.style.width).toBe('450px')
```

## Futuros Aprimoramentos

- [ ] Adicionar botão para resetar para padrão
- [ ] Animação smooth ao carregar largura salva
- [ ] Double-click no divisor para maximizar/minimizar
- [ ] Teclado: arrow keys para ajuste fino
- [ ] Touch support para mobile (drag on touch)
- [ ] Visual indicator de posição atual (percentual)

## Commit

```
feat: Adicionar redimensionamento dinâmico da sidebar
(9164ea9)
```

## Compatibilidade

- ✅ Chrome/Edge/Firefox (desktop)
- ✅ Safari (desktop)
- ⚠️ Mobile (não implementado, mas não quebra)
- ✅ localStorage disponível em todos

## Performance

- Sem impacto significativo
- Usa nativo mousemove (não há debounce necessário)
- localStorage é síncrono, rápido (<1ms)
- Re-render apenas quando sidebarWidth muda
