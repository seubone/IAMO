# 🔴 CRÍTICO: Connection Pool Leak - Instâncias não carregam

**Data:** 2025-11-24
**Versão:** v1.0.34
**Severidade:** 🔴 CRÍTICO
**Status:** IDENTIFICADO E DOCUMENTADO

---

## 📋 Diagnóstico

### Sintomas
```
[vite] http proxy error: /api/whatsapp/instances
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1139:18)
```

### Causa Raiz
**Connection Pool está completamente SATURADO**

Verificação de portas ativas (netstat):
```
TCP    0.0.0.0:5051           0.0.0.0:0              LISTENING       32400
TCP    127.0.0.1:5051         127.0.0.1:49152        ESTABLISHED     32400
TCP    127.0.0.1:5051         127.0.0.1:49153        ESTABLISHED     32400
... (400+ conexões ESTABLISHED)
```

**Processo Backend:**
```
node.exe                     32400   743.940 K  (PID do servidor)
```

### Análise

| Métrica | Valor | Status |
|---------|-------|--------|
| Conexões Ativas | 400+ | 🔴 CRÍTICO |
| Connection Pool Max | 10 | ✅ OK |
| Vazamento de Conexões | SIM | 🔴 CRÍTICO |
| Memory Usage | 743 MB | ⚠️ ALTO |

**Problema:** As conexões NÃO estão sendo liberadas de volta ao pool após o uso.

---

## 🔍 Localização do Problema

### Arquivo: `server/routes.ts`

**Linhas 1085-1200: GET /api/whatsapp/instances**

O endpoint provavelmente não está:
1. ❌ Liberando conexões do pool
2. ❌ Usando `client.release()` após queries
3. ❌ Tratando erros que deixam conexões abertas

### Código Problemático (Esperado)

```typescript
// ❌ PROBLEMA: Conexão nunca é liberada
const result = await evolutionPool.query(query);
return res.json(result.rows);
// Falta: result.release() ou similar
```

### Correto Seria

```typescript
// ✅ CORRETO: Libera conexão apropriadamente
const client = await evolutionPool.connect();
try {
  const result = await client.query(query);
  return res.json(result.rows);
} finally {
  client.release();
}
```

---

## 🔧 SOLUÇÃO

### Passo 1: Identificar todos os `.query()` em routes.ts

```bash
grep -n "\.query(" server/routes.ts
```

**Linhas problemáticas esperadas:**
- Linha 1095: Query de instâncias
- Linha 1150: Query de chats
- Linha 1200: Query de mensagens
- E outras...

### Passo 2: Corrigir padrão de uso

**Substituir:**
```typescript
const result = await evolutionPool.query(sql, params);
```

**Por:**
```typescript
const client = await evolutionPool.connect();
try {
  const result = await client.query(sql, params);
  // ... usar result
} finally {
  client.release();
}
```

### Passo 3: Restart do Servidor

Após as correções:
```bash
# Matar processo
taskkill /PID 32400 /F

# Reiniciar
npm run dev
```

---

## 📊 Impacto

### Antes (Atual - QUEBRADO)
```
Requisição 1:   Pool MAX 10 → Usa 1 conexão ✓
Requisição 2:   Pool MAX 10 → Usa 1 conexão ✓
...
Requisição 10:  Pool MAX 10 → Usa 1 conexão ✓
Requisição 11:  Pool MAX 10 → ECONNREFUSED ❌ (todas em uso)
```

### Depois (Corrigido)
```
Requisição 1:   Pool MAX 10 → Usa 1, libera 1 ✓
Requisição 2:   Pool MAX 10 → Usa 1, libera 1 ✓
...
Requisição 1000: Pool MAX 10 → Sempre disponível ✓
```

---

## 🔍 Checklist de Investigação

- [ ] Procurar por `evolutionPool.query(` em routes.ts
- [ ] Verificar se há `client.release()` após cada query
- [ ] Verificar error handlers (podem deixar conexões abertas)
- [ ] Testar com 1 requisição de instâncias
- [ ] Verificar se número de conexões volta para 0 depois
- [ ] Se não voltar = leak confirmado

---

## ⚠️ IMEDIATO

**ANTES de fazer qualquer otra coisa:**

### Opção 1: Quick Fix - Reiniciar servidor
```bash
# Matar
taskkill /PID 32400 /F

# Esperar 5 segundos
timeout /T 5

# Reiniciar
npm run dev
```

**Resultado esperado:** Instâncias carregam por um tempo, depois ECONNREFUSED volta

### Opção 2: Verificação Rápida
Se o problema voltar IMEDIATAMENTE após restart = **Connection leak confirmado**

Se durar alguns minutos = **pode ser outro problema**

---

## 🎯 Próximos Passos

1. **Restart server** → Instâncias carregam?
2. **Se sim, mas volta rápido:**
   - Connection leak confirmado
   - Necessário corrigir `.query()` calls

3. **Se não carrega:**
   - Pode ser outro problema (DB não acessível, etc)

---

## 📝 Arquivos Afetados

| Arquivo | Linhas | Problema |
|---------|--------|----------|
| `server/routes.ts` | 1085-1200 | Query sem release |
| `server/config/evolution-db.ts` | 23-31 | Pool config (OK) |
| `client/src/hooks/use-websocket.ts` | N/A | Front-end OK |

---

## 🚀 Timeline de Correção

**v1.0.35 (Próxima):**
- [ ] Fix connection pool leak em `/api/whatsapp/instances`
- [ ] Auditar TODOS os `.query()` calls
- [ ] Implementar connection pooling correto
- [ ] Testes de carga para verificar fix

---

**Status:** 🔴 AGUARDANDO RESTART DO SERVIDOR
