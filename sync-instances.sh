#!/bin/bash

# Script para sincronizar instâncias UazAPI
# Requer variável de ambiente: SYNC_INSTANCES_TOKEN (definida no .env)

# Validar se o token foi definido
if [ -z "$SYNC_INSTANCES_TOKEN" ]; then
  echo "❌ Erro: SYNC_INSTANCES_TOKEN não está definido no .env"
  echo "   Certifique-se de que a variável de ambiente SYNC_INSTANCES_TOKEN está configurada"
  exit 1
fi

# Validar se o servidor está rodando
if ! timeout 2 bash -c "echo >/dev/tcp/localhost/5051" 2>/dev/null; then
  echo "❌ Erro: Servidor não está rodando em localhost:5051"
  echo "   Execute 'npm run dev' para iniciar o servidor"
  exit 1
fi

echo "🔄 Sincronizando instâncias UazAPI..."
curl -s -X POST "http://localhost:5051/api/sync/uazapi-instances" \
  -H "Authorization: Bearer $SYNC_INSTANCES_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "✅ Sincronização concluída"
