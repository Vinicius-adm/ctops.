@echo off
REM Inicia o backend em modo de desenvolvimento (Windows CMD)
REM Executar a partir da raiz do projeto: dev-backend.cmd

cd /d "%~dp0\backend"
echo Iniciando backend (npx tsx watch) em %cd%
npx tsx watch -r tsconfig-paths/register src/index.ts
