# 🚀 Guia de Inicialização do Desenvolvimento

**Objetivo:** Iniciar servidor e cliente na ordem correta automaticamente

---

## 📋 Opção 1: npm run dev (Windows/Mac/Linux)

**Mais simples e recomendada:**

```bash
npm run dev
```

**O que acontece:**
1. ✅ Express inicia na porta 5051
2. ⏳ Aguarda 3 segundos
3. ✅ Vite inicia na porta 5000
4. ✅ Ambos rodando simultaneamente

**Problema:** No Windows, pode não funcionar perfeitamente com `&`

---

## 🎯 Opção 2: Scripts Dedicados (Recomendado para Windows)

### **Windows - PowerShell**

```powershell
# Primeira vez: permitir execução de scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Depois, execute:
.\dev.ps1
```

**O que faz:**
1. Verifica se npm está instalado
2. Inicia Express em background
3. Aguarda servidor estar pronto (monitora endpoint `/api/config/public`)
4. Inicia Vite (bloqueia neste ponto)
5. Quando fecha Vite (Ctrl+C), fecha Express automaticamente

**Vantagens:**
- ✅ Detecta quando servidor está pronto (não é tempo fixo)
- ✅ Fecha servidor automaticamente quando cliente é fechado
- ✅ Mostra progresso visual
- ✅ Trata erros com graciosidade

---

### **Mac/Linux - Bash**

```bash
# Primeira vez: tornar executável
chmod +x dev.sh

# Depois, execute:
./dev.sh
```

**O que faz:** (Mesmo que PowerShell, mas em bash)
- ✅ Detecta quando servidor está pronto
- ✅ Fecha servidor automaticamente
- ✅ Mostra progresso
- ✅ Funciona perfeitamente em Mac/Linux

---

## 📊 Ordem de Inicialização

Ambas opções garantem a ordem correta:

```
Passo 1: npm run dev:server
         ↓
         Aguarda servidor estar pronto
         ↓
Passo 2: npm run dev:client
         ↓
         Ambos rodando!
```

---

## ✅ Verificação de Sucesso

Procure pelas mensagens:

**Terminal (Express):**
```
✅ Environment variables validated
🌱 Iniciando seed de dados...
✅ Conectado ao banco Evolution (WhatsApp)
📱 WhatsApp message polling started (3s interval)
9:55:06 PM [express] serving on port 5051  ← SUCESSO!
```

**Terminal (Vite):**
```
  VITE v7.1.12  ready in 1234 ms

  ➜  Local:   http://localhost:5000/  ← SUCESSO!
  ➜  Network: http://172.17.48.1:5000/
```

---

## 🛑 Parar a Execução

Pressione **Ctrl+C** uma vez:

```
⏹️  Encerrando servidor...
✅ Ambiente encerrado
```

---

## 🔧 Alternativa: Dois Terminais (Se scripts não funcionarem)

Se os scripts não funcionarem no seu ambiente:

**Terminal 1:**
```bash
npm run dev:server
```

Aguarde:
```
✅ Conectado ao banco Evolution
serving on port 5051
```

**Terminal 2 (em outro terminal):**
```bash
npm run dev:client
```

Aguarde:
```
ready in XXX ms
```

---

## 📝 Scripts Disponíveis

```json
{
  "dev": "npm run dev:server & sleep 3 && npm run dev:client",
  "dev:ordered": "concurrently -k -s first \"npm run dev:server\" \"npm run dev:client:wait\"",
  "dev:client:wait": "npm run wait:server && npm run dev:client",
  "dev:server": "cross-env NODE_ENV=development tsx watch server/index.ts",
  "dev:client": "vite --host 0.0.0.0 --port 5000"
}
```

- **dev**: Versão simples (melhor para Mac/Linux)
- **dev:ordered**: Versão com detecção (concurrently, mais robusta)
- **dev:server**: Apenas servidor
- **dev:client**: Apenas cliente
- **wait:server**: Aguarda servidor estar pronto

---

## 🐛 Troubleshooting

### Problema: "Port 5051 already in use"

```bash
# Encontrar processo na porta 5051
lsof -i :5051  # Mac/Linux
netstat -ano | findstr :5051  # Windows

# Matar processo
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

---

### Problema: "ECONNREFUSED"

**Causa:** Vite iniciou antes do Express
**Solução:** Usar `npm run dev` ou `./dev.ps1`/`./dev.sh`

---

### Problema: Script não executa (Windows)

```powershell
# Permitir execução
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🎯 Resumo

| Plataforma | Comando | Melhor Método |
|-----------|---------|---------------|
| **Windows** | `.\dev.ps1` | PowerShell script |
| **Mac** | `./dev.sh` | Bash script |
| **Linux** | `./dev.sh` | Bash script |
| **Qualquer** | `npm run dev` | Simples (funciona em geral) |

---

## ✨ Recomendação Final

**Use um destes para melhor experiência:**

```bash
# Windows
.\dev.ps1

# Mac/Linux
./dev.sh

# Qualquer plataforma
npm run dev
```

Todos garantem que:
- ✅ Express inicia PRIMEIRO
- ✅ Aguarda servidor ficar pronto
- ✅ Vite inicia DEPOIS
- ✅ Ambos rodando corretamente
- ✅ Sem erro ECONNREFUSED
- ✅ Chats carregam normalmente

