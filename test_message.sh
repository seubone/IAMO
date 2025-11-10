#!/bin/bash

# Script para testar envio de mensagem via API
# Requer variável de ambiente: TEST_MESSAGE_TOKEN (definida no .env)

# Validar se o token foi definido
if [ -z "$TEST_MESSAGE_TOKEN" ]; then
  echo "❌ Erro: TEST_MESSAGE_TOKEN não está definido no .env"
  echo "   Certifique-se de que a variável de ambiente TEST_MESSAGE_TOKEN está configurada"
  exit 1
fi

# Validar se o servidor está rodando
if ! timeout 2 bash -c "echo >/dev/tcp/localhost/5051" 2>/dev/null; then
  echo "❌ Erro: Servidor não está rodando em localhost:5051"
  echo "   Execute 'npm run dev' para iniciar o servidor"
  exit 1
fi

echo "📤 Enviando mensagem de teste..."
curl -s -X POST "http://localhost:5051/api/whatsapp/send-message" \
  -H "Authorization: Bearer $TEST_MESSAGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceNumber": "5584987168184",
    "recipientNumber": "558498973484",
    "text": "Teste com URL UazAPI corrigida"
  }' | jq '.'

echo ""
echo "✅ Teste concluído"
