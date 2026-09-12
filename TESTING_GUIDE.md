# TESTING GUIDE - CONTROL TOWER OPS

## ✅ O que já está pronto:
- Backend completo com todos os endpoints
- Frontend com autenticação
- Docker Compose setup
- Documentação

## ❌ O que falta para testar:

### 1️⃣ **Instalar Node.js** (se não tiver)
```bash
# Verificar se tem Node.js 18+
node --version
npm --version

# Se não tiver: https://nodejs.org/
```

---

### 2️⃣ **Instalar/Verificar Docker**
```bash
# Verificar Docker
docker --version
docker-compose --version

# Se não tiver: https://www.docker.com/products/docker-desktop
```

---

### 3️⃣ **Setup Backend (5 minutos)**

#### Passo 1: Preparar variáveis de ambiente
```bash
cd "C:\Users\cassio.jorge\Downloads\fleet-manager-hub-main\backend"

# Copiar arquivo de exemplo
Copy-Item .env.example .env
```

#### Passo 2: Instalar dependências
```bash
npm install
```

**Esperado**: ✅ Sem erros, `node_modules` criado

#### Passo 3: Verificar Docker
```bash
# Voltar para diretório raiz
cd "C:\Users\cassio.jorge\Downloads\fleet-manager-hub-main"

# Iniciar PostgreSQL + Redis
docker-compose up -d

# Verificar se está rodando
docker-compose ps
```

**Esperado**:
```
NAME                COMMAND             STATUS
ctops-postgres      postgres            Up (healthy)
ctops-redis         redis               Up (healthy)
```

#### Passo 4: Configurar banco de dados
```bash
cd backend

# Criar tabelas
npx prisma migrate dev --name init

# Responda "yes" se perguntou
```

**Esperado**: ✅ Tabelas criadas, arquivo de migração gerado

#### Passo 5: Popular banco com master user
```bash
npm run seed
```

**Esperado**:
```
✅ Master user created: master@ctops.com
```

#### Passo 6: Iniciar servidor backend
```bash
npm run dev
```

**Esperado**:
```
✅ Server running on http://localhost:3001
📝 Frontend URL: http://localhost:5173
```

✅ **Deixe rodando neste terminal!**

---

### 4️⃣ **Setup Frontend (5 minutos)**

#### Passo 1: Abrir novo terminal PowerShell
```bash
# Navegue até frontend
cd "C:\Users\cassio.jorge\Downloads\fleet-manager-hub-main\frontend"

# Copiar env
Copy-Item .env.example .env
```

#### Passo 2: Instalar dependências
```bash
npm install
```

**Esperado**: ✅ Sem erros

#### Passo 3: Iniciar dev server
```bash
npm run dev
```

**Esperado**:
```
  ➜  Local:   http://localhost:5173/
```

✅ **Deixe rodando!**

---

### 5️⃣ **Testar a Aplicação**

#### Abrir navegador
Acesse: **http://localhost:5173**

#### Fazer login
- Email: `master@ctops.com`
- Senha: `ChangeMeInProduction123!@#`

**Esperado**: ✅ Redireciona para `/home` (ainda em desenvolvimento)

---

## 🧪 Testes Manuais (Terminal)

Se preferir testar via linha de comando:

### 1. Health check
```bash
curl http://localhost:3001/health
```

**Esperado**:
```json
{"status":"ok","timestamp":"2026-01-06T..."}
```

### 2. Login
```bash
$body = @{
    email = "master@ctops.com"
    password = "ChangeMeInProduction123!@#"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Esperado**: Token JWT e dados do usuário

### 3. Guardar token e testar /auth/me
```bash
# Copiar o access_token da resposta anterior

$token = "cole_o_token_aqui"

$headers = @{
    "Authorization" = "Bearer $token"
}

$response = Invoke-WebRequest -Uri "http://localhost:3001/auth/me" `
  -Method GET `
  -Headers $headers

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**Esperado**: Dados do usuário master

### 4. Criar uma job
```bash
$token = "seu_token"

$body = @{
    name = "Test Job"
    description = "Teste de job"
    schedule = "0 * * * *"
    status = "active"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$response = Invoke-WebRequest -Uri "http://localhost:3000/jobs" `
  -Method POST `
  -Headers $headers `
  -Body $body

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**Esperado**: Job criada com ID

### 5. Listar jobs
```bash
$token = "seu_token"

$headers = @{
    "Authorization" = "Bearer $token"
}

$response = Invoke-WebRequest -Uri "http://localhost:3000/jobs" `
  -Method GET `
  -Headers $headers

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**Esperado**: Array com a job que criou

---

## 🔍 Verificar Banco de Dados

```bash
# Conectar ao PostgreSQL
psql -U ctops -d ctops_db -h localhost

# Senha: password

# Dentro do psql:
\dt                          # Ver tabelas
SELECT * FROM "User";        # Ver usuários
SELECT * FROM "Job";         # Ver jobs
\q                           # Sair
```

---

## ❌ Troubleshooting

### "Cannot connect to database"
```bash
# Parar containers
docker-compose down

# Limpar volumes
docker-compose down -v

# Reiniciar
docker-compose up -d

# Esperar 10 segundos e tentar migrate novamente
```

### "Port 3000 already in use"
```bash
# Encontrar processo
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess

# Matar processo
Stop-Process -Id <PID> -Force
```

### "Port 5173 already in use"
```bash
# Mesmo procedimento acima, mas porta 5173
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess
Stop-Process -Id <PID> -Force
```

### "npm install fails"
```bash
# Limpar cache
npm cache clean --force

# Deletar node_modules e package-lock
Remove-Item -Recurse node_modules
Remove-Item package-lock.json

# Reinstalar
npm install
```

### "Prisma migration error"
```bash
# Resetar banco (cuidado - deleta tudo)
cd backend
npx prisma migrate reset

# Responda "yes"
npm run seed
```

---

## 📋 Checklist Pré-Teste

- [ ] Node.js 18+ instalado (`node --version`)
- [ ] Docker instalado e rodando (`docker --version`)
- [ ] Docker Compose rodando (`docker-compose ps` mostra healthy)
- [ ] Backend instalado (`cd backend && npm install`)
- [ ] Migrations aplicadas (`npx prisma migrate dev --name init`)
- [ ] Seed executado (`npm run seed` mostra ✅)
- [ ] Backend rodando (`npm run dev` rodando em terminal 1)
- [ ] Frontend instalado (`cd frontend && npm install`)
- [ ] Frontend rodando (`npm run dev` rodando em terminal 2)
- [ ] Browser aberto em `http://localhost:5173`
- [ ] Login funciona com `master@ctops.com`

---

## 🎯 Próximos Testes (Após Setup)

### Teste 1: Criar Usuário (ADMIN_MASTER)
```bash
POST /users
{
  "email": "user@test.com",
  "name": "Test User",
  "password": "test123456",
  "role": "USER"
}
```

### Teste 2: Listar Usuários
```bash
GET /users
```

### Teste 3: Criar Job
```bash
POST /jobs
{
  "name": "Daily Report",
  "description": "Generate daily report",
  "schedule": "0 9 * * *",
  "status": "active"
}
```

### Teste 4: Criar API
```bash
POST /apis
{
  "name": "GitHub API",
  "url": "https://api.github.com",
  "description": "GitHub REST API",
  "check_interval_seconds": 300,
  "timeout_seconds": 10
}
```

### Teste 5: Teste RBAC (USER não pode ver de outro)
1. Criar novo user `user@test.com`
2. Login com essa conta
3. Tentar ver job criada pelo master
4. **Esperado**: Erro 403 Forbidden

---

## 🔐 Teste de Segurança Básico

### Teste 1: Token inválido
```bash
curl -H "Authorization: Bearer invalid_token" http://localhost:3001/auth/me
# Esperado: 401 Unauthorized
```

### Teste 2: Sem token
```bash
curl http://localhost:3001/auth/me
# Esperado: 401 Unauthorized
```

### Teste 3: Senha errada
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"master@ctops.com","password":"wrongpassword"}'
# Esperado: 401 Invalid credentials
```

---

## 📊 Status Final Esperado

```
✅ Backend rodando na porta 3001
✅ Frontend rodando na porta 5173
✅ PostgreSQL rodando em localhost:5432
✅ Redis rodando em localhost:6379
✅ Login funciona
✅ CRUD endpoints acessíveis
✅ RBAC funcionando
✅ Banco de dados sincronizado
```

---

## 🚀 Se Tudo Passou!

Você está pronto para:
1. ✅ Desenvolver as páginas (Fase 2-7)
2. ✅ Testar funcionalidades
3. ✅ Fazer commits
4. ✅ Pedir para implementar novas features

---

**Versão**: 1.0  
**Data**: 6 de janeiro de 2026

Alguma dúvida durante o setup? Execute os comandos e compartilhe qualquer erro!
