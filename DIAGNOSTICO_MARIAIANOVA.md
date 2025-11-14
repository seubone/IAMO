# Diagnóstico: Instância "mariaianova" Não Carrega Mensagens

## 🔍 Problema Identificado

A instância "mariaianova" não está carregando mensagens. Foram implementadas melhorias críticas para diagnosticar e resolver o problema.

---

## ✅ Melhorias Implementadas

### 1. **Logs Detalhados no Servidor** (routes.ts:1082-1190, 1299-1397)

**Antes:**
```typescript
catch (error: any) {
  console.error("Error fetching chats:", error);
  res.json([]);  // ❌ Silencia o erro!
}
```

**Depois:**
```typescript
console.log(`💬 Fetching chats:`, {
  instanceId: instanceId || "❌ UNDEFINED",
  timestamp: new Date().toISOString()
});

// Validações com logs
if (!instanceId) {
  console.warn(`⚠️ Missing required parameter: instanceId`);
  return res.status(400).json({...});
}

// Logs de sucesso
console.log(`✅ Chats found:`, {
  count: result.rows.length,
  instanceIds: relatedInstanceIds
});

// Erro adequado
catch (error: any) {
  console.error("❌ Error fetching chats:", {...detailed logs...});
  res.status(500).json({...});
}
```

### 2. **Validações de Parâmetros**

- ✅ Verifica se `instanceId` é undefined
- ✅ Verifica se `remoteJid` é vazio
- ✅ Retorna 400 (Bad Request) em vez de 200
- ✅ Valida se instância existe no banco

### 3. **Logs em Cada Etapa**

```
💬 Fetching chats:       ← Recebeu requisição
🔍 Related instances:    ← Procurou instâncias relacionadas
✅ Chats found:          ← Retornou chats
❌ Error fetching chats: ← Erro com detalhes
```

---

## 🧪 Como Diagnosticar

### Opção 1: Usar Script de Diagnóstico

```bash
npx tsx server/scripts/diagnose-mariaianova.ts
```

Este script irá:
1. ✅ Procurar pela instância "mariaianova"
2. ✅ Verificar chats associados
3. ✅ Contar mensagens no banco
4. ✅ Listar instâncias relacionadas
5. ✅ Testar queries exatamente como o endpoint faz
6. ✅ Apresentar diagnóstico com possíveis soluções

### Opção 2: Verificar Logs do Servidor

Ao acessar a página WhatsApp, procure por logs como:

```
💬 Fetching chats: {
  instanceId: "f1e3b1ec-b55e-495a-96f4-15f118d1ce8f",
  timestamp: "2025-11-13T23:45:00.000Z"
}

🔍 Related instances found: {
  original: "f1e3b1ec-b55e-495a-96f4-15f118d1ce8f",
  related: ["f1e3b1ec-b55e-495a-96f4-15f118d1ce8f"],
  count: 1
}

✅ Chats found: {
  count: 12,
  instanceIds: ["f1e3b1ec-b55e-495a-96f4-15f118d1ce8f"]
}
```

### Opção 3: Verificar Network no Navegador

1. Abra DevTools (F12)
2. Vá em **Network**
3. Procure por requisições:
   - `GET /api/whatsapp/instances/{id}/chats` → Deve retornar 200 com dados
   - `GET /api/whatsapp/instances/{id}/chats/{jid}/messages` → Deve retornar 200

Se receber erro 500, verifique a resposta no console do servidor.

---

## 📊 Possíveis Causas e Soluções

| Causa | Sintoma | Solução |
|-------|---------|---------|
| **instanceId undefined** | `GET /chats/undefined` no Network | Instância não selecionada no frontend |
| **Instância não existe** | 404 - Instance not found | Selecionar instância correta |
| **Sem chats/mensagens** | Status 200, array vazio | Reconectar WhatsApp ou sincronizar |
| **Erro no banco** | Status 500 com mensagem | Ver detalhe do erro no server logs |
| **Evolution DB indisponível** | Timeout ou conexão recusada | Verificar Evolution DB |
| **Credenciais inválidas** | 401 - Unauthorized | Verificar JWT token e Supabase auth |

---

## 🚀 Próximas Ações

1. **Execute o script de diagnóstico:**
   ```bash
   npx tsx server/scripts/diagnose-mariaianova.ts
   ```

2. **Compartilhe a saída** - fornecerá exatamente qual é o problema

3. **Com base no resultado:**
   - Se "0 chats" → Reconectar instância
   - Se "0 mensagens" → Sincronizar com Evolution API
   - Se erro no banco → Verificar configuração do Evolution DB
   - Se outra coisa → Análise específica

---

## 📝 Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `server/routes.ts:1082-1190` | Logs e validações para endpoint `/chats` |
| `server/routes.ts:1299-1397` | Logs e validações para endpoint `/messages` |
| `server/scripts/diagnose-mariaianova.ts` | **Novo** - Script de diagnóstico |

---

## 💡 Resumo

**Antes:** Erros silenciosos → Impossível diagnosticar
**Depois:** Logs detalhados → Problema identificável em segundos

Agora você pode executar o diagnóstico e descobrir exatamente por que "mariaianova" não carrega mensagens! 🎯
