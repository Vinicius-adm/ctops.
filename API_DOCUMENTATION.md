# CONTROL TOWER OPS - API Documentation

Base URL: `http://localhost:3000`

## Authentication Endpoints

### POST /auth/login
Login com email e senha. Retorna JWT access token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "USER",
    "is_active": true,
    "created_at": "2026-01-05T12:00:00Z",
    "updated_at": "2026-01-05T12:00:00Z"
  }
}
```

### GET /auth/me
Retorna dados do usuário autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "USER",
  "is_active": true,
  "created_at": "2026-01-05T12:00:00Z",
  "updated_at": "2026-01-05T12:00:00Z"
}
```

### POST /auth/logout
Logout (opcional - apenas para limpeza no frontend).

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## Users Endpoints (ADMIN_MASTER only)

### POST /users
Criar novo usuário.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "email": "new@example.com",
  "name": "New User",
  "password": "password123",
  "role": "USER"
}
```

**Response (201):**
```json
{
  "id": "user-uuid",
  "email": "new@example.com",
  "name": "New User",
  "role": "USER",
  "is_active": true,
  "created_at": "2026-01-05T12:00:00Z"
}
```

### GET /users
Listar todos os usuários.

**Response (200):**
```json
[
  {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "USER",
    "is_active": true,
    "created_at": "2026-01-05T12:00:00Z",
    "updated_at": "2026-01-05T12:00:00Z"
  }
]
```

### PATCH /users/{id}/disable
Desativar um usuário.

**Response (200):**
```json
{
  "message": "User disabled successfully",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "is_active": false
  }
}
```

### PATCH /users/{id}/reset-password
Resetar senha de um usuário.

**Request:**
```json
{
  "new_password": "newpassword123"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  }
}
```

---

## Jobs Endpoints

### POST /jobs
Criar nova job/automação.

**Request:**
```json
{
  "name": "Daily Backup",
  "description": "Backup diário do banco",
  "schedule": "0 2 * * *",
  "status": "active"
}
```

**Response (201):**
```json
{
  "id": "job-uuid",
  "owner_user_id": "user-uuid",
  "name": "Daily Backup",
  "description": "Backup diário do banco",
  "schedule": "0 2 * * *",
  "status": "active",
  "last_run_at": null,
  "next_run_at": null,
  "created_at": "2026-01-05T12:00:00Z",
  "updated_at": "2026-01-05T12:00:00Z"
}
```

### GET /jobs
Listar jobs (filtrado por owner se USER).

**Response (200):**
```json
[
  {
    "id": "job-uuid",
    "owner_user_id": "user-uuid",
    "name": "Daily Backup",
    "description": "Backup diário do banco",
    "schedule": "0 2 * * *",
    "status": "active",
    "last_run_at": null,
    "next_run_at": null,
    "created_at": "2026-01-05T12:00:00Z",
    "updated_at": "2026-01-05T12:00:00Z"
  }
]
```

### GET /jobs/{id}
Obter detalhes de uma job com eventos.

**Response (200):**
```json
{
  "id": "job-uuid",
  "owner_user_id": "user-uuid",
  "name": "Daily Backup",
  "description": "Backup diário do banco",
  "schedule": "0 2 * * *",
  "status": "active",
  "last_run_at": "2026-01-05T02:00:00Z",
  "next_run_at": "2026-01-06T02:00:00Z",
  "created_at": "2026-01-05T12:00:00Z",
  "updated_at": "2026-01-05T12:00:00Z",
  "events": [
    {
      "id": "event-uuid",
      "job_id": "job-uuid",
      "status": "success",
      "output": "Backup completed",
      "error": null,
      "duration_ms": 5000,
      "created_at": "2026-01-05T02:00:00Z"
    }
  ]
}
```

### PATCH /jobs/{id}
Atualizar uma job.

**Request:**
```json
{
  "status": "paused"
}
```

**Response (200):** (Job atualizado)

### DELETE /jobs/{id}
Deletar uma job.

**Response (200):**
```json
{
  "message": "Job deleted successfully"
}
```

### GET /jobs/{id}/events
Obter eventos/execuções de uma job.

**Response (200):**
```json
[
  {
    "id": "event-uuid",
    "job_id": "job-uuid",
    "status": "success",
    "output": "Backup completed",
    "error": null,
    "duration_ms": 5000,
    "created_at": "2026-01-05T02:00:00Z"
  }
]
```

---

## APIs Endpoints

Endpoints para monitoramento de APIs externas.

### POST /apis
Criar novo endpoint de API.

**Request:**
```json
{
  "name": "GitHub API",
  "url": "https://api.github.com",
  "description": "GitHub REST API",
  "check_interval_seconds": 300,
  "timeout_seconds": 10
}
```

**Response (201):** (API object)

### GET /apis
Listar APIs (filtrado por owner se USER).

### GET /apis/{id}
Obter detalhes de uma API.

### PATCH /apis/{id}
Atualizar uma API.

### DELETE /apis/{id}
Deletar uma API.

---

## Databases Endpoints

Endpoints para monitoramento de bancos de dados.

### POST /databases
Criar novo database.

**Request:**
```json
{
  "name": "Production DB",
  "type": "postgresql",
  "host": "db.example.com",
  "port": 5432,
  "database_name": "app_db",
  "description": "Main application database"
}
```

**Response (201):** (Database object)

### GET /databases
Listar databases (filtrado por owner se USER).

### GET /databases/{id}
Obter detalhes de um database.

### PATCH /databases/{id}
Atualizar um database.

### DELETE /databases/{id}
Deletar um database.

---

## Agents Endpoints

Endpoints para monitoramento de agentes IA.

### POST /agents
Criar novo agente.

**Request:**
```json
{
  "name": "NLP Agent",
  "description": "Natural Language Processing Agent",
  "endpoint": "https://agent.example.com/health"
}
```

**Response (201):** (Agent object)

### GET /agents
Listar agentes (filtrado por owner se USER).

### GET /agents/{id}
Obter detalhes de um agente.

### PATCH /agents/{id}
Atualizar um agente.

### DELETE /agents/{id}
Deletar um agente.

---

## Alerts Endpoints

Endpoints para gerenciamento de regras de alertas.

### POST /alerts
Criar nova regra de alerta.

**Request:**
```json
{
  "name": "API Down Alert",
  "description": "Alert when API is down",
  "condition": "api.is_up == false",
  "enabled": true,
  "notification_channels": "email,slack"
}
```

**Response (201):** (AlertRule object)

### GET /alerts
Listar regras de alerta (filtrado por owner se USER).

### GET /alerts/{id}
Obter detalhes de uma regra.

### PATCH /alerts/{id}
Atualizar uma regra.

### DELETE /alerts/{id}
Deletar uma regra.

---

## Incidents Endpoints

Endpoints para gerenciamento de incidentes.

### POST /incidents
Criar novo incidente.

**Request:**
```json
{
  "rule_id": "rule-uuid",
  "severity": "high",
  "title": "API Down",
  "description": "GitHub API is not responding"
}
```

**Response (201):** (Incident object)

### GET /incidents
Listar incidentes.

### GET /incidents/{id}
Obter detalhes de um incidente.

### PATCH /incidents/{id}
Atualizar status de um incidente.

**Request:**
```json
{
  "status": "resolved"
}
```

### DELETE /incidents/{id}
Deletar um incidente.

---

## Error Responses

Todos os endpoints retornam erros em formato padronizado:

### 400 Bad Request
```json
{
  "error": "Invalid input",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["email"],
      "message": "Expected string, received number"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized - No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden - Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Job not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## RBAC Rules

| Operação | USER | ADMIN_MASTER |
|----------|------|--------------|
| Ver próprio recurso | ✅ | ✅ |
| Ver recurso de outro | ❌ | ✅ |
| Editar próprio | ✅ | ✅ |
| Editar de outro | ❌ | ✅ |
| Deletar próprio | ✅ | ✅ |
| Deletar de outro | ❌ | ✅ |
| Criar | ✅ | ✅ |
| Gerenciar usuários | ❌ | ✅ |

---

## Headers Requeridos

Todos os endpoints (exceto `/auth/login` e `/auth/logout`) requerem:

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

## Exemplo de Fluxo Completo

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"master@ctops.com","password":"ChangeMeInProduction123!@#"}'

# Response: { "access_token": "...", "user": { ... } }

# 2. Usar token para criar job
curl -X POST http://localhost:3000/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Job","schedule":"0 * * * *","status":"active"}'

# 3. Listar jobs
curl -X GET http://localhost:3000/jobs \
  -H "Authorization: Bearer <token>"
```

---

**Última atualização**: Janeiro 2026
