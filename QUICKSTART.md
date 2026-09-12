# ✅ PRÉ-REQUISITOS & CHECKLIST PARA TESTAR

## 📋 Pré-requisitos do Sistema

### ✅ Node.js 18+
```powershell
node --version
# Esperado: v18.x.x ou superior
# Download: https://nodejs.org/
```

### ✅ npm 9+
```powershell
npm --version
# Esperado: 9.x.x ou superior
```

### ✅ Docker Desktop
```powershell
docker --version
# Esperado: Docker version 20.x ou superior
# Download: https://www.docker.com/products/docker-desktop
```

### ✅ Docker Compose
```powershell
docker-compose --version
# Esperado: Docker Compose version 2.x ou superior
```

---

## 🚀 Opção 1: Setup Automático (Recomendado)

### Executar script de setup
```powershell
# Abrir PowerShell como Administrator
cd C:\Users\cassio.jorge\Downloads\fleet-manager-hub-main
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
.\setup.ps1
```

**O que o script faz:**
- ✅ Verifica todas as dependências
- ✅ Inicia Docker Compose
- ✅ Instala npm packages (backend + frontend)
- ✅ Aplica migrations do banco
- ✅ Cria master user
- ✅ Mostra próximos passos

**Tempo estimado**: 3-5 minutos

### Após o setup, executar:
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 (novo PowerShell) - Frontend
cd frontend
npm run dev

# Terminal 3 - Abrir navegador em http://localhost:5173
```

---

## 🛠️ Opção 2: Setup Manual (Passo a Passo)

### Passo 1: Verificar dependências
```powershell
node --version      # v18+
npm --version       # 9+
docker --version    # 20+
docker-compose --version  # 2+
```

### Passo 2: Iniciar Docker
```powershell
cd C:\Users\cassio.jorge\Downloads\fleet-manager-hub-main
docker-compose up -d
docker-compose ps   # Verificar se está healthy
```

**Esperado**:
```
NAME            STATUS
ctops-postgres  Up (healthy)
ctops-redis     Up (healthy)
```

### Passo 3: Setup Backend
```powershell
cd backend

# Copiar .env
Copy-Item .env.example .env

# Instalar pacotes
npm install

# Aplicar migrations
npx prisma migrate dev --name init

# Criar master user
npm run seed

# Iniciar servidor
npm run dev
```

**Esperado**:
```
✅ Server running on http://localhost:3000
📝 Frontend URL: http://localhost:5173
```

✅ **Deixe rodando neste terminal!**

### Passo 4: Setup Frontend (novo terminal)
```powershell
cd C:\Users\cassio.jorge\Downloads\fleet-manager-hub-main\frontend

# Copiar .env
Copy-Item .env.example .env

# Instalar pacotes
npm install

# Iniciar dev server
npm run dev
```

**Esperado**:
```
➜ Local: http://localhost:5173/
```

✅ **Deixe rodando!**

### Passo 5: Testar
1. Abrir navegador em: **http://localhost:5173**
2. Login com:
   - Email: `master@ctops.com`
   - Senha: `ChangeMeInProduction123!@#`
3. Esperado: Redireciona para `/home`

---

## 🧪 Verificações Rápidas

### Health Check Backend
```powershell
curl http://localhost:3000/health

# Esperado:
# {"status":"ok","timestamp":"2026-01-06T..."}
```

### Testar Login
```powershell
$body = @{
    email = "master@ctops.com"
    password = "ChangeMeInProduction123!@#"
} | ConvertTo-Json

curl -X POST http://localhost:3000/auth/login `
  -ContentType "application/json" `
  -Body $body

# Esperado: access_token + user data
```

### Verificar Banco de Dados
```powershell
# Conectar ao PostgreSQL
psql -U ctops -d ctops_db -h localhost
# Senha: password

# Dentro do psql:
\dt                    # Ver tabelas
SELECT COUNT(*) FROM "User";  # Contar usuários
\q                     # Sair
```

---

## ❌ Troubleshooting Rápido

### "Cannot connect to database"
```powershell
# Parar tudo
docker-compose down -v

# Reiniciar
docker-compose up -d

# Aguardar 15 segundos
Start-Sleep -Seconds 15

# Tentar migrations novamente
cd backend
npx prisma migrate dev --name init
```

### "Port 3000 already in use"
```powershell
# Encontrar e matar processo
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Id $process.OwningProcess -Force
}
```

### "npm install fails"
```powershell
# Limpar e reinstalar
npm cache clean --force
Remove-Item -Recurse node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

### "Prisma error"
```powershell
cd backend
# Resetar banco (CUIDADO - deleta tudo)
npx prisma migrate reset
# Responda "yes"
npm run seed
```

---

## ✅ Checklist Pré-Teste

- [ ] Node.js 18+ (`node --version`)
- [ ] npm 9+ (`npm --version`)
- [ ] Docker instalado (`docker --version`)
- [ ] Docker Compose instalado (`docker-compose --version`)
- [ ] Docker Compose rodando (`docker-compose ps` com status healthy)
- [ ] Backend instalado (npm packages)
- [ ] Migrations aplicadas (tabelas criadas)
- [ ] Master user criado (comando seed)
- [ ] Backend rodando (`npm run dev` em terminal 1)
- [ ] Frontend instalado (npm packages)
- [ ] Frontend rodando (`npm run dev` em terminal 2)
- [ ] Browser abrindo `http://localhost:5173`
- [ ] Login funciona com `master@ctops.com`

---

## 📊 Status Esperado ao Finalizar

```
┌─────────────────────────────────────────┐
│  ✅ Todos os Serviços Rodando           │
├─────────────────────────────────────────┤
│  Backend:    http://localhost:3000      │
│  Frontend:   http://localhost:5173      │
│  Database:   localhost:5432 (healthy)   │
│  Redis:      localhost:6379 (healthy)   │
│  Status:     🟢 PRONTO PARA TESTAR      │
└─────────────────────────────────────────┘
```

---

## 🎯 Próximos Passos Após Setup

1. ✅ Testar login na interface
2. ✅ Criar usuários via POST /users
3. ✅ Testar CRUD endpoints (jobs, apis, etc)
4. ✅ Validar RBAC (teste com USER normal)
5. ✅ Consultar documentação:
   - API_DOCUMENTATION.md
   - TESTING_GUIDE.md
   - SECURITY_ARCHITECTURE.md

---

## 📞 Precisa de Ajuda?

Se algo não funcionar:

1. **Verificar logs do Docker**:
   ```powershell
   docker-compose logs postgres
   docker-compose logs redis
   ```

2. **Verificar console do terminal**:
   - Backend rodando? Ver logs em terminal 1
   - Frontend rodando? Ver console do navegador (F12)

3. **Resetar tudo**:
   ```powershell
   docker-compose down -v
   Remove-Item -Recurse backend\node_modules
   Remove-Item -Recurse frontend\node_modules
   # Rodar setup.ps1 novamente
   ```

4. **Consultar documentação**:
   - SETUP.md - Instalação detalhada
   - TESTING_GUIDE.md - Testes manuais
   - API_DOCUMENTATION.md - Endpoints

---

**Versão**: 1.0  
**Data**: 6 de janeiro de 2026  
**Status**: Pronto para teste ✅
