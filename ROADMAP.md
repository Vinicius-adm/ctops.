# ROADMAP - CONTROL TOWER OPS (CTOps)

## FASE 1: AUTENTICAÇÃO E RBAC (MVP)

### Backend
- [ ] Setup base (Express, TypeScript, PostgreSQL)
- [ ] Implementar migrations do banco de dados
- [ ] Seed master user (via env vars)
- [ ] Middleware de autenticação (JWT)
- [ ] Endpoints `/auth/login`, `/auth/me`
- [ ] Middleware de RBAC
- [ ] Endpoints de gerenciamento de usuários (admin only)
  - `POST /users` - Criar usuário
  - `GET /users` - Listar usuários
  - `PATCH /users/{id}/disable` - Desativar
  - `PATCH /users/{id}/reset-password` - Resetar senha
- [ ] Adicionar `owner_user_id` às entidades existentes
- [ ] Aplicar RBAC em todos endpoints de CRUD

### Frontend
- [ ] Setup base (React, Vite, TypeScript, Tailwind, shadcn/ui)
- [ ] Componente: Login page
- [ ] Context: Auth (login, logout, user state)
- [ ] Proteção de rotas (ProtectedRoute)
- [ ] Armazenamento de JWT (localStorage/sessionStorage)

---

## FASE 2: UI/UX - LAYOUT E NAVEGAÇÃO

### Frontend
- [ ] Layout base com Sidebar + Topbar
- [ ] Navegação principal (nav items)
- [ ] Topbar com:
  - [ ] Barra de busca
  - [ ] Perfil do usuário (dropdown)
  - [ ] Logout button
- [ ] Sidebar com ícones (lucide-react)
- [ ] Página de 404
- [ ] Responsividade mobile (mobile menu)

---

## FASE 3: COMMAND CENTER (HOME PAGE)

### Frontend
- [ ] Página Home com seções:
  - [ ] KPI Cards (Jobs, Containers, APIs, DBs, Agents)
  - [ ] Ações Rápidas (botões de criação)
  - [ ] Incidentes Recentes
  - [ ] Falhas Recorrentes (top 5)
  - [ ] Dependências Instáveis (top 5)
- [ ] Gráficos (Recharts)
- [ ] Loading states
- [ ] Empty states

### Backend
- [ ] Endpoint aggregator para KPIs
- [ ] Endpoint para incidentes recentes
- [ ] Endpoint para falhas recorrentes
- [ ] Endpoint para dependências instáveis

---

## FASE 4: MÓDULOS CRUD (JOBS, APIS, DBS, AGENTS)

### Jobs (Automações)
**Backend:**
- [ ] GET /jobs - Listar (filtrado por owner)
- [ ] POST /jobs - Criar
- [ ] GET /jobs/:id - Detalhe
- [ ] PATCH /jobs/:id - Editar
- [ ] DELETE /jobs/:id - Deletar
- [ ] GET /jobs/:id/events - Timeline de execução

**Frontend:**
- [ ] Página: Lista de jobs
- [ ] Componente: Job card
- [ ] Página: Detalhe + Timeline
- [ ] Componente: Formulário de criar/editar
- [ ] Modal: Confirmar deleção

### APIs
**Backend:**
- [ ] GET /apis - Listar (filtrado por owner)
- [ ] POST /apis - Criar
- [ ] GET /apis/:id - Detalhe
- [ ] PATCH /apis/:id - Editar
- [ ] DELETE /apis/:id - Deletar
- [ ] GET /apis/:id/checks - Histórico de checks

**Frontend:**
- [ ] Página: Lista de APIs
- [ ] Componente: API card com status/latência
- [ ] Página: Detalhe + Gráfico de uptime
- [ ] Componente: Formulário de criar/editar

### Databases
**Backend:**
- [ ] GET /databases - Listar (filtrado por owner)
- [ ] POST /databases - Criar
- [ ] GET /databases/:id - Detalhe
- [ ] PATCH /databases/:id - Editar
- [ ] DELETE /databases/:id - Deletar
- [ ] GET /databases/:id/checks - Histórico de checks

**Frontend:**
- [ ] Página: Lista de databases
- [ ] Componente: DB card com status
- [ ] Página: Detalhe + Health history
- [ ] Componente: Formulário de criar/editar

### Agents (IA)
**Backend:**
- [ ] GET /agents - Listar (filtrado por owner)
- [ ] POST /agents - Criar
- [ ] GET /agents/:id - Detalhe
- [ ] PATCH /agents/:id - Editar
- [ ] DELETE /agents/:id - Deletar

**Frontend:**
- [ ] Página: Lista de agents
- [ ] Componente: Agent card
- [ ] Página: Detalhe
- [ ] Componente: Formulário de criar/editar

---

## FASE 5: DOCKER E CONTAINERS

### Backend
- [ ] Integração com Docker API
- [ ] GET /docker/containers - Listar containers
- [ ] GET /docker/containers/:name/logs - Logs do container
- [ ] GET /docker/containers/:name/metrics - Métricas (CPU, RAM)
- [ ] PUT /docker/containers/:name/restart - Restart container

### Frontend
- [ ] Página: Lista de containers
- [ ] Componente: Container card com status
- [ ] Página: Detalhe com logs e métricas
- [ ] Feature: Favoritar container (user_container_pins)
- [ ] Actions: Restart, stop, start

---

## FASE 6: INCIDENTES E ALERTAS

### Backend
- [ ] GET /incidents - Listar
- [ ] GET /incidents/:id - Detalhe
- [ ] PATCH /incidents/:id - Atualizar status
- [ ] GET /alerts/rules - Listar regras (admin)
- [ ] POST /alerts/rules - Criar regra
- [ ] PATCH /alerts/rules/:id - Editar regra
- [ ] DELETE /alerts/rules/:id - Deletar regra

### Frontend
- [ ] Página: Incidentes com filtros
- [ ] Componente: Incident card com severity badge
- [ ] Página: Detalhe + Histórico
- [ ] Página: Regras de alerta (admin)
- [ ] Componente: Formulário de criar/editar regra

---

## FASE 7: ADMIN PANEL

### Frontend
- [ ] Página: User management (admin only)
- [ ] Componente: Tabela de usuários
- [ ] Actions: Desativar, resetar senha, editar
- [ ] Componente: Formulário de criar usuário
- [ ] Página: Logs/Audit (opcional)

### Backend
- [ ] Implementar endpoints já definidos
- [ ] Audit logs (opcional)

---

## FASE 8: POLISH & DEPLOY

### Frontend
- [ ] Dark mode (opcional)
- [ ] Paginação em tabelas
- [ ] Filtros avançados
- [ ] Export de dados (CSV, PDF)
- [ ] Notificações (toast)
- [ ] Error handling e retry logic
- [ ] Performance optimization

### Backend
- [ ] Rate limiting
- [ ] Caching (Redis - opcional)
- [ ] Logging estruturado
- [ ] Error handling global
- [ ] Validação de inputs (Zod/Joi)
- [ ] Testes unitários

### DevOps
- [ ] Docker Compose setup
- [ ] CI/CD pipeline
- [ ] Deploy script
- [ ] Documentação de setup

---

## Dependências Críticas

```
FASE 1 (Auth) → FASE 2 (Layout) → FASE 3 (Home) → FASE 4+ (Módulos)
```

Todas as fases subsequentes dependem de autenticação funcional e layout base.

---

## Métricas de Sucesso

- [ ] MVP completo (Fases 1-3)
- [ ] Todos os módulos CRUD funcionais (Fase 4)
- [ ] UI responsiva e limpa
- [ ] RBAC funcionando corretamente
- [ ] Performance aceitável (<2s carregamento)
- [ ] Sem erros de segurança (XSS, CSRF, etc)
