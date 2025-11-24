# Script PowerShell para iniciar servidor e cliente na ordem correta
# Uso: .\dev.ps1

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Monitor IA - Development Server" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se npm está instalado
Write-Host "✓ Verificando dependências..." -ForegroundColor Yellow
$npmVersion = npm --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ npm não encontrado. Por favor, instale Node.js" -ForegroundColor Red
    exit 1
}
Write-Host "  npm $npmVersion instalado" -ForegroundColor Green

Write-Host ""
Write-Host "📋 Iniciando servidor (Express)..." -ForegroundColor Cyan
Write-Host "   Aguarde pela mensagem: ✅ Conectado ao banco Evolution" -ForegroundColor Gray
Write-Host ""

# Iniciar servidor em background
$serverProcess = Start-Process -NoNewWindow -PassThru -ArgumentList "dev:server" npm
Write-Host "   [PID: $($serverProcess.Id)]" -ForegroundColor Gray

# Aguardar servidor ficar pronto
Write-Host ""
Write-Host "⏳ Aguardando servidor inicializar (máx 30 segundos)..." -ForegroundColor Yellow
$serverReady = $false
$attempts = 0
while (-not $serverReady -and $attempts -lt 30) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5051/api/config/public" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
            Write-Host "   ✅ Servidor pronto em http://localhost:5051" -ForegroundColor Green
        }
    } catch {
        # Servidor ainda não está pronto
    }

    if (-not $serverReady) {
        $attempts++
        Start-Sleep -Seconds 1
        Write-Host -NoNewline "."
    }
}

if (-not $serverReady) {
    Write-Host ""
    Write-Host "✗ Timeout aguardando servidor inicializar" -ForegroundColor Red
    Stop-Process -Id $serverProcess.Id
    exit 1
}

Write-Host ""
Write-Host "📋 Iniciando cliente (Vite)..." -ForegroundColor Cyan
Write-Host "   Aguarde pela mensagem: ready in XXX ms" -ForegroundColor Gray
Write-Host ""

# Iniciar cliente
& npm run dev:client

# Se chegou aqui, cliente foi fechado. Parar servidor também
Write-Host ""
Write-Host "⏹️  Encerrando servidor..." -ForegroundColor Yellow
Stop-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue

Write-Host "✅ Ambiente encerrado" -ForegroundColor Green
