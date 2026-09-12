import api from './api';

export interface CreateContainerInput {
  name: string;
  image: string;
  host?: string;
}

export interface ContainerListResponse {
  containers: any[];
}

export interface CreateContainerResponse {
  id: string;
  name: string;
  image: string;
  status?: string;
  warning?: string;
}

export interface RefreshContainerResponse {
  id: string;
  name?: string;
  image?: string;
  status?: string;
  state?: any;
}

export interface ContainerLogsResponse {
  logs: string;
}

export const containersService = {
  async listContainers(host?: string): Promise<ContainerListResponse> {
    const res = await api.get('/containers', {
      params: host ? { host } : undefined,
    });
    return res.data;
  },

  async createContainer(input: CreateContainerInput): Promise<CreateContainerResponse> {
    const res = await api.post('/containers', input);
    return res.data;
  },

  async refreshContainer(id: string, host?: string): Promise<RefreshContainerResponse> {
    const res = await api.post(`/containers/${encodeURIComponent(id)}/refresh`, undefined, {
      params: host ? { host } : undefined,
    });
    return res.data;
  },

  async getContainerLogs(id: string, tail = 200, host?: string): Promise<ContainerLogsResponse> {
    const res = await api.get(`/containers/${encodeURIComponent(id)}/logs`, {
      params: { tail, ...(host ? { host } : {}) },
    });
    return res.data;
  },
};
