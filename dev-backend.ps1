# Inicia o backend em modo de desenvolvimento (PowerShell)
# Executar a partir da raiz do projeto: .\dev-backend.ps1

Set-StrictMode -Version Latest
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -Path (Join-Path $scriptDir 'backend')

Write-Host "Iniciando backend (npx tsx watch) em:`n$(Get-Location)" -ForegroundColor Cyan

# Usa npx para garantir que o bin local seja executado
npx tsx watch -r tsconfig-paths/register src/index.ts
