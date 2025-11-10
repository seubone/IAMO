#!/bin/bash

# Script para testar diferentes métodos de autenticação com Evolution API
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

echo "=== Teste Diferentes Headers de Autenticação ==="
echo ""
echo "🔑 Configuração:"
echo "   URL: $EVOLUTION_API_URL"
echo "   Instância: $INSTANCE"
echo "   Destinatário: $RECIPIENT"
echo ""

echo "1️⃣  Com Authorization: Bearer"
curl -s -X POST "$EVOLUTION_API_URL/message/sendText/$INSTANCE" \
  -H "Authorization: Bearer $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste"}' | grep -o '"status":[0-9]*' | head -1 || echo "Sem resposta"
echo ""

echo "2️⃣  Com header apikey"
curl -s -X POST "$EVOLUTION_API_URL/message/sendText/$INSTANCE" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste"}' | grep -o '"status":[0-9]*' | head -1 || echo "Sem resposta"
echo ""

echo "3️⃣  Com header X-API-Key"
curl -s -X POST "$EVOLUTION_API_URL/message/sendText/$INSTANCE" \
  -H "X-API-Key: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste"}' | grep -o '"status":[0-9]*' | head -1 || echo "Sem resposta"
echo ""

echo "4️⃣  Sem autenticação (para diagnóstico)"
curl -s -X POST "$EVOLUTION_API_URL/message/sendText/$INSTANCE" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste"}' | grep -o '"status":[0-9]*' | head -1 || echo "Sem resposta"
echo ""

echo "5️⃣  Com query string ?apikey="
curl -s -X POST "$EVOLUTION_API_URL/message/sendText/$INSTANCE?apikey=$EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"number":"'$RECIPIENT'","text":"Teste"}' | grep -o '"status":[0-9]*' | head -1 || echo "Sem resposta"
echo ""

echo "✅ Testes de autenticação concluídos"
echo ""
echo "📝 Para usar este script, defina no .env:"
echo "   EVOLUTION_API_URL=<url>"
echo "   EVOLUTION_API_KEY=<chave>"
echo "   TEST_INSTANCE_NUMBER=<número>"
echo "   TEST_RECIPIENT_NUMBER=<número>"
