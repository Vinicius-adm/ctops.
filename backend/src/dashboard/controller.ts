import { Response } from "express";
import { prisma } from "@/lib/prisma";
import { RequestWithUser } from "@/types";

type WhereOwner = Record<string, any>;

function ownerWhere(req: RequestWithUser): WhereOwner {
  if (!req.user) return { owner_user_id: "__NO_USER__" };
  return req.user.role === "ADMIN_MASTER" ? {} : { owner_user_id: req.user.sub };
}

export async function getDashboardSummary(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const where = ownerWhere(req);

    const [
      jobsTotal,
      jobsActive,
      apisTotal,
      apisUp,
      apisDown,
      dbsTotal,
      dbsHealthy,
      dbsUnhealthy,
      agentsTotal,
      agentsHealthy,
      agentsUnhealthy,
      containersTotal,
      containersRunning,
      containersStopped,
      containersOther,
      alertsTotal,
      alertsEnabled,
    ] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.count({ where: { ...where, status: "active" } }),

      prisma.aPI.count({ where }),
      prisma.aPI.count({ where: { ...where, is_up: true } }),
      prisma.aPI.count({ where: { ...where, is_up: false } }),

      prisma.database.count({ where }),
      prisma.database.count({ where: { ...where, is_healthy: true } }),
      prisma.database.count({ where: { ...where, is_healthy: false } }),

      prisma.agent.count({ where }),
      prisma.agent.count({ where: { ...where, is_healthy: true } }),
      prisma.agent.count({ where: { ...where, is_healthy: false } }),

      prisma.container.count({ where }),
      prisma.container.count({ where: { ...where, status: "running" } }),
      prisma.container.count({ where: { ...where, status: { in: ["exited", "dead", "stopped"] } } }),
      prisma.container.count({ where: { ...where, status: { notIn: ["running", "exited", "dead", "stopped"] } } }),

      prisma.alertRule.count({ where }),
      prisma.alertRule.count({ where: { ...where, enabled: true } }),
    ]);

    // INCIDENTS: NÃƒO TEM owner_user_id DIRETO, Ã‰ PELO IncidentRule.owner_user_id
    const incidentsOpen = await prisma.incident.count({
      where: {
        status: { in: ["open", "acknowledged"] },
        ...(req.user.role === "ADMIN_MASTER"
          ? {}
          : {
              rule: {
                owner_user_id: req.user.sub,
              },
            }),
      },
    });

    // RECENTES (SEM DADOS FICTÃCIOS)
    const recentIncidents = await prisma.incident.findMany({
      where: {
        ...(req.user.role === "ADMIN_MASTER"
          ? {}
          : {
              rule: {
                owner_user_id: req.user.sub,
              },
            }),
      },
      orderBy: { created_at: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        severity: true,
        title: true,
        created_at: true,
      },
    });

    res.json({
      scope: req.user.role === "ADMIN_MASTER" ? "ALL" : "OWN",
      jobs: {
        total: jobsTotal,
        active: jobsActive,
      },
      containers: {
        total: containersTotal,
        running: containersRunning,
        stopped: containersStopped,
        other: containersOther,
      },
      apis: {
        total: apisTotal,
        up: apisUp,
        down: apisDown,
        unknown: Math.max(0, apisTotal - apisUp - apisDown),
      },
      databases: {
        total: dbsTotal,
        healthy: dbsHealthy,
        unhealthy: dbsUnhealthy,
        unknown: Math.max(0, dbsTotal - dbsHealthy - dbsUnhealthy),
      },
      agents: {
        total: agentsTotal,
        healthy: agentsHealthy,
        unhealthy: agentsUnhealthy,
        unknown: Math.max(0, agentsTotal - agentsHealthy - agentsUnhealthy),
      },
      alerts: {
        total: alertsTotal,
        enabled: alertsEnabled,
        disabled: Math.max(0, alertsTotal - alertsEnabled),
      },
      incidents: {
        open: incidentsOpen,
        recent: recentIncidents,
      },
    });
  } catch (error: any) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ error: error?.message || "Erro interno do servidor" });
  }
}

