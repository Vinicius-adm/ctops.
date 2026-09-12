# CONTROL TOWER OPS - Startup (Inicia Backend + Frontend)
# Uso: ./start.ps1

Write-Host "Iniciando CONTROL TOWER OPS..." -ForegroundColor Cyan
Write-Host ""

# Função para abrir nova aba do terminal
function OpenNewTab {
    param([string]$Title, [string]$Command)
    $scriptBlock = {
        param($cmd)
        Invoke-Expression $cmd
    }
    & wt.exe new-tab -d $PSScriptRoot --title $Title --suppress-title pwsh -NoExit -Command "Set-Location '$PSScriptRoot'; $Command"
}

# Verificar Docker
Write-Host "1) Verificando Docker Compose..." -ForegroundColor Yellow
try {
    $status = docker-compose ps --services | Measure-Object | Select-Object -ExpandProperty Count
    if ($status -gt 0) {
        Write-Host "Docker Compose já está rodando" -ForegroundColor Green
    } else {
        Write-Host "   Iniciando Docker Compose..." -ForegroundColor Gray
        docker-compose up -d
        Start-Sleep -Seconds 3
        Write-Host "Docker Compose iniciado" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Erro ao iniciar Docker Compose" -ForegroundColor Red
    Write-Host "   Execute: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Iniciar Backend
Write-Host "2) Iniciando Backend (porta 3001)..." -ForegroundColor Yellow
try {
    # Tentar fechar processo anterior na porta 3001
    $process = Get-Process | Where-Object { $_.Handles -like "*3001*" } -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
} catch {}

if (Test-Path ".\wt.exe") {
    # Windows Terminal disponível
    OpenNewTab "Backend" "cd backend; npm run dev"
} else {
    # Usar PowerShell normal
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev" -WindowStyle Normal
}

Start-Sleep -Seconds 3

Write-Host "✅ Backend iniciado em http://localhost:3001" -ForegroundColor Green
Write-Host ""

# Iniciar Frontend
Write-Host "3) Iniciando Frontend (porta 5173)..." -ForegroundColor Yellow

if (Test-Path ".\wt.exe") {
    # Windows Terminal disponível
    OpenNewTab "Frontend" "cd frontend; npm run dev"
} else {
    # Usar PowerShell normal
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal
}

Start-Sleep -Seconds 2

Write-Host "✅ Frontend iniciado em http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "CONTROL TOWER OPS está pronto!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Abra o navegador:" -ForegroundColor Yellow
Write-Host "   http://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "Login:" -ForegroundColor Yellow
Write-Host "   Email: master@ctops.com" -ForegroundColor Gray
Write-Host "   Senha: ChangeMeInProduction123!@#" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentação:" -ForegroundColor Cyan
Write-Host "   - TESTING_GUIDE.md - Testes manuais" -ForegroundColor Gray
Write-Host "   - API_DOCUMENTATION.md - Endpoints" -ForegroundColor Gray
Write-Host ""
Write-Host "AVISO: Mantenha as abas do terminal abertas!" -ForegroundColor Yellow
Write-Host ""
