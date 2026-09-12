export type UserRole = 'USER' | 'ADMIN_MASTER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: Omit<User, 'password_hash'>;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface RequestWithUser extends Express.Request {
  user?: JWTPayload;
  // Permitir acesso a propriedades comuns do Express a partir de controladores
  body?: any;
  params?: any;
  headers?: any;
  query?: any;
}

export interface Job {
  id: string;
  owner_user_id: string;
  name: string;
  description?: string;
  schedule?: string;
  status: 'active' | 'inactive' | 'paused';
  last_run_at?: Date;
  next_run_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface API {
  id: string;
  owner_user_id: string;
  name: string;
  url: string;
  description?: string;
  check_interval_seconds: number;
  timeout_seconds: number;
  last_check_at?: Date;
  is_up?: boolean;
  latency_ms?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Database {
  id: string;
  owner_user_id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database_name: string;
  description?: string;
  last_check_at?: Date;
  is_healthy?: boolean;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Agent {
  id: string;
  owner_user_id: string;
  name: string;
  description?: string;
  endpoint?: string;
  last_check_at?: Date;
  is_healthy?: boolean;
  latency_ms?: number;
  error_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface AlertRule {
  id: string;
  owner_user_id: string;
  name: string;
  description?: string;
  condition: string;
  enabled: boolean;
  notification_channels?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IncidentRule {
  id: string;
  owner_user_id: string;
  name: string;
  description?: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  auto_resolve: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Incident {
  id: string;
  rule_id?: string;
  status: 'open' | 'acknowledged' | 'resolved';
  severity: string;
  title: string;
  description?: string;
  created_at: Date;
  resolved_at?: Date;
}
