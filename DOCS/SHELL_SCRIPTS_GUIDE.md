# Guia de Scripts Shell Seguro

Este documento explica como usar os scripts shell (`.sh`) do projeto de forma segura, usando variáveis de ambiente ao invés de credenciais hardcoded.

## 🔒 Segurança

Todos os scripts agora lêem credenciais de variáveis de ambiente definidas no arquivo `.env` ao invés de ter valores hardcoded. Isso garante que:

✅ Nenhuma credencial é exposta no repositório
✅ Scripts podem ser commitados publicamente com segurança
✅ Cada ambiente pode ter suas próprias credenciais
✅ Fácil gerenciamento de múltiplas chaves

## 📋 Scripts Disponíveis

### 1. `test_message.sh` - Testar Envio de Mensagem

Envia uma mensagem de teste via API local.

**Variáveis de ambiente necessárias:**
```bash
TEST_MESSAGE_TOKEN=seu-jwt-token-aqui
```

**Uso:**
```bash
# Adicionar no .env
export TEST_MESSAGE_TOKEN="seu-token-jwt"

# Executar
./test_message.sh
```

**O que faz:**
- Valida se o token está definido
- Verifica se o servidor está rodando em localhost:5051
- Envia uma mensagem de teste
- Exibe resultado em JSON

---

### 2. `sync-instances.sh` - Sincronizar Instâncias UazAPI

Sincroniza instâncias da UazAPI com o sistema.

**Variáveis de ambiente necessárias:**
```bash
SYNC_INSTANCES_TOKEN=seu-jwt-token-aqui
```

**Uso:**
```bash
# Adicionar no .env
export SYNC_INSTANCES_TOKEN="seu-token-jwt"

# Executar
./sync-instances.sh
```

**O que faz:**
- Valida se o token está definido
- Verifica se o servidor está rodando
- Sincroniza instâncias
- Exibe resultado em JSON

---

### 3. `test_api.sh` - Testar Endpoints da API

Testa vários endpoints da API para validar conexão.

**Variáveis de ambiente opcionais:**
```bash
AUTH_TOKEN=seu-token-de-autenticacao
TEST_EMAIL=seu-email@example.com
TEST_PASSWORD=sua-senha
```

**Uso:**
```bash
# Executar (sem autenticação)
./test_api.sh

# Ou com token de autenticação
export AUTH_TOKEN="seu-token"
./test_api.sh
```

**O que faz:**
- Testa endpoint `/health`
- Testa endpoint `/api/auth/login`
- Testa endpoint `/api/whatsapp/instances` (se AUTH_TOKEN definido)

---

### 4. `test_evolution_auth.sh` - Testar Métodos de Autenticação

Testa diferentes métodos de autenticação com Evolution API.

**Variáveis de ambiente necessárias:**
```bash
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-api-key-aqui
TEST_INSTANCE_NUMBER=numero-instancia
TEST_RECIPIENT_NUMBER=numero-destinatario
```

**Uso:**
```bash
# Adicionar no .env
export EVOLUTION_API_URL="https://sua-api.com"
export EVOLUTION_API_KEY="sua-chave"
export TEST_INSTANCE_NUMBER="5584987168184"
export TEST_RECIPIENT_NUMBER="558498973484"

# Executar
./test_evolution_auth.sh
```

**O que faz:**
- Testa Authorization: Bearer
- Testa header apikey
- Testa header X-API-Key
- Testa sem autenticação (diagnóstico)
- Testa com query string ?apikey=

---

### 5. `test_evolution_debug.sh` - Debug Evolution API

Testa funcionalidades principais da Evolution API com output formatado.

**Variáveis de ambiente necessárias:**
```bash
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-api-key-aqui
TEST_INSTANCE_NUMBER=numero-instancia
TEST_RECIPIENT_NUMBER=numero-destinatario
```

**Uso:**
```bash
# Adicionar no .env
export EVOLUTION_API_URL="https://sua-api.com"
export EVOLUTION_API_KEY="sua-chave"
export TEST_INSTANCE_NUMBER="5584987168184"
export TEST_RECIPIENT_NUMBER="558498973484"

# Executar
./test_evolution_debug.sh
```

**O que faz:**
- Lista todas as instâncias
- Verifica status de uma instância específica
- Testa envio de mensagem
- Exibe output formatado com JSON

---

### 6. `dev.sh` - Iniciar Ambiente de Desenvolvimento

Inicia servidor e cliente em modo desenvolvimento.

**Uso:**
```bash
./dev.sh
```

**O que faz:**
- Inicia servidor Express em background
- Aguarda servidor inicializar
- Inicia cliente Vite (bloqueia terminal)
- Ao encerrar cliente, também encerra servidor

---

## 📝 Configuração do .env

Copie `.env.example` para `.env` e preenchha com suas credenciais:

```bash
cp .env.example .env
```

Edite `.env` e defina todas as variáveis necessárias:

```bash
# Banco de dados principal
DATABASE_URL=postgresql://usuario:senha@host:5432/monitor_ia

# Evolution API
EVOLUTION_API_URL=https://sua-api.com
EVOLUTION_API_KEY=sua-chave-api

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Tokens de teste
TEST_MESSAGE_TOKEN=seu-token-jwt
SYNC_INSTANCES_TOKEN=seu-token-jwt
```

## ⚠️ Importante

- **Nunca commit `.env`** - O arquivo está em `.gitignore` e não deve ser commitado
- **Commit `.env.example`** - Use este como template
- **Uma chave por ambiente** - Use chaves diferentes para dev, staging, produção
- **Rotação de chaves** - Troque tokens e chaves periodicamente
- **Não compartilhe credenciais** - Nunca compartilhe seu `.env` com outras pessoas

## 🔑 Como Obter Credenciais

### JWT Tokens
```bash
# Fazer login na API e copiar o token retornado
curl -X POST http://localhost:5051/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu-email","password":"sua-senha"}'
```

### Evolution API Key
Obtém no painel da Evolution API (configurações da sua instância)

### Supabase Keys
1. Acesse https://app.supabase.com
2. Vá para seu projeto
3. Settings → API
4. Copie `Project URL` e `anon public key`

## 🧪 Testando Scripts

```bash
# 1. Verificar se .env está correto
cat .env | grep -E "TOKEN|KEY|URL"

# 2. Validar sintaxe do script
bash -n test_message.sh

# 3. Executar com debug
bash -x test_message.sh
```

## 🚀 Workflow Recomendado

1. **Setup Inicial**
   ```bash
   cp .env.example .env
   # Editar .env com suas credenciais
   npm install
   ```

2. **Desenvolvimento Local**
   ```bash
   ./dev.sh
   # Servidor rodando em localhost:5051
   # Cliente rodando em localhost:5173
   ```

3. **Testes Rápidos**
   ```bash
   ./test_api.sh          # Teste de saúde da API
   ./test_message.sh      # Teste de envio de mensagem
   ./sync-instances.sh    # Sincronização
   ```

4. **Debug Evolution API**
   ```bash
   ./test_evolution_debug.sh      # Debug completo
   ./test_evolution_auth.sh       # Testar autenticação
   ```

## ✅ Checklist de Segurança

- [ ] `.env` está em `.gitignore`
- [ ] Nenhuma credencial em código-fonte
- [ ] Scripts usam variáveis de ambiente
- [ ] `.env.example` com placeholders (sem valores reais)
- [ ] Chaves diferentes para cada ambiente
- [ ] Tokens com data de expiração
- [ ] Rotação periódica de credenciais

## 📚 Referências

- [12-Factor App - Config](https://12factor.net/config)
- [Environment Variables Best Practices](https://www.freecodecamp.org/news/how-to-use-environment-variables-to-secure-your-application/)
- [Shell Script Security](https://www.shellscript.sh/security.html)
