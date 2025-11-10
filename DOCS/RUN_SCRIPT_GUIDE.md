# 🚀 Guia do Script Unificado `run.sh`

O script `run.sh` é o **ponto de entrada único** para todas as tarefas de desenvolvimento e testes do projeto. Ele elimina a necessidade de múltiplos scripts separados, consolidando tudo em um único comando.

## ⚡ Início Rápido

```bash
# 1. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 2. Inicie o ambiente de desenvolvimento
./run.sh dev

# 3. Em outro terminal, rode testes
./run.sh test:api
./run.sh test:message
```

## 📋 Comandos Disponíveis

### Desenvolvimento

#### `./run.sh dev`
Inicia o ambiente de desenvolvimento com servidor Express e cliente Vite.

```bash
./run.sh dev
```

**O que faz:**
- Valida se `.env` existe
- Inicia servidor Express em background
- Aguarda servidor inicializar (max 30s)
- Inicia cliente Vite (bloqueia o terminal)
- Ao fechar cliente, também encerra servidor

**Saída esperada:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Starting Development Environment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Server ready on http://localhost:5051
✅ Client starting...
```

---

### Testes

#### `./run.sh test:api`
Testa endpoints principais da API.

```bash
./run.sh test:api
```

**Testa:**
- ✓ `/health` - Status do servidor
- ✓ `/api/whatsapp/instances` - Lista de instâncias (se AUTH_TOKEN configurado)

**Requer:**
- Servidor rodando
- (Opcional) `AUTH_TOKEN` no `.env`

---

#### `./run.sh test:message`
Testa envio de mensagem via API.

```bash
./run.sh test:message
```

**Requer:**
- Servidor rodando
- `TEST_MESSAGE_TOKEN` no `.env`
- `TEST_INSTANCE_NUMBER` no `.env` (padrão: 5584987168184)
- `TEST_RECIPIENT_NUMBER` no `.env` (padrão: 558498973484)

**O que faz:**
- Valida token
- Verifica se servidor está rodando
- Envia mensagem de teste
- Exibe resposta em JSON

---

#### `./run.sh test:sync`
Testa sincronização de instâncias UazAPI.

```bash
./run.sh test:sync
```

**Requer:**
- Servidor rodando
- `SYNC_INSTANCES_TOKEN` no `.env`

**O que faz:**
- Valida token
- Verifica se servidor está rodando
- Sincroniza instâncias
- Exibe resposta em JSON

---

#### `./run.sh test:evolution`
Testa diferentes métodos de autenticação com Evolution API.

```bash
./run.sh test:evolution
```

**Requer:**
- `EVOLUTION_API_URL` no `.env`
- `EVOLUTION_API_KEY` no `.env`
- `TEST_INSTANCE_NUMBER` no `.env` (opcional)
- `TEST_RECIPIENT_NUMBER` no `.env` (opcional)

**Testa 3 métodos de autenticação:**
1. `Authorization: Bearer`
2. `apikey` header
3. `X-API-Key` header

---

#### `./run.sh test:evolution:debug`
Debug completo da Evolution API com output formatado.

```bash
./run.sh test:evolution:debug
```

**Requer:**
- `EVOLUTION_API_URL` no `.env`
- `EVOLUTION_API_KEY` no `.env`

**Testa:**
1. Listagem de instâncias
2. Status de instância específica
3. Envio de mensagem

---

### Utilidades

#### `./run.sh validate`
Valida todas as variáveis de ambiente configuradas.

```bash
./run.sh validate
```

**Mostra:**
- ✅ Variáveis obrigatórias configuradas
- ⚠️  Variáveis opcionais faltando

---

#### `./run.sh help`
Exibe ajuda completa com todos os comandos.

```bash
./run.sh help
```

---

## 🔧 Configuração do `.env`

### Copiar Template

```bash
cp .env.example .env
```

### Variáveis Obrigatórias

```bash
# Supabase (Frontend)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica

# Supabase (Backend)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-privada
```

### Variáveis para Testes

```bash
# Tokens para testes
TEST_MESSAGE_TOKEN=seu-jwt-token-aqui
SYNC_INSTANCES_TOKEN=seu-jwt-token-aqui

# Evolution API
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-api

# Números para teste (WhatsApp)
TEST_INSTANCE_NUMBER=5584987168184
TEST_RECIPIENT_NUMBER=558498973484

# Token de autenticação (opcional)
AUTH_TOKEN=seu-token-aqui
```

## 🎯 Workflows Comuns

### 1. Desenvolver Localmente

```bash
# Terminal 1: Inicie dev
./run.sh dev

# Terminal 2: Rode testes enquanto desenvolve
./run.sh test:api
./run.sh test:message
```

### 2. Debug de Evolution API

```bash
# Teste diferentes métodos de autenticação
./run.sh test:evolution

# Debug detalhado
./run.sh test:evolution:debug
```

### 3. Verificar Configuração

```bash
# Valide seu .env
./run.sh validate

# Se houver erros, configure as variáveis faltando
nano .env
./run.sh validate
```

### 4. Teste Completo Pré-Deploy

```bash
# 1. Valide configuração
./run.sh validate

# 2. Teste API
./run.sh test:api

# 3. Teste mensagens
./run.sh test:message

# 4. Teste sincronização
./run.sh test:sync

# 5. Debug Evolution se necessário
./run.sh test:evolution:debug
```

## 🔍 Entendendo as Mensagens

### Mensagens de Sucesso
```
✅ Server ready on http://localhost:5051
✅ API tests completed
```

### Avisos
```
⚠️  AUTH_TOKEN not configured - skipping authenticated tests
```

### Erros
```
❌ Error: Required variable 'TEST_MESSAGE_TOKEN' is not configured in .env
```

Se vir um erro:
1. Verifique `.env` existe
2. Execute `./run.sh validate`
3. Configure variáveis faltando
4. Tente novamente

## 🚨 Troubleshooting

### "Server is not running"
```bash
# Solução: Inicie o servidor em outro terminal
./run.sh dev
```

### "Required variable 'X' is not configured"
```bash
# Solução: Configure variável no .env
nano .env
./run.sh validate
```

### "npm not found"
```bash
# Solução: Instale Node.js de https://nodejs.org/
node --version
npm --version
```

### Permissão negada ao executar script
```bash
# Solução: Torne o script executável
chmod +x run.sh
./run.sh help
```

## 📊 Comparação: Antes vs Depois

### Antes (Múltiplos Scripts)
```bash
./test_message.sh
./sync-instances.sh
./test_api.sh
./test_evolution_auth.sh
./test_evolution_debug.sh
# 5 scripts diferentes para lembrar!
```

### Depois (Um Script Unificado)
```bash
./run.sh test:message
./run.sh test:sync
./run.sh test:api
./run.sh test:evolution
./run.sh test:evolution:debug
# 1 script com comandos consistentes
```

## ✨ Características

✅ **Unificado** - Um script para todas as tarefas
✅ **Seguro** - Credenciais apenas em `.env`
✅ **Validação** - Verifica variáveis antes de executar
✅ **Informativo** - Mensagens claras e coloridas
✅ **Flexível** - Funciona em dev, staging, produção
✅ **Robusto** - Trata erros graciosamente

## 📝 Exemplos Práticos

### Exemplo 1: Setup Inicial

```bash
# 1. Clone o repositório
git clone <repo>
cd Monitoramento-de-IA

# 2. Instale dependências
npm install

# 3. Configure ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 4. Valide configuração
./run.sh validate

# 5. Inicie desenvolvimento
./run.sh dev
```

### Exemplo 2: Teste Rápido

```bash
# Validar setup
./run.sh validate

# Teste rápido
./run.sh test:api

# Se quiser testar mensagem também
./run.sh test:message
```

### Exemplo 3: Debug Evolution

```bash
# Teste autenticação
./run.sh test:evolution

# Debug detalhado
./run.sh test:evolution:debug
```

## 🔐 Segurança

- ✅ Nenhuma credencial no script
- ✅ Todas as chaves vêm de `.env`
- ✅ `.env` não é commitado (em `.gitignore`)
- ✅ Validação de variáveis antes de usar
- ✅ Mensagens de erro úteis

## 📚 Referências

- [Bash Script Best Practices](https://mywiki.wooledge.org/BashGuide)
- [12-Factor App Config](https://12factor.net/config)
- [Shell Script Security](https://www.shellscript.sh/security.html)
