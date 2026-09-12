# CONTROL TOWER OPS - Arquitetura de Segurança & RBAC

## 1. Fluxo de Autenticação

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ POST /auth/login { email, password }
       ▼
┌─────────────────────────────────────┐
│  Backend - Auth Controller          │
├─────────────────────────────────────┤
│ 1. Buscar user por email            │
│ 2. Validar password (bcrypt compare)│
│ 3. Gerar JWT (access + refresh)     │
│ 4. Retornar tokens                  │
└──────┬──────────────────────────────┘
       │ { access_token, refresh_token }
       ▼
┌─────────────┐
│   Frontend  │
│ - LocalStorage: access_token
│ - HttpOnly Cookie: refresh_token (recomendado)
└─────────────┘
```

### JWT Payload
```json
{
  "sub": "uuid-do-usuario",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

## 2. RBAC (Role-Based Access Control)

### Roles
- **USER**: Acesso restrito a recursos que ele mesmo criou (`owner_user_id`)
- **ADMIN_MASTER**: Acesso irrestrito a tudo

### Matriz de Permissões

| Ação | USER | ADMIN_MASTER |
|------|------|--------------|
| Ver próprio recurso | ✅ | ✅ |
| Ver recurso de outro | ❌ | ✅ |
| Editar próprio | ✅ | ✅ |
| Editar recurso de outro | ❌ | ✅ |
| Deletar próprio | ✅ | ✅ |
| Deletar recurso de outro | ❌ | ✅ |
| Criar novo recurso | ✅ | ✅ |
| Gerenciar usuários | ❌ | ✅ |
| Ver admin panel | ❌ | ✅ |

---

## 3. Middleware de RBAC

### Aplicação Backend

```typescript
// middleware/auth.ts
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { sub, email, role, ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// middleware/rbac.ts
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user.role !== 'ADMIN_MASTER') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

export function requireOwnerOrAdmin(resourceOwner: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user.role === 'ADMIN_MASTER' || req.user.sub === resourceOwner) {
      next();
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
  };
}
```

### Uso em Routers

```typescript
// routes/jobs.ts
router.get('/jobs', authMiddleware, async (req, res) => {
  // Se USER: filtrar por owner_user_id = req.user.sub
  // Se ADMIN_MASTER: retornar tudo
  const jobs = req.user.role === 'ADMIN_MASTER'
    ? await db.jobs.find({})
    : await db.jobs.find({ owner_user_id: req.user.sub });
  
  res.json(jobs);
});

router.get('/jobs/:id', authMiddleware, async (req, res) => {
  const job = await db.jobs.findById(req.params.id);
  
  // Verificar ownership
  if (req.user.role !== 'ADMIN_MASTER' && job.owner_user_id !== req.user.sub) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json(job);
});

router.post('/jobs', authMiddleware, async (req, res) => {
  // Sempre associar ao usuário atual
  const newJob = await db.jobs.create({
    ...req.body,
    owner_user_id: req.user.sub
  });
  
  res.json(newJob);
});

// Admin only
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  const users = await db.users.find({});
  res.json(users);
});
```

---

## 4. Frontend - Proteção de Rotas

```typescript
// context/AuthContext.tsx
export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Carregar user do localStorage + validar token
    const token = localStorage.getItem('access_token');
    if (token) {
      fetch('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => setUser(data))
        .catch(() => localStorage.removeItem('access_token'));
    }
  }, []);
  
  async function login(email: string, password: string) {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    setUser(data.user);
  }
  
  function logout() {
    localStorage.removeItem('access_token');
    setUser(null);
  }
  
  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// components/ProtectedRoute.tsx
export function ProtectedRoute({ children, requiredRole }: Props) {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/forbidden" />;
  }
  
  return <>{children}</>;
}

// App.tsx
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/home" element={<HomePage />} />
      <Route path="/jobs" element={<JobsPage />} />
      <Route path="/apis" element={<ApisPage />} />
      {/* ... outros módulos ... */}
      
      <Route element={<ProtectedRoute requiredRole="ADMIN_MASTER"><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin/users" element={<UsersManagement />} />
        <Route path="/admin/logs" element={<AuditLogs />} />
      </Route>
    </Route>
  </Routes>
</BrowserRouter>
```

---

## 5. Segurança: Boas Práticas

### Backend
- ✅ Passwords com **bcrypt** (rounds: 10+)
- ✅ JWT com **HS256** (algoritmo simétrico) ou **RS256** (assimétrico)
- ✅ Validação e sanitização de inputs (Zod/Joi)
- ✅ HTTPS em produção
- ✅ Rate limiting em `/auth/login`
- ✅ CORS configurado para frontend específico
- ✅ Não logar senhas ou tokens
- ✅ Env vars para secrets (JWT_SECRET, DB_URL, etc)

### Frontend
- ✅ Não armazenar tokens em localStorage (preferir sessionStorage/HttpOnly cookies)
- ✅ Enviar token no header `Authorization: Bearer {token}`
- ✅ Limpar tokens no logout
- ✅ Validar token expirado e redirecionar para login
- ✅ XSS prevention (sanitizar HTML)

### Database
- ✅ Queries com prepared statements (ORM ou parameterized queries)
- ✅ FK constraints para integridade referencial
- ✅ Índices em colunas de filtro (owner_user_id, status, etc)
- ✅ Backups regulares

---

## 6. Token Refresh (Opcional - MVP)

### Com Refresh Token
```
GET /auth/refresh
Body: { refresh_token: "..." }
Response: { access_token: "...", refresh_token: "..." }
```

Implementar se houver necessidade de sessões longas ou mobile app.

---

## 7. Fluxo de Login Completo

```
1. User entra email + password
   ↓
2. Backend valida (bcrypt)
   ↓
3. Se OK: gera JWT (1h) + Refresh (7d)
   ↓
4. Frontend armazena tokens
   ↓
5. Em cada requisição: Authorization: Bearer {jwt}
   ↓
6. Middleware valida JWT
   ↓
7. Se expirou: usa refresh_token para gerar novo JWT
   ↓
8. Se refresh também expirou: redireciona para login
```

---

## 8. Master User Setup

### Primeira Execução
```bash
export MASTER_EMAIL=master@ctops.com
export MASTER_PASSWORD=SenhaForte123!@#
npm run dev
```

### Resultado
- Usuário `master@ctops.com` criado com role `ADMIN_MASTER`
- Pode fazer login e acessar tudo
- Pode criar outros usuários

### Mudança de Senha (Futura)
```
PATCH /users/{id}/reset-password
Body: { new_password: "..." }
```
