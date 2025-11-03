#!/bin/bash

EVOLUTION_URL="https://chatwoot-evolution-api.eee3i0.easypanel.host"
API_KEY="429683C4C977415CAAFCCE10F7D57E11"
INSTANCE="5584987168184"
RECIPIENT="558498973484"

echo "=== Teste Evolution API ==="
echo "URL: $EVOLUTION_URL"
echo "Instance: $INSTANCE"
echo ""

echo "1. Testando GET /instances (para verificar conexão):"
curl -s -X GET "$EVOLUTION_URL/instance/list" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" | head -c 200
echo ""
echo ""

echo "2. Testando GET /instance/{id} (status da instância):"
curl -s -X GET "$EVOLUTION_URL/instance/$INSTANCE" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" | head -c 200
echo ""
echo ""

echo "3. Testando POST /message/sendText (envio de mensagem):"
curl -s -X POST "$EVOLUTION_URL/message/sendText/$INSTANCE" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste de envio"}' | python -m json.tool 2>&1 | head -30
echo ""
