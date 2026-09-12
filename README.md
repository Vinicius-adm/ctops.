# CONTROL TOWER OPS (CTOps)

Sistema centralizado de observabilidade e automação com suporte a múltiplos usuários, roles granulares e isolamento de dados.

## 📋 Estrutura do Projeto

```
control-tower-ops/
├── backend/              # API (Node.js/Express + PostgreSQL)
│   ├── src/
│   │   ├── auth/        # Autenticação e JWT
│   │   ├── users/       # Gerenciamento de usuários
│   │   ├── jobs/        # Automações
│   │   ├── apis/        # Monitoramento de APIs
│   │   ├── databases/   # Monitoramento de BDs
│   │   ├── docker/      # Integração Docker
│   │   ├── agents/      # Agentes IA
│   │   ├── incidents/   # Gerenciamento de incidentes
│   │   ├── alerts/      # Regras de alertas
│   │   └── middleware/  # RBAC, JWT, etc.
│   ├── db/
│   │   └── migrations/  # Schema inicial
│   └── package.json
│
├── frontend/            # React + Tailwind
│   ├── src/
│   │   ├── pages/       # Login, Home, etc.
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom hooks
│   │   ├── context/     # Auth context
│   │   ├── services/    # API calls
│   │   └── App.tsx
│   └── package.json
│
├── REQUIREMENTS.md      # Requisitos detalhados
└── docker-compose.yml   # Stack de desenvolvimento
```

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose

### Setup Backend
```bash
cd backend
npm install
npm run migrate
npm run dev
```

### Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### Variáveis de Ambiente

**Backend (.env)**
```
DATABASE_URL=postgresql://user:password@localhost:5432/ctops
JWT_SECRET=your-secret-key
MASTER_EMAIL=master@ctops.com
MASTER_PASSWORD=secure-password
NODE_ENV=development
```

**Frontend (.env)**
```
VITE_API_URL=http://localhost:3000
```

### Formato de host do Docker (quando configurado no app)
Ao adicionar um host de Docker no app, use um dos seguintes formatos de exemplo:
- Socket Unix: `/var/run/docker.sock`
- Named pipe (Windows): `\\.\pipe\docker_engine`
- TCP: `tcp://<host>:<port>` ou `<host>:<port>` (ex: `127.0.0.1:2375`)

## 📖 Documentação

- **[Requisitos](./REQUIREMENTS.md)** - Especificação completa
- **[API Endpoints](./backend/docs/api.md)** (criar)
- **[Banco de Dados](./backend/docs/schema.md)** (criar)

## 👥 Autenticação & Roles

- **USER**: Acesso restrito aos próprios recursos
- **ADMIN_MASTER**: Acesso total ao sistema

## 📝 Licença

MIT
