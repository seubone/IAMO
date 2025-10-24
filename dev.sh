#!/bin/bash

# Script para iniciar servidor e cliente na ordem correta
# Uso: ./dev.sh

echo "════════════════════════════════════════════════════════════════"
echo "  Monitor IA - Development Server"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Verificar se npm está instalado
echo "✓ Verificando dependências..."
if ! command -v npm &> /dev/null; then
    echo "✗ npm não encontrado. Por favor, instale Node.js"
    exit 1
fi
npm_version=$(npm --version)
echo "  npm $npm_version instalado"

echo ""
echo "📋 Iniciando servidor (Express)..."
echo "   Aguarde pela mensagem: ✅ Conectado ao banco Evolution"
echo ""

# Iniciar servidor em background
npm run dev:server &
server_pid=$!
echo "   [PID: $server_pid]"

# Aguardar servidor ficar pronto
echo ""
echo "⏳ Aguardando servidor inicializar (máx 30 segundos)..."

server_ready=false
attempts=0
while [ "$server_ready" = false ] && [ $attempts -lt 30 ]; do
    if curl -s http://localhost:5051/api/config/public > /dev/null 2>&1; then
        server_ready=true
        echo ""
        echo "   ✅ Servidor pronto em http://localhost:5051"
    else
        attempts=$((attempts + 1))
        sleep 1
        echo -n "."
    fi
done

if [ "$server_ready" = false ]; then
    echo ""
    echo "✗ Timeout aguardando servidor inicializar"
    kill $server_pid
    exit 1
fi

echo ""
echo "📋 Iniciando cliente (Vite)..."
echo "   Aguarde pela mensagem: ready in XXX ms"
echo ""

# Iniciar cliente (isso vai bloquear até o usuário parar)
npm run dev:client

# Se chegou aqui, cliente foi fechado. Parar servidor também
echo ""
echo "⏹️  Encerrando servidor..."
kill $server_pid 2>/dev/null

echo "✅ Ambiente encerrado"
