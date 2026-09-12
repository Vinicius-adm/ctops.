// frontend/src/services/apis.ts
import api from "@/services/api";

export type ApiDTO = {
  id: string;
  name: string;
  url: string;
  fingerprint?: string | null;
  method?: "GET" | "POST" | "PUT" | "PATCH";
  auth_type?: "NONE" | "BEARER" | "HEADER";
  auth_header_name?: string;

  // BACKEND NUNCA DEVOLVE SEGREDOS EM CLARO
  has_auth_token?: boolean;
  has_headers_json?: boolean;
  has_body?: boolean;
  validation_json_key?: string | null;
  description?: string | null;
  check_interval_seconds: number;
  timeout_seconds: number;

  last_check_at?: string | null;
  is_up?: boolean | null;
  latency_ms?: number | null;

  created_at: string;
  updated_at: string;
};

export type CreateApiPayload = {
  name: string;
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: string;
  auth_type?: "NONE" | "BEARER" | "HEADER";
  auth_header_name?: string;
  auth_token?: string;
  headers_json?: string;
  validation_json_key?: string;
  description?: string;
  check_interval_seconds?: number;
  timeout_seconds?: number;
};

export type UpdateApiPayload = Partial<CreateApiPayload>;

export type ApiTestResult = {
  ok: boolean;
  latency_ms: number;
  status?: number;
  message?: string;
  error?: string | null;
};

export type ApiHistoryEvent = {
  id: string;
  api_id: string;
  checked_at: string;
  ok: boolean;
  status?: number | null;
  latency_ms: number;
  error?: string | null;
};

export type ApiHistoryResponse = {
  range: string;
  from: string;
  to: string;
  events: ApiHistoryEvent[];
};

export const apisService = {
  async list(): Promise<ApiDTO[]> {
    const res = await api.get<ApiDTO[]>("/apis");
    return res.data;
  },

  async get(id: string): Promise<ApiDTO> {
    const res = await api.get<ApiDTO>(`/apis/${id}`);
    return res.data;
  },

  async create(payload: CreateApiPayload): Promise<ApiDTO> {
    const res = await api.post<ApiDTO>("/apis", payload);
    return res.data;
  },

  async update(id: string, payload: UpdateApiPayload): Promise<ApiDTO> {
    const res = await api.patch<ApiDTO>(`/apis/${id}`, payload);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/apis/${id}`);
  },

  async test(id: string): Promise<ApiTestResult> {
    const res = await api.post<ApiTestResult>(`/apis/${id}/test`);
    return res.data;
  },

  async history(id: string, range: "24h" | "7d" | "30d" = "24h"): Promise<ApiHistoryResponse> {
    const res = await api.get<ApiHistoryResponse>(`/apis/${id}/history`, {
      params: { range },
    });
    return res.data;
  },

  async revealUrl(id: string): Promise<{ url: string }> {
    const res = await api.get<{ url: string }>(`/apis/${id}/reveal`);
    return res.data;
  },
};
