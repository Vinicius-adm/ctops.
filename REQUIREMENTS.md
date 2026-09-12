# CONTROL TOWER OPS (CTOps) - Requisitos

## Visão Geral
Sistema centralizado de observabilidade e automação para monitoramento de jobs, APIs, bancos de dados, containers Docker, agentes IA e incidentes. Com suporte a múltiplos usuários, isolamento de dados e permissões granulares.

---

## 1. AUTENTICAÇÃO, MULTIUSUÁRIO E PERMISSÕES

### 1.1 Sistema de Login
- Autenticação baseada em e-mail e senha
- Senhas armazenadas com hash seguro (bcrypt/argon2)
- JWT (access token) + refresh token (opcional no MVP)
- Fluxo:
  - Registro (opcional: apenas master cria usuários)
  - Login
  - Logout
  - Reset de senha (opcional)

### 1.2 Roles e Visibilidade
**Roles disponíveis:**
- **USER**: vê apenas os recursos e monitoramentos que ele cadastrou
- **ADMIN_MASTER**: vê e gerencia tudo (senha geral / conta master)

**Aplicação de ownership:**
- Todo recurso cadastrado deve ter `owner_user_id` (o usuário dono)

**Regras de acesso:**
- **USER**: CRUD apenas nos seus itens
- **ADMIN_MASTER**: CRUD em todos os itens

**Privilégios do ADMIN_MASTER:**
- Criar usuários
- Desativar usuários
- Resetar senha de usuários
- Transferir ownership de assets (opcional)

### 1.3 Entidades com Dono (Owner)
Aplicar `owner_user_id` em:
- jobs
- apis
- databases
- agents
- alert_rules
- incident_rules
- dashboards customizados (se houver)

**Containers Docker:**
- Podem ser globais, mas permitir "favoritar" por usuário (user_container_pins)

### 1.4 Conta Master
- Implementada como usuário ADMIN_MASTER (não como senha hardcoded)
- Deve existir 1 usuário master inicial criado por variáveis de ambiente:
  - `MASTER_EMAIL`
  - `MASTER_PASSWORD`
- Ao iniciar o sistema, se não existir master, criar automaticamente

---

## 2. MODELO DE DADOS

### 2.1 Nova Tabela: users
```
users:
  - id (PK)
  - email (UNIQUE)
  - name
  - password_hash
  - role (USER | ADMIN_MASTER)
  - is_active (boolean)
  - created_at (timestamp)
  - updated_at (timestamp)
```

### 2.2 Adicionar owner_user_id (FK users.id) em:
- jobs
- apis
- databases
- agents
- alert_rules
- incident_rules

### 2.3 Opcional:
```
user_container_pins:
  - user_id (FK)
  - container_name
  - pinned (boolean)
```

---

## 3. UI/UX - REQUISITOS VISUAIS

### 3.1 Padrão Visual
- Estilo clean com cards, sombras suaves, bordas arredondadas
- Tipografia moderna (ex: Inter)
- Cores consistentes (tema claro e dark opcional)
- Componentes padrão:
  - Sidebar com ícones
  - Topbar com busca e perfil do usuário
  - Cards de KPI
  - Tabelas com filtros
  - Estados: loading, empty, error

### 3.2 Página Inicial (HOME) - Command Center Interativo
Ao logar, mostrar um "Command Center" com:

**KPIs em cards:**
- Jobs: OK / Falha / Rodando
- Containers: Up / Down / Unhealthy
- APIs: Online / Offline
- DBs: OK / Erro
- Agentes IA: OK / Erro

**Seções interativas:**
- "Ações rápidas" (botões):
  - Cadastrar Automação
  - Cadastrar API
  - Cadastrar Banco
  - Cadastrar Agente IA
  - Ver Containers
- "Incidentes recentes" (lista clicável)
- "Falhas recorrentes" (top 5 com badge)
- "Dependências instáveis" (top 5)

### 3.3 Navegação (Sidebar)
- Home
- Automações
- APIs
- Bancos
- Docker
- Agentes IA
- Incidentes
- Alertas
- Administração (apenas para ADMIN_MASTER)

### 3.4 Telas Mínimas Requeridas
- **Login**: simples, bonito, com validação
- **Cadastro de Usuários** (opcional): apenas master cria
- **Automações (Jobs)**:
  - Lista com filtros, busca e paginação
  - Detalhe com timeline da execução (events)
  - CRUD completo
- **APIs**:
  - Lista e detalhe
  - Uptime/latência + logs de checks
  - CRUD
- **Bancos de Dados**:
  - Lista e detalhe
  - Status de checks
  - CRUD
- **Docker**:
  - Lista de containers
  - Detalhe com logs e métricas
  - Opção de favoritar
- **Agentes IA**:
  - Lista e detalhe
  - Latência/erros
  - CRUD
- **Incidentes**:
  - Lista com status
  - Detalhe com histórico
- **Alertas**:
  - Configuração de regras
  - Histórico

### 3.5 Padrões de Componentes
**Botões:**
- Primário: "Criar / Salvar"
- Secundário: "Cancelar / Voltar"
- Danger: "Excluir / Desativar"

**Sempre incluir:**
- Filtros, pesquisa e paginação quando relevante
- Loading states, empty states, error states

### 3.6 Tech Stack Sugerido
- React + Tailwind CSS
- shadcn/ui para componentes (buttons, cards, dialogs, tables)
- lucide-react para ícones
- Recharts para gráficos
- Framer Motion para animações leves
- TypeScript

---

## 4. BACKEND - ENDPOINTS

### 4.1 Endpoints de Autenticação
```
POST   /auth/login           - Login com e-mail/senha
POST   /auth/logout          - Logout (opcional)
GET    /auth/me              - Dados do usuário autenticado
```

### 4.2 Endpoints de Usuários (ADMIN_MASTER only)
```
POST   /users                - Criar novo usuário
GET    /users                - Listar todos os usuários
PATCH  /users/{id}/disable   - Desativar usuário
PATCH  /users/{id}/reset-password - Resetar senha
```

### 4.3 RBAC em Endpoints Existentes
Aplicar em todos endpoints de CRUD:
- Se role **USER**: filtrar por `owner_user_id = user.id`
- Se role **ADMIN_MASTER**: retornar tudo

---

## 5. IMPLEMENTAÇÃO

### 5.1 Prioridades (MVP)
1. [x] Estrutura do projeto
2. [ ] Autenticação e login
3. [ ] Tabela users e RBAC
4. [ ] UI: Login page
5. [ ] UI: Home/Command Center
6. [ ] UI: Navigation sidebar
7. [ ] Integração RBAC nos endpoints existentes
8. [ ] Admin panel (user management)

### 5.2 Sequência de Desenvolvimento
1. Backend: Implementar autenticação e RBAC
2. Backend: Adicionar owner_user_id às entidades
3. Frontend: Criar estrutura base com Tailwind/shadcn
4. Frontend: Implementar login
5. Frontend: Implementar Command Center
6. Frontend: Adaptar CRUD existentes para respeitar ownership
7. Testes e2e

---

## 6. RESULTADO ESPERADO

O app deve:
- Permitir login multiusuário com segurança
- Isolar dados por usuário (owner)
- Master ver e gerenciar tudo
- Ter UI moderna, limpa, interativa com "Command Center"
- Manter foco em observabilidade: jobs + conexões + docker + APIs + DB + agentes IA
