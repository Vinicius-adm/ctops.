# CONTROL TOWER OPS - Database Schema

## Visão Geral
Schema PostgreSQL com suporte a autenticação, RBAC e isolamento de dados por usuário.

---

## Tabelas Principais

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('USER', 'ADMIN_MASTER')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);
```

### jobs (Automações)
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schedule VARCHAR(255), -- cron expression
  status VARCHAR(50) DEFAULT 'active',
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  INDEX idx_owner (owner_user_id),
  INDEX idx_status (status)
);
```

### job_events (Logs de execução)
```sql
CREATE TABLE job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status VARCHAR(50), -- success, failed, running
  output TEXT,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  INDEX idx_job_id (job_id),
  INDEX idx_created_at (created_at)
);
```

### apis
```sql
CREATE TABLE apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  description TEXT,
  check_interval_seconds INTEGER DEFAULT 300,
  timeout_seconds INTEGER DEFAULT 10,
  last_check_at TIMESTAMP,
  is_up BOOLEAN,
  latency_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  INDEX idx_owner (owner_user_id),
  INDEX idx_is_up (is_up)
);
```

### databases
```sql
CREATE TABLE databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- postgresql, mysql, mongodb, etc
  host VARCHAR(255) NOT NULL,
  port INTEGER,
  database_name VARCHAR(255),
  description TEXT,
  last_check_at TIMESTAMP,
  is_healthy BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  INDEX idx_owner (owner_user_id),
  INDEX idx_is_healthy (is_healthy)
);
```

### agents
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  endpoint VARCHAR(500),
  last_check_at TIMESTAMP,
  is_healthy BOOLEAN,
  latency_ms INTEGER,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  INDEX idx_owner (owner_user_id),
  INDEX idx_is_healthy (is_healthy)
);
```

### alert_rules
```sql
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  condition VARCHAR(255), -- ex: "api.latency > 5000"
  enabled BOOLEAN DEFAULT true,
  notification_channels VARCHAR(255), -- email, slack, etc
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  INDEX idx_owner (owner_user_id),
  INDEX idx_enabled (enabled)
);
```

### incident_rules
```sql
CREATE TABLE incident_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  condition VARCHAR(255),
  severity VARCHAR(50), -- low, medium, high, critical
  auto_resolve BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  INDEX idx_owner (owner_user_id),
  INDEX idx_severity (severity)
);
```

### incidents
```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES incident_rules(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'open', -- open, acknowledged, resolved
  severity VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  INDEX idx_rule_id (rule_id),
  INDEX idx_status (status),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at)
);
```

### user_container_pins (Favoritos de containers)
```sql
CREATE TABLE user_container_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  container_name VARCHAR(255) NOT NULL,
  pinned BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, container_name),
  INDEX idx_user_id (user_id)
);
```

---

## Índices Adicionais Recomendados

```sql
-- Para queries de audit
CREATE INDEX idx_audit ON users (created_at DESC);
CREATE INDEX idx_audit ON jobs (created_at DESC, owner_user_id);
CREATE INDEX idx_audit ON apis (created_at DESC, owner_user_id);

-- Para dashboard queries
CREATE INDEX idx_health_status ON apis (is_up, last_check_at DESC);
CREATE INDEX idx_health_status ON databases (is_healthy, last_check_at DESC);
CREATE INDEX idx_incidents_status ON incidents (status, created_at DESC);
```

---

## Seed Data - Master User

Ao iniciar a aplicação, executar (pseudocódigo):

```javascript
const masterEmail = process.env.MASTER_EMAIL || 'master@ctops.com';
const masterPassword = process.env.MASTER_PASSWORD || 'change-me';

const existingMaster = await db.users.findOne({ email: masterEmail });
if (!existingMaster) {
  const passwordHash = await bcrypt.hash(masterPassword, 10);
  await db.users.create({
    email: masterEmail,
    name: 'Master Admin',
    password_hash: passwordHash,
    role: 'ADMIN_MASTER',
    is_active: true
  });
}
```

---

## Notas de Design

1. **UUIDs**: Usar `gen_random_uuid()` para PKs por segurança (evita enumeração)
2. **Timestamps**: Todos os registros têm `created_at` e `updated_at`
3. **Soft deletes**: Não implementados (usar hard deletes com cascata)
4. **Índices**: Aplicados em FK, status queries e busca por proprietário
5. **RBAC**: Implementado em aplicação (middleware), não em nível de BD
6. **Isolamento**: Filtrar por `owner_user_id` nas queries de USER
