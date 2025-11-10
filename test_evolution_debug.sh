#!/bin/bash

# Script para debug da Evolution API
# Requer variáveis de ambiente:
#   - EVOLUTION_API_URL
#   - EVOLUTION_API_KEY
#   - TEST_INSTANCE_NUMBER
#   - TEST_RECIPIENT_NUMBER

# Validar variáveis de ambiente necessárias
if [ -z "$EVOLUTION_API_URL" ] || [ -z "$EVOLUTION_API_KEY" ]; then
  echo "❌ Erro: Variáveis de ambiente não definidas"
  echo ""
  echo "Defina as seguintes variáveis no seu .env:"
  echo "  EVOLUTION_API_URL=<URL da API Evolution>"
  echo "  EVOLUTION_API_KEY=<API Key da Evolution>"
  echo "  TEST_INSTANCE_NUMBER=<Número de instância para teste>"
  echo "  TEST_RECIPIENT_NUMBER=<Número destinatário para teste>"
  echo ""
  exit 1
fi

# Usar valores padrão se não especificados
INSTANCE="${TEST_INSTANCE_NUMBER:-5584987168184}"
RECIPIENT="${TEST_RECIPIENT_NUMBER:-558498973484}"

echo "=== Debug Evolution API ==="
echo "URL: $EVOLUTION_API_URL"
echo "Instance: $INSTANCE"
echo "Recipient: $RECIPIENT"
echo ""

echo "1️⃣  Testando GET /instance/list (verificar conexão)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$EVOLUTION_API_URL/instance/list" \
  -H "Authorization: Bearer $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || curl -s -X GET "$EVOLUTION_API_URL/instance/list" \
  -H "Authorization: Bearer $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json"
echo ""
echo ""

echo "2️⃣  Testando GET /instance/{id} (status da instância)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$EVOLUTION_API_URL/instance/$INSTANCE" \
  -H "Authorization: Bearer $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || curl -s -X GET "$EVOLUTION_API_URL/instance/$INSTANCE" \
  -H "Authorization: Bearer $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json"
echo ""
echo ""

echo "3️⃣  Testando POST /message/sendText (envio de mensagem)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$EVOLUTION_API_URL/message/sendText/$INSTANCE" \
  -H "Authorization: Bearer $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste de envio"}' | jq '.' 2>/dev/null || curl -s -X POST "$EVOLUTION_API_URL/message/sendText/$INSTANCE" \
  -H "Authorization: Bearer $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste de envio"}'
echo ""
echo ""

echo "✅ Debug concluído"
echo ""
echo "📝 Para usar este script, defina no .env:"
echo "   EVOLUTION_API_URL=https://chatwoot-evolution-api.eee3i0.easypanel.host"
echo "   EVOLUTION_API_KEY=<chave>"
echo "   TEST_INSTANCE_NUMBER=<número>"
echo "   TEST_RECIPIENT_NUMBER=<número>"
