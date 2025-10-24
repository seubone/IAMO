# Fix: Conversas Não Carregavam - queryKey Incorreta

## 🔍 Problema Identificado

As conversas do WhatsApp não estavam sendo carregadas porque a `queryKey` estava formada incorretamente no React Query.

### Sintomas
- ✗ Página de chat carrega, mas lista de conversas vazia
- ✗ Nenhuma mensagem aparece
- ✗ Ao enviar mensagem, não atualiza

### Causa Raiz
A queryKey estava usando um array simples em vez de template string:

```typescript
// ERRADO ❌
queryKey: ["/api/whatsapp/instances", selectedInstanceId, "chats"]

// Gerava algo como:
/api/whatsapp/instances/undefined/chats
// ou endpoints incorretos
```

### Como o React Query Processa
```typescript
// No getQueryFn (queryClient.ts)
const path = queryKey.join("/") as string;

// Com array:
["/api", "users", "123"].join("/") = "/api/users/123"

// Mas variáveis undefined causavam problemas:
["/api/users", undefined, "chats"].join("/") = "/api/users/undefined/chats" ❌
```

---

## ✅ Solução Implementada

### Usar Template Strings na queryKey
```typescript
// CORRETO ✅
queryKey: [`/api/whatsapp/instances/${selectedInstanceId}/chats`]

// Gera a URL completa:
/api/whatsapp/instances/12345/chats
```

### Mudanças Realizadas

#### 1. Query de Chats
**Arquivo**: `client/src/pages/whatsapp.tsx` (linha 222)

```typescript
// ANTES
useQuery<EvolutionChat[]>({
  queryKey: ["/api/whatsapp/instances", selectedInstanceId, "chats"],
  enabled: !!selectedInstanceId,
});

// DEPOIS
useQuery<EvolutionChat[]>({
  queryKey: [`/api/whatsapp/instances/${selectedInstanceId}/chats`],
  enabled: !!selectedInstanceId,
});
```

#### 2. Query de Mensagens
**Arquivo**: `client/src/pages/whatsapp.tsx` (linha 249)

```typescript
// ANTES
useQuery<EvolutionMessage[]>({
  queryKey: ["/api/whatsapp/instances", selectedInstanceId, "chats", selectedChatJid, "messages"],
  enabled: !!selectedInstanceId && !!selectedChatJid,
});

// DEPOIS
useQuery<EvolutionMessage[]>({
  queryKey: [`/api/whatsapp/instances/${selectedInstanceId}/chats/${selectedChatJid}/messages`],
  enabled: !!selectedInstanceId && !!selectedChatJid,
});
```

#### 3. Invalidate Queries (3 ocorrências)
**Arquivo**: `client/src/pages/whatsapp.tsx` (linhas 439, 467, 495)

```typescript
// ANTES
queryClient.invalidateQueries({
  queryKey: ["/api/whatsapp/instances", selectedInstanceId, "chats", selectedChatJid, "messages"]
});

// DEPOIS
queryClient.invalidateQueries({
  queryKey: [`/api/whatsapp/instances/${selectedInstanceId}/chats/${selectedChatJid}/messages`]
});
```

---

## 🚀 Como Testar

### Pré-requisitos
- Express rodando em `http://localhost:5051`
- Vite rodando em `http://localhost:5000`
- Usuário autenticado
- Pelo menos uma instância WhatsApp configurada

### Passos de Teste

1. **Iniciar a aplicação**
   ```bash
   npm run dev
   ```

2. **Fazer Login**
   - Ir para `http://localhost:5000`
   - Inserir credenciais
   - ✅ Deve ser redirecionado para `/` (home)

3. **Acessar Chat**
   - Clicar em "Chat" no sidebar
   - Clicar em "Selecionar Instância"
   - ✅ Deve abrir modal com instâncias
   - Selecionar uma instância
   - ✅ Lista de conversas deve aparecer

4. **Verificar Conversas**
   - ✅ Conversas com nomes devem aparecer
   - ✅ Última mensagem deve estar visível
   - ✅ Badge de mensagens não lidas (se houver)

5. **Clicar em Conversa**
   - Clique em qualquer conversa
   - ✅ Mensagens devem carregar
   - ✅ Chat deve expandir mostrando histórico

---

## 📊 Comparação Antes vs Depois

| Aspecto | Antes ❌ | Depois ✅ |
|---------|---------|----------|
| QueryKey | Array com variáveis | Template string |
| URL Gerada | `/api/whatsapp/instances/undefined/chats` | `/api/whatsapp/instances/12345/chats` |
| Chats Carregam | Não | Sim |
| Mensagens Carregam | Não | Sim |

---

## 🎯 Resultado

**Commit**: `c01215a`

Com essa correção, o WhatsApp agora:
- ✅ Carrega conversas corretamente
- ✅ Carrega mensagens de cada conversa
- ✅ Atualiza lista quando nova mensagem chega

**Status**: ✅ RESOLVIDO
