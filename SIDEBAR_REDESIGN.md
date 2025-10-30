# Redesign da Sidebar de Conversas - WhatsApp Web Inspired

## Visão Geral

A sidebar esquerda (lista de conversas) foi completamente redesenhada para se assemelhar ao design do WhatsApp Web, com uma interface mais limpa, intuitiva e moderna.

## Mudanças Implementadas

### 1. **Header de Seleção de Instância**
```
┌─────────────────────────────┐
│  [👤] Instância: #89332    │
│       +55 84 99239-3442    │
│                         [▼] │
└─────────────────────────────┘
```

- Avatar da instância no topo
- Nome e número da instância
- Seta para abrir seletor de instâncias
- Clicável para alternar entre instâncias

### 2. **Barra de Pesquisa Compacta**
- Campo de pesquisa com ícone de lupa integrado
- Placeholder: "Pesquisar..."
- `autoComplete="off"` para evitar autofill
- Altura reduzida (h-9)

### 3. **Botão de Filtros Personalizável**
```
┌──────────────────────────┐
│ 🔍 Todos                 │
└──────────────────────────┘
```

- Popover com opções:
  - 👥 Todos
  - 👤 Contatos
  - 👥 Grupos
- Opção selecionada é exibida no botão
- Design limpo com checkbox

### 4. **Seção de Fixados**
```
📌 Fixados
└── 📱 Contato 1
└── 📱 Contato 2
```

- Apenas aparece se houver conversas fixadas
- Ícone "📌" como cabeçalho
- Separação clara entre fixados e normais

### 5. **Lista de Conversas**
```
Conversas
├── 👤 Cainan Maia
│   Opa, tudo bem?              12:34
│                            [10]
├── 📱 +55 84 99239-3442
│   Que pena quisquam est q...   08:33
│                            [5]
└── 📱 +55 84 93342-9122
    Laboris et dolore magna...   08:33
```

**Características:**
- Avatar com ícone de grupo para grupos
- Nome do contato/grupo (truncado se necessário)
- Última mensagem (truncada)
- Horário da última mensagem
- Badge de mensagens não lidas
- Sem linhas divisórias entre itens
- Transição suave ao passar mouse
- Background arredondado em hover

### 6. **Indicadores Visuais**

| Elemento | Ícone | Cor | Significado |
|----------|-------|-----|------------|
| Fixado | 📌 | Primary | Conversa fixada |
| Grupo | 👥 | Accent | Conversa em grupo |
| Não lidas | Badge | Primary | Quantidade de mensagens não lidas |

## Componente Criado

### ChatListSidebar.tsx

**Props:**
```typescript
interface ChatListSidebarProps {
  selectedInstance: EvolutionInstance | null;
  onInstanceClick: () => void;
  isLoadingChats: boolean;
  chats: EvolutionChat[];
  filteredChats: EvolutionChat[];
  selectedChatJid: string | null;
  onSelectChat: (jid: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  chatTypeFilter: "contacts" | "groups" | "all";
  onChatTypeFilterChange: (type: "contacts" | "groups" | "all") => void;
  isPinned: (jid: string) => boolean;
  onTogglePin: (jid: string) => void;
  groupNameByJid: Map<string, string>;
}
```

**Estrutura Interna:**
- Header com seletor de instância
- Search & Filter bar
- Chat list com seções de fixados/normais
- Estados de loading e empty

## Arquivos Modificados

1. **client/src/components/ChatListSidebar.tsx** (NOVO)
   - Componente completo da nova sidebar
   - 331 linhas

2. **client/src/pages/whatsapp.tsx**
   - Import do novo componente
   - Substituição da antiga sidebar
   - Props passadas corretamente

## Benefícios

✅ **Design Moderno** - Similiar ao WhatsApp Web
✅ **Melhor Usabilidade** - Separação clara de elementos
✅ **Menos Visual Clutter** - Sem linhas divisórias
✅ **Responsivo** - Mantém responsividade do design anterior
✅ **Acessibilidade** - Estrutura HTML semântica
✅ **Performance** - Mesmo componente, estrutura otimizada

## Próximos Passos Opcionais

- [ ] Adicionar animação ao abrir/fechar filtros
- [ ] Implementar drag-drop para reordenar conversas fixadas
- [ ] Adicionar menu de contexto (pin, mute, delete)
- [ ] Busca com destaque dos termos encontrados

## Commit

```
feat: Redesenhar sidebar de conversas com novo design inspirado em WhatsApp Web
(8531481)
```

## Como Usar

O componente está 100% integrado. Não há mudanças necessárias na lógica da aplicação.

A sidebar agora exibe:
1. Seletor de instância no topo
2. Barra de pesquisa com filtros
3. Conversas fixadas separadas
4. Lista de conversas com design limpo

Tudo funciona como antes, mas com visual melhorado!
