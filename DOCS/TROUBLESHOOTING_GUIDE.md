# 🔧 GUIA DE TROUBLESHOOTING - Chats Não Aparecem

**Data:** 23 de Outubro de 2025
**Status:** Identificado e Solução Pronta

---

## 📋 PROBLEMAS IDENTIFICADOS NOS LOGS

### **Problema 1: ECONNREFUSED no Vite**
```
[client] 21:25:15 [vite] http proxy error: /api/config/public
[client] AggregateError [ECONNREFUSED]
```

**Causa:** Express não estava rodando quando Vite iniciou
**Resultado:** Vite não consegue fazer proxy para `/api/*`

---

### **Problema 2: Token UazAPI com instanceNumber vazio**
```
9:55:14 PM [express] POST /api/uazapi/instances 200 :: {"instanceNumber":"","apiToken":"37a…
```

**Causa:** Ao salvar token, o `instanceNumber` não foi enviado
**Resultado:** Token salvo mas não é verificado (instanceNumber vazio)

---

### **Problema 3: Chats Retornam 304 (Cache)**
```
9:55:15 PM [express] GET /api/whatsapp/instances/.../chats 304 in 2…
```

**Causa:** Response anterior foi cacheada
**Resultado:** Sem problemas (304 = "não mudou"), mas pode parecer que não funciona

---

## ✅ SOLUÇÃO COMPLETA

### **Passo 1: Garantir Ordem Correta de Inicialização**

**IMPORTANTE:** Express DEVE iniciar ANTES do Vite

```bash
# Terminal 1 - PRIMEIRO
npm run dev:server
# Aguarde log: "serving on port 5051"
# Aguarde log: "✅ Conectado ao banco Evolution"

# Terminal 2 - DEPOIS
npm run dev:client
# Aguarde log: "ready in XXX ms"
# Vite fará proxy automaticamente
```

**Por que é importante:**
1. Express registra as rotas `/api/*`
2. Express inicia a conexão com Evolution DB
3. Vite faz proxy das requisições para Express

Se Vite iniciar primeiro, ele vai receber `ECONNREFUSED` porque Express ainda não está pronto.

---

### **Passo 2: Salvar Token UazAPI com instanceNumber Correto**

**Problema Atual:**
Você está salvando token com `instanceNumber=""` (vazio)

**Solução:**
Antes de clicar "Configurar", certifique que:
1. Uma instância está selecionada em "Selecionar Instância"
2. O número aparece no botão (ex: "Instância: 558498...")
3. DEPOIS clique em "Configurar"

**Fluxo Correto:**
```
1. Clique "Selecionar Instância"
2. Modal aparece com grid de instâncias
3. Clique em UMA instância
4. Botão atualiza para "Instância: 55849897..."  ← Confirme aqui!
5. DEPOIS clique "Configurar"
6. Salve o token
```

---

### **Passo 3: Limpar Cache e Recarregar**

Após salvar token corretamente:

```javascript
// No console do browser
localStorage.clear()  // Limpa cache
location.reload()     // Recarrega página
```

Ou simplesmente:
1. Abra DevTools (F12)
2. Aba Network
3. Marque "Disable Cache"
4. Clique "Configurar" novamente
5. Salve token
6. Chats devem aparecer

---

## 🧪 TESTE PASSO A PASSO

### **Checklist de Verificação:**

**Backend:**
- [ ] Terminal Express mostra: `✅ Conectado ao banco Evolution`
- [ ] Terminal Express mostra: `serving on port 5051`
- [ ] Sem erros de conexão

**Frontend:**
- [ ] Vite iniciou em porta 5000
- [ ] Sem erro `[vite] http proxy error`
- [ ] Login funciona

**Instância:**
- [ ] Clique "Selecionar Instância"
- [ ] Modal com grid aparece
- [ ] Selecione uma instância
- [ ] Botão mostra nome/número (ex: "Instância: 55849897...")

**Token:**
- [ ] Clique "Configurar"
- [ ] Cole token UazAPI válido
- [ ] Clique "Salvar"
- [ ] Mensagem: "✅ Token salvo com sucesso"
- [ ] **VERIFICAR LOGS:** Deve mostrar `instanceNumber` **NÃO VAZIO**

**Resultado Final:**
- [ ] Input de mensagem aparece
- [ ] Chat carrega normalmente
- [ ] Consegue visualizar as mensagens

---

## 🔍 DIAGNÓSTICO SE AINDA NÃO FUNCIONAR

### **1. Verificar Token Salvo Corretamente**

Abra DevTools → Console:
```javascript
// Ver o que foi salvo
console.log(localStorage.getItem('selected_instance_id'))

// Verificar query em Network
// GET /api/uazapi/instances/55849897... (note o número!)
// Deve retornar: { instanceNumber: "55849897...", hasToken: true, createdAt: "..." }
```

---

### **2. Verificar Chats no Banco**

Se token foi salvo mas chats não aparecem:

A. **Opção 1 - Via Frontend:**
```javascript
// DevTools → Network
// Filtre por: /chats
// GET /api/whatsapp/instances/f4cca134.../chats
// Response deve ser array de chats: [{ id, name, lastMessage, ... }, ...]
```

B. **Opção 2 - Via Database:**
```sql
-- Conectar ao Evolution DB
SELECT COUNT(*) FROM "Chat" WHERE "instanceId" = 'f4cca134-c9d7-48f5-9338-4dc9e97373ff';

-- Se = 0: Sem dados de chat no banco
-- Se > 0: Dados existem, problema é na transferência
```

---

### **3. Logs do Express para Debugar**

Procure nos logs do Express:
```
POST /api/uazapi/instances 200 :: {"instanceNumber":"55849897...", ...}
↑ instanceNumber DEVE estar preenchido!

GET /api/whatsapp/instances/f4cca134.../chats 200 in Xms :: [...]
↑ Response deve vir com array de chats
```

---

## 📝 RESUMO DA SOLUÇÃO

| Problema | Causa | Solução |
|----------|-------|---------|
| ECONNREFUSED | Express não rodava quando Vite iniciou | Iniciar Express ANTES do Vite |
| Token com instanceNumber vazio | Não selecionou instância antes de salvar | Selecionar instância → depois salvar |
| Chats não aparecem | Cache do browser | Limpar localStorage ou desabilitar cache |

---

## 🚀 PRÓXIMOS PASSOS

1. **Iniciar na ordem correta** (Express primeiro)
2. **Selecionar instância ANTES de configurar token**
3. **Salvar token com número da instância**
4. **Limpar cache do browser**
5. **Recarregar página**
6. **Chats devem aparecer! ✅**

---

## 💡 DICAS IMPORTANTES

**Sempre quando não funcionar:**
1. Verifique logs do Express (procure por erros)
2. Verifique Network no DevTools (veja requests/responses)
3. Limpe cache do browser (Ctrl+Shift+Del ou DevTools)
4. Recarregue a página (Ctrl+F5)

**Se ainda não funcionar:**
- Pause Vite (Ctrl+C)
- Pause Express (Ctrl+C)
- Aguarde 5 segundos
- Inicie Express
- Aguarde "✅ Conectado ao banco Evolution"
- Inicie Vite
- Teste novamente

---

Este guia deve resolver todos os problemas! 🎉

