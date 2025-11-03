#!/bin/bash

echo "=== TESTE DE API ==="
echo ""

# 1. Test health
echo "1️⃣ Testando /health"
curl -s http://localhost:5051/health
echo ""
echo ""

# 2. Test login
echo "2️⃣ Testando /api/auth/login"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5051/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contato.cainandesign@gmail.com","password":"Horiy5252ho."}')
echo "$LOGIN_RESPONSE" | head -c 100
echo ""
echo ""

# Extract token (simplified)
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token obtido: $(echo $TOKEN | cut -c1-50)..."
echo ""

# 3. Test instances endpoint (requires token)
if [ -n "$TOKEN" ]; then
  echo "3️⃣ Testando /api/whatsapp/instances"
  curl -s "http://localhost:5051/api/whatsapp/instances" \
    -H "Authorization: Bearer $TOKEN" | head -c 200
  echo ""
  echo ""
fi

echo "✅ Testes concluídos"
