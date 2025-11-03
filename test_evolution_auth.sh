#!/bin/bash

EVOLUTION_URL="https://chatwoot-evolution-api.eee3i0.easypanel.host"
API_KEY="429683C4C977415CAAFCCE10F7D57E11"
INSTANCE="5584987168184"
RECIPIENT="558498973484"

echo "=== Teste Diferentes Headers de Autenticação ==="
echo ""

echo "1. Com Authorization: Bearer (atual):"
curl -s -X POST "$EVOLUTION_URL/message/sendText/$INSTANCE" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste"}' | grep -o '"status":[0-9]*' | head -1
echo ""

echo "2. Com header apikey:"
curl -s -X POST "$EVOLUTION_URL/message/sendText/$INSTANCE" \
  -H "apikey: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste"}' | grep -o '"status":[0-9]*' | head -1
echo ""

echo "3. Com header X-API-Key:"
curl -s -X POST "$EVOLUTION_URL/message/sendText/$INSTANCE" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste"}' | grep -o '"status":[0-9]*' | head -1
echo ""

echo "4. Sem autenticação (apenas para ver resposta):"
curl -s -X POST "$EVOLUTION_URL/message/sendText/$INSTANCE" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste"}' | grep -o '"status":[0-9]*' | head -1
echo ""

echo "5. Com query string ?apikey=:"
curl -s -X POST "$EVOLUTION_URL/message/sendText/$INSTANCE?apikey=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste"}' | grep -o '"status":[0-9]*' | head -1
echo ""
