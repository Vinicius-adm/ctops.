import api from "@/services/api";

export type DatabaseDTO = {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database_name: string;
  description?: string | null;
  owner_user_id: string;
  created_at: string;
  updated_at: string;

  last_check_at?: string | null;
  is_healthy?: boolean | null;
  error_message?: string | null;
};

export type CreateDatabasePayload = {
  name: string;
  type: string;
  host: string;
  port: number;
  database_name: string;
  description?: string;
};

export type UpdateDatabasePayload = Partial<CreateDatabasePayload>;

export type DatabaseTestResult = {
  ok: boolean;
  latency_ms: number;
  message?: string;
  error?: string;
  host?: string;
  port?: number;
  type?: string;
};

export type DatabaseHealthItemDTO = {
  id: string;
  database_id: string;
  ok: boolean;
  latency_ms: number;
  error?: string | null;
  created_at: string;
};

export const databasesService = {
  async list(): Promise<DatabaseDTO[]> {
    const res = await api.get<DatabaseDTO[]>("/databases");
    return res.data;
  },

  async get(id: string): Promise<DatabaseDTO> {
    const res = await api.get<DatabaseDTO>(`/databases/${id}`);
    return res.data;
  },

  async create(payload: CreateDatabasePayload): Promise<DatabaseDTO> {
    const res = await api.post<DatabaseDTO>("/databases", payload);
    return res.data;
  },

  async update(id: string, payload: UpdateDatabasePayload): Promise<DatabaseDTO> {
    const res = await api.patch<DatabaseDTO>(`/databases/${id}`, payload);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/databases/${id}`);
  },

  async test(id: string, timeoutMs = 3000): Promise<DatabaseTestResult> {
    const res = await api.post<DatabaseTestResult>(
      `/databases/${id}/test?timeoutMs=${timeoutMs}`
    );
    return res.data;
  },

  async health(id: string, limit = 50): Promise<DatabaseHealthItemDTO[]> {
    const res = await api.get<DatabaseHealthItemDTO[]>(
      `/databases/${id}/health?limit=${limit}`
    );
    return res.data;
  },
};
