# Guia de Testes - Correção do Login "Failed to Fetch"

## Problema Resolvido

O erro "failed to fetch" no login na porta 5000 foi causado por:
- `queryClient.ts` estava tentando fazer fetch direto para `http://localhost:5051`
- Isso bypassa o proxy do Vite e causa erros de conexão
- A solução agora usa URLs relativas e deixa o Vite proxiar as requisições

## Como Testar

### 1. **Parar qualquer servidor anterior**
```bash
# Windows PowerShell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# MacOS/Linux
pkill -f "node" || true
pkill -f "npm" || true
```

### 2. **Liberar a porta 5000 (se necessário)**
```bash
# Windows PowerShell
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object {
    Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
}

# MacOS/Linux
lsof -ti:5000 | xargs kill -9 || true
```

### 3. **Iniciar o servidor**

**Opção A: Script automático (Recomendado)**
```bash
# Windows PowerShell
.\dev.ps1

# MacOS/Linux
./dev.sh
```

**Opção B: Manual**
```bash
# Terminal 1 - Express Server
npm run dev:server

# Aguardar ~3 segundos até ver "Server running on port 5051"

# Terminal 2 - Vite Client
npm run dev:client
```

### 4. **Testar o Login**

1. Abrir navegador: `http://localhost:5000`
2. Deve aparecer a página de login
3. **Tentar fazer login** com credenciais válidas
4. **Esperado**: Login bem-sucedido OU mensagem de erro clara do servidor (não "failed to fetch")

### 5. **Verificar Network Tab (DevTools)**

1. Abrir `F12` → Aba `Network`
2. Clicar em "Entrar"
3. Procurar por requisição `POST /api/auth/login`
4. **Esperado**: Status 200 (sucesso) ou 401/403 (credenciais inválidas)
5. **NÃO esperado**: "failed to fetch" ou erro de conexão

## O Que Mudou

### queryClient.ts
```typescript
// ANTES: Tentava conectar direto em localhost:5051
function getApiUrl(path: string): string {
  if (import.meta.env.DEV) {
    return `${protocol}//${hostname}:5051${path}`;
  }
  return path;
}

// DEPOIS: Usa URLs relativas (Vite proxy)
function getApiUrl(path: string): string {
  return path;
}
```

### vite.config.ts
```typescript
proxy: {
  "/api": {
    target: "http://localhost:5051",
    changeOrigin: true,
    secure: false,
    ws: true,
    rewrite: (path) => path,  // Novo: Rewrite explícito
  },
}
```

## Como o Proxy Funciona

### Fluxo de Requisição - Desenvolvimento
```
Browser (Port 5000)
    ↓
  fetch('/api/auth/login')
    ↓
Vite Proxy (Port 5000)
    ↓
  intercepts /api requests
    ↓
Express Server (Port 5051)
    ↓
  Processa requisição
    ↓
Response volta pelo proxy
    ↓
Browser recebe resposta
```

### Fluxo de Requisição - Produção
```
Browser (Mesma origem)
    ↓
  fetch('/api/auth/login')
    ↓
Production Server
    ↓
  Serve client + API
    ↓
Browser recebe resposta
```

## Troubleshooting

### Se ainda receber "failed to fetch"

1. **Verificar se Express está rodando**
   ```bash
   curl http://localhost:5051/api/config/public
   ```
   Esperado: JSON com configuração pública

2. **Verificar se Vite está rodando**
   ```bash
   curl http://localhost:5000
   ```
   Esperado: HTML do React app

3. **Limpar cache e localStorage**
   ```javascript
   // No DevTools Console
   localStorage.clear()
   sessionStorage.clear()
   // F5 para refresh
   ```

4. **Verificar Console do Vite**
   ```
   [vite] HTTP proxy error: /api/auth/login
   ```
   Se ver isso, Express pode estar down

5. **Verificar CORS headers**
   ```bash
   curl -i http://localhost:5051/api/auth/login
   ```
   Deve ter headers CORS se chamado diretamente

## Commits Relacionados

- `00471c6` - fix: Resolver erro 'failed to fetch' no login - usar proxy do Vite
- `8af37eb` - fix: Corrigir layout do sidebar collapse
- `ceccf9d` - feat: Configurar inicialização automática

## Próximas Ações

Se o login funcionar:
1. ✅ Fazer cadastro com novo email
2. ✅ Confirmar email (se ativado)
3. ✅ Fazer login com nova conta
4. ✅ Navegar pelo app
5. ✅ Testar funcionalidades do WhatsApp

Se ainda tiver problemas:
1. Verificar se `.env` tem as variáveis corretas
2. Verificar logs do servidor: `npm run dev:server`
3. Verificar console do navegador: `F12` → Console
4. Verificar Network tab: `F12` → Network → POST /api/auth/login

---

**Gerado em**: 2025-10-24
**Commit**: 00471c6
