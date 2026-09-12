# CONTROL TOWER OPS - Setup AutomÃ¡tico
# Script para Windows PowerShell

Write-Host "ðŸš€ CONTROL TOWER OPS - Setup AutomÃ¡tico" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "1ï¸âƒ£  Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "âœ… Node.js $nodeVersion instalado" -ForegroundColor Green
} catch {
    Write-Host "âŒ Node.js nÃ£o encontrado. Instale em https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Verificar npm
Write-Host "2ï¸âƒ£  Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "âœ… npm $npmVersion instalado" -ForegroundColor Green
} catch {
    Write-Host "âŒ npm nÃ£o encontrado" -ForegroundColor Red
    exit 1
}

# Verificar Docker
Write-Host "3ï¸âƒ£  Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "âœ… Docker encontrado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "âŒ Docker nÃ£o encontrado. Instale em https://www.docker.com/" -ForegroundColor Red
    exit 1
}

# Verificar Docker Compose
Write-Host "4ï¸âƒ£  Verificando Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "âœ… Docker Compose encontrado: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "âŒ Docker Compose nÃ£o encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "âœ… Todas as dependÃªncias encontradas!" -ForegroundColor Green
Write-Host ""

# Iniciar Docker Compose
Write-Host "5ï¸âƒ£  Iniciando Docker Compose (PostgreSQL + Redis)..." -ForegroundColor Yellow
docker-compose up -d
Start-Sleep -Seconds 5

# Verificar se containers estÃ£o healthy
Write-Host "6ï¸âƒ£  Aguardando containers ficarem healthy..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$healthy = $false

while ($attempt -lt $maxAttempts) {
    $status = docker-compose ps --services --filter "status=running" | Measure-Object | Select-Object -ExpandProperty Count
    if ($status -eq 2) {
        $healthy = $true
        Write-Host "âœ… Containers estÃ£o rodando" -ForegroundColor Green
        break
    }
    $attempt++
    Start-Sleep -Seconds 1
}

if (-not $healthy) {
    Write-Host "âš ï¸  Containers demorando para iniciar. Verifique com: docker-compose ps" -ForegroundColor Yellow
}

Write-Host ""

# Setup Backend
Write-Host "7ï¸âƒ£  Setup Backend..." -ForegroundColor Yellow
Push-Location backend

if (-not (Test-Path .env)) {
    Write-Host "   Copiando .env.example para .env..." -ForegroundColor Gray
    Copy-Item .env.example .env
    Write-Host "   âœ… .env criado" -ForegroundColor Green
} else {
    Write-Host "   âœ… .env jÃ¡ existe" -ForegroundColor Green
}

Write-Host "   Instalando dependÃªncias (pode demorar 1-2 minutos)..." -ForegroundColor Gray
npm install --silent

Write-Host "   âœ… DependÃªncias instaladas" -ForegroundColor Green

Write-Host "   Aplicando migraÃ§Ãµes do banco..." -ForegroundColor Gray
npx prisma migrate dev --name init --skip-generate 2>&1 | Out-Null

Write-Host "   âœ… MigraÃ§Ãµes aplicadas" -ForegroundColor Green

Write-Host "   Criando master user..." -ForegroundColor Gray
npm run seed --silent

Write-Host "   âœ… Master user criado" -ForegroundColor Green

Pop-Location

Write-Host ""

# Setup Frontend
Write-Host "8ï¸âƒ£  Setup Frontend..." -ForegroundColor Yellow
Push-Location frontend

if (-not (Test-Path .env)) {
    Write-Host "   Copiando .env.example para .env..." -ForegroundColor Gray
    Copy-Item .env.example .env
    Write-Host "   âœ… .env criado" -ForegroundColor Green
} else {
    Write-Host "   âœ… .env jÃ¡ existe" -ForegroundColor Green
}

Write-Host "   Instalando dependÃªncias (pode demorar 1-2 minutos)..." -ForegroundColor Gray
npm install --silent

Write-Host "   âœ… DependÃªncias instaladas" -ForegroundColor Green

Pop-Location

Write-Host ""
Write-Host "ðŸŽ‰ Setup Completo!" -ForegroundColor Green
Write-Host ""
Write-Host "PrÃ³ximos passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1ï¸âƒ£  Terminal 1 - Iniciar Backend:" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2ï¸âƒ£  Terminal 2 - Iniciar Frontend:" -ForegroundColor Yellow
Write-Host "2️⃣  Terminal 2 - Iniciar Frontend:" -ForegroundColor Yellow
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3️⃣  Abrir navegador:" -ForegroundColor Yellow
Write-Host "   http://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "4️⃣  Login:" -ForegroundColor Yellow
Write-Host "   Email: master@ctops.com" -ForegroundColor Gray
Write-Host "   Senha: ChangeMeInProduction123!@#" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentação:" -ForegroundColor Cyan
Write-Host "   - SETUP.md - Guia de instalação" -ForegroundColor Gray
Write-Host "   - TESTING_GUIDE.md - Testes manuais" -ForegroundColor Gray
Write-Host "   - API_DOCUMENTATION.md - Endpoints" -ForegroundColor Gray
Write-Host ""

