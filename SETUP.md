# CONTROL TOWER OPS - Setup & Installation Guide

## 📋 Pré-requisitos

- **Node.js**: 18+ ([download](https://nodejs.org/))
- **PostgreSQL**: 14+ ([download](https://www.postgresql.org/))
- **Docker & Docker Compose**: [download](https://www.docker.com/)

## 🚀 Instalação Rápida (Docker)

### 1. Clone e configure variáveis

```bash
cd fleet-manager-hub-main
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Inicie o stack de desenvolvimento (banco de dados)

```bash
docker-compose up -d
```

Verifica se PostgreSQL está rodando:

```bash
docker-compose ps
```

### 3. Setup Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run seed
```

Resultado esperado:
```
✅ Master user created: master@ctops.com
```

### 4. Inicie o servidor backend

```bash
npm run dev
```

Esperado:
```
✅ Server running on http://localhost:3000
```

### 5. Setup Frontend (em outro terminal)

```bash
cd frontend
npm install
npm run dev
```

Esperado:
```
  ➜  Local:   http://localhost:5173/
```

## 🔐 Login Padrão

Acesse `http://localhost:5173` e use:

- **Email**: `master@ctops.com`
- **Senha**: `ChangeMeInProduction123!@#` (ou configure `MASTER_PASSWORD` no `.env`)

## ⚙️ Variáveis de Ambiente

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://ctops:password@localhost:5432/ctops_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="1h"

# Master User
MASTER_EMAIL="master@ctops.com"
MASTER_PASSWORD="ChangeMeInProduction123!@#"

# Server
PORT=3000
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:5173"
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
```

## 📚 Comandos Úteis

### Backend

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build
npm start

# Migrations do Prisma
npx prisma migrate dev --name <description>
npx prisma migrate reset

# Seed da base de dados
npm run seed

# Lint & Type check
npm run lint
npm run type-check
```

### Frontend

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Preview da build
npm run preview

# Lint
npm run lint
```

## 🗄️ Database

### Acessar PostgreSQL

```bash
psql -U ctops -d ctops_db -h localhost
```

Senha: `password`

### Ver schema

```bash
\dt
\d+ users
```

### Resetar banco de dados

```bash
cd backend
npx prisma migrate reset
npm run seed
```

## 🔄 Fluxo de Desenvolvimento

1. **Backend**: Criação de rotas e controllers
2. **Migrations**: Executar migrações do Prisma
3. **Frontend**: Criar páginas e componentes
4. **API Integration**: Conectar frontend com backend
5. **Testes**: Validar funcionalidades

## 🛠️ Arquitetura de Pastas

```
backend/
├── src/
│   ├── auth/        → Autenticação (login, JWT)
│   ├── users/       → Gerenciamento de usuários
│   ├── jobs/        → Automações
│   ├── apis/        → Monitoramento de APIs
│   ├── databases/   → Monitoramento de BDs
│   ├── agents/      → Agentes IA
│   ├── incidents/   → Gerenciamento de incidentes
│   ├── alerts/      → Regras de alertas
│   ├── middleware/  → RBAC, autenticação
│   ├── types/       → TypeScript types
│   └── utils/       → Utilitários (JWT, etc)
├── prisma/
│   ├── schema.prisma → Schema do banco
│   └── seed.ts       → Dados iniciais
└── package.json

frontend/
├── src/
│   ├── pages/       → Páginas (login, home, etc)
│   ├── components/  → Componentes reutilizáveis
│   ├── hooks/       → Custom hooks
│   ├── context/     → Auth context
│   ├── services/    → API calls
│   ├── types/       → TypeScript types
│   └── utils/       → Utilitários
├── index.html
└── package.json
```

## 🐛 Troubleshooting

### Erro: "Cannot connect to PostgreSQL"

- Verificar se Docker está rodando: `docker-compose ps`
- Resetar banco: `docker-compose down && docker-compose up -d`

### Erro: "Port 3000 already in use"

```bash
# Kill processo na porta 3000
lsof -ti:3000 | xargs kill -9
```

### Erro: "JWT_SECRET not found"

Verificar se `.env` está configurado corretamente no backend.

### Erro: "Module not found"

```bash
# Reinstalar dependências
cd backend && npm install
cd frontend && npm install
```

## 📖 Documentação

- **[Requirements](../REQUIREMENTS.md)** - Especificação completa
- **[Database Schema](../DATABASE_SCHEMA.md)** - Schema do banco de dados
- **[Security Architecture](../SECURITY_ARCHITECTURE.md)** - Autenticação e RBAC
- **[Roadmap](../ROADMAP.md)** - Plano de desenvolvimento

## ✅ Checklist - Primeiro Run

- [ ] Docker rodando (`docker-compose ps`)
- [ ] Backend instalado (`npm install`)
- [ ] Migrações aplicadas (`npx prisma migrate dev`)
- [ ] Seed executado (`npm run seed`)
- [ ] Backend rodando (`npm run dev`)
- [ ] Frontend instalado (`npm install`)
- [ ] Frontend rodando (`npm run dev`)
- [ ] Login funciona em `http://localhost:5173`

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs: `docker-compose logs postgres`
2. Verificar console do backend
3. Verificar console do navegador (DevTools)
4. Resetar banco: `npx prisma migrate reset`

---

**Versão**: 0.1.0  
**Data**: Janeiro 2026
