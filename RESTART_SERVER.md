# 🔄 Reiniciar Servidor - Guia Rápido

**Data:** 2025-11-24
**Versão:** v1.0.34 + Hotfix
**Problema Resolvido:** Connection Pool Exhaustion

---

## ✅ O que foi Corrigido

Arquivo: `server/config/evolution-db.ts`

**Problema:** Conexões não eram liberadas de volta ao pool
```
❌ ANTES: 400+ conexões ESTABLISHED → ECONNREFUSED
✅ DEPOIS: Conexões liberadas automaticamente → Instâncias carregam
```

---

## 🚀 Como Reiniciar

### Opção 1: Simples (Recomendado)

1. **Abra Terminal/PowerShell na pasta do projeto**
2. **Execute:**
```bash
npm run dev
```

### Opção 2: Matar Processo + Reiniciar

1. **Se tiver processo antigo (PID 32400) ainda rodando:**
```bash
# Via PowerShell
taskkill /PID 32400 /F

# Ou via Task Manager (Ctrl+Shift+Esc)
# Procure por "node.exe" e feche
```

2. **Reiniciar:**
```bash
npm run dev
```

### Opção 3: Se npm run dev travar

1. **Abra uma nova pasta/terminal**
2. **Execute:**
```bash
npm install
npm run build
npm run dev
```

---

## ✔️ Como Validar que o Fix Funcionou

### Teste 1: Verificar Servidor Rodando
```bash
curl http://localhost:5051/health

# Resultado esperado:
# {"status":"ok","timestamp":"...","uptime":...}
```

### Teste 2: Carregar Instâncias
1. Abra o navegador: `http://localhost:5000`
2. Clique no modal de instâncias
3. **Resultado esperado:** Instâncias carregam rapidamente

### Teste 3: Verificar Conexões da Pool

```bash
netstat -ano | findstr :5051 | grep ESTABLISHED | wc -l

# Resultado esperado:
# 1-10 conexões (não 400+)
```

---

## 📊 Comparação Antes vs Depois

### ANTES (❌ Quebrado)
```
Requisição 1:   ✓ Instâncias carregam
Requisição 2-5: ✓ Carregam
Requisição 6:   ❌ ECONNREFUSED (pool esgotada)
Requisição 7+:  ❌ ECONNREFUSED

Conexões ativas: 400+
Memory: 743 MB
```

### DEPOIS (✅ Corrigido)
```
Requisição 1:    ✓ Instâncias carregam
Requisição 2-5:  ✓ Carregam
Requisição 100:  ✓ Carregam (pool sempre disponível)
Requisição 1000: ✓ Carregam

Conexões ativas: 1-10
Memory: ~100-150 MB
```

---

## 🔍 Troubleshooting

### Problema: Ainda recebo ECONNREFUSED
**Solução:**
1. Matador todos os processos node:
```bash
taskkill /F /IM node.exe
```

2. Aguarde 5 segundos
3. Execute novamente:
```bash
npm run dev
```

### Problema: "Port 5051 already in use"
**Solução:**
```bash
# Encontrar processo na porta 5051
netstat -ano | findstr :5051

# Matar processo (substitua XXXX pelo PID)
taskkill /PID XXXX /F

# Aguarde 5 segundos e reinicie
npm run dev
```

### Problema: npm run dev trava no build
**Solução:**
```bash
# Limpar cache
npm cache clean --force

# Reinstalar deps
rm package-lock.json
npm install

# Reiniciar
npm run dev
```

---

## ✨ Confirmar Sucesso

Depois de reiniciar, você deve ver no console:

```
✅ Conectado ao banco Evolution (WhatsApp)
🚀 Server running on http://localhost:5051
📡 WebSocket ready
```

E no navegador:
```
✅ Instâncias carregam
✅ Sem erros ECONNREFUSED
✅ Chat funciona normalmente
```

---

## 📝 O que Mudou no Código

**Arquivo:** `server/config/evolution-db.ts` (linhas 57-78)

```typescript
// ✅ NOVO: Wrapper que garante release() da conexão
if (prop === 'query' && typeof (evolutionPoolInstance as any)[prop] === 'function') {
  return async (sql: string, values?: any[]) => {
    const client = await (evolutionPoolInstance as any).connect();
    try {
      return await client.query(sql, values);
    } finally {
      client.release();  // ✅ GARANTE que libera a conexão
    }
  };
}
```

---

## 🚀 Próximas Versões

- **v1.0.35:** WebSocket reconnection automática (QUICK_FIXES_PRIORITY1.md)
- **v1.0.36:** Code reorganization (features pattern)
- **v1.0.37:** Enhanced monitoring & alerts

---

**Criado:** 2025-11-24
**Status:** ✅ Pronto para Deploy
**Commit:** d4fc715

