#!/bin/bash

# Script para testar endpoints da API
# Credenciais devem ser definidas em variáveis de ambiente

echo "=== TESTE DE API ==="
echo ""

# Validar se o servidor está rodando
if ! timeout 2 bash -c "echo >/dev/tcp/localhost/5051" 2>/dev/null; then
  echo "❌ Erro: Servidor não está rodando em localhost:5051"
  echo "   Execute 'npm run dev' para iniciar o servidor"
  exit 1
fi

# 1. Test health
echo "1️⃣ Testando /health"
curl -s http://localhost:5051/health | jq '.' 2>/dev/null || curl -s http://localhost:5051/health
echo ""
echo ""

# 2. Test login
echo "2️⃣ Testando /api/auth/login"
echo "   ⚠️  Use credenciais válidas via .env ou variáveis de ambiente"
echo "   Exemplo: "
echo '     curl -X POST http://localhost:5051/api/auth/login \'
echo '       -H "Content-Type: application/json" \'
echo '       -d "{\"email\": \"seu-email@example.com\", \"password\": \"sua-senha\"}"'
echo ""
echo ""

# 3. Test instances endpoint
if [ -n "$AUTH_TOKEN" ]; then
  echo "3️⃣ Testando /api/whatsapp/instances com token"
  curl -s "http://localhost:5051/api/whatsapp/instances" \
    -H "Authorization: Bearer $AUTH_TOKEN" | jq '.' 2>/dev/null || echo "Resposta recebida"
  echo ""
  echo ""
else
  echo "3️⃣ Para testar /api/whatsapp/instances, defina AUTH_TOKEN:"
  echo "   export AUTH_TOKEN=seu-token-aqui"
  echo ""
  echo ""
fi

echo "✅ Testes concluídos"
echo ""
echo "📝 Nota: Para testes com credenciais, use variáveis de ambiente:"
echo "   export AUTH_TOKEN=seu-token"
echo "   export TEST_EMAIL=seu-email"
echo "   export TEST_PASSWORD=sua-senha"
