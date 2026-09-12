import api from "@/services/api";

export type DashboardSummary = {
  scope: "OWN" | "ALL";
  jobs: { total: number; active: number };
  containers: { total: number; running: number; stopped: number; other: number };
  apis: { total: number; up: number; down: number; unknown: number };
  databases: { total: number; healthy: number; unhealthy: number; unknown: number };
  agents: { total: number; healthy: number; unhealthy: number; unknown: number };
  alerts: { total: number; enabled: number; disabled: number };
  incidents: {
    open: number;
    recent: Array<{ id: string; status: string; severity: string; title: string; created_at: string }>;
  };
};

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const res = await api.get<DashboardSummary>("/dashboard/summary");
    return res.data;
  },
};
