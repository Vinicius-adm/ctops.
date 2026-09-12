import { Response } from "express";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { RequestWithUser } from "@/types";

import {
  getDockerClient,
  inspectContainer as inspectDocker,
  restartContainer as restartDocker,
  getContainerLogs as getDockerLogs,
} from "@/services/dockerService";

import {
  inspectAciContainerGroup,
  restartAciContainerGroup,
  getAciContainerLogs,
  inspectContainerAppsRevision,
  restartContainerAppsRevision,
} from "@/services/azureContainerService";

type Provider = "docker" | "azure_aci" | "azure_containerapps";

const listQuerySchema = z.object({
  host: z.string().optional(),
});

const createSchema = z
  .object({
    provider: z.enum(["docker", "azure_aci", "azure_containerapps"]).optional(),
    name: z.string().min(1),
    image: z.string().min(1),
    registry: z.string().nullable().optional(),
    host: z.string().nullable().optional(),

    azure_subscription_id: z.string().nullable().optional(),
    azure_resource_group: z.string().nullable().optional(),
    azure_resource_name: z.string().nullable().optional(),
    azure_revision_name: z.string().nullable().optional(),
    azure_container_name: z.string().nullable().optional(),

    polling_interval_seconds: z.number().int().positive().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

const updateSchema = createSchema.partial();

const logsQuerySchema = z.object({
  tail: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return 300;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      return Number.isFinite(n) ? Math.max(1, Math.min(5000, n)) : 300;
    }),
  timeoutMs: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return 60_000;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      return Number.isFinite(n) ? Math.max(5_000, Math.min(180_000, n)) : 60_000;
    }),
  sinceSec: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return 0;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      return Number.isFinite(n) ? Math.max(0, Math.min(86400, n)) : 0;
    }),
});

const historyQuerySchema = z.object({
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return 50;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      return Number.isFinite(n) ? Math.max(1, Math.min(500, n)) : 50;
    }),
});

async function assertContainerAccess(req: RequestWithUser, id: string) {
  if (!req.user) return { ok: false as const, status: 401, body: { error: "NÃ£o autorizado" } };

  const container = await prisma.container.findUnique({ where: { id } });
  if (!container) return { ok: false as const, status: 404, body: { error: "ContÃªiner nÃ£o encontrado" } };

  if (req.user.role !== "ADMIN_MASTER" && container.owner_user_id !== req.user.sub) {
    return { ok: false as const, status: 403, body: { error: "Proibido" } };
  }

  return { ok: true as const, container };
}

async function writeLog(container_id: string, level: "info" | "warn" | "error", message: string) {
  // LOG Ã‰ BEST-EFFORT: NUNCA PODE QUEBRAR A ROTA PRINCIPAL.
  // ALGUNS AMBIENTES (POSTGRES EM DOCKER) PODEM REINICIAR E DERRUBAR CONEXÃ•ES;
  // O PRISMA PODE LANÃ‡AR "Server has closed the connection". AQUI A GENTE RETENTA.
  const transientPatterns = [
    /Server has closed the connection/i,
    /Connection terminated unexpectedly/i,
    /ECONNRESET/i,
    /P1001/i, // can't reach database
    /P1008/i, // operations timed out
    /P1017/i, // server closed the connection
  ];

  const isTransient = (err: any) => {
    const msg = String(err?.message || err || "");
    return transientPatterns.some((r) => r.test(msg));
  };

  const attempt = async () => {
    await prisma.containerLog.create({
      data: {
        container_id,
        level,
        message,
      },
    });
  };

  try {
    await attempt();
  } catch (err1: any) {
    if (!isTransient(err1)) return;

    try {
      // PEQUENO BACKOFF
      await new Promise((r) => setTimeout(r, 300));
      await attempt();
    } catch {
      // NÃƒO PROPAGA
    }
  }
}

function safeName(name: string): string {
  return String(name || "").replace(/^\//, "");
}

// ==================== CRUD ====================

export async function listContainers(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    listQuerySchema.parse(req.query);

    const where = req.user.role === "ADMIN_MASTER" ? {} : { owner_user_id: req.user.sub };

    const containers = await prisma.container.findMany({
      where,
      orderBy: { created_at: "desc" },
    });

    res.json({ containers });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("List containers error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function getContainer(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const access = await assertContainerAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }
    res.json(access.container);
  } catch (error) {
    console.error("Get container error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function createContainer(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const data = createSchema.parse(req.body);
    const provider: Provider = (data.provider ?? "docker") as Provider;

    if (provider === "azure_aci") {
      if (!data.azure_subscription_id || !data.azure_resource_group || !data.azure_resource_name) {
        res.status(400).json({
          error: "Azure ACI requer azure_subscription_id, azure_resource_group e azure_resource_name.",
        });
        return;
      }
    }

    if (provider === "azure_containerapps") {
      if (
        !data.azure_subscription_id ||
        !data.azure_resource_group ||
        !data.azure_resource_name ||
        !data.azure_revision_name
      ) {
        res.status(400).json({
          error: "Azure Container Apps requer azure_subscription_id, azure_resource_group, azure_resource_name e azure_revision_name.",
        });
        return;
      }
    }

    const created = await prisma.container.create({
      data: {
        owner_user_id: req.user.sub,
        provider,
        name: safeName(data.name),
        image: data.image,
        registry: data.registry ?? null,
        host: data.host ?? null,

        azure_subscription_id: data.azure_subscription_id ?? null,
        azure_resource_group: data.azure_resource_group ?? null,
        azure_resource_name: data.azure_resource_name ?? null,
        azure_revision_name: data.azure_revision_name ?? null,
        azure_container_name: data.azure_container_name ?? null,

        polling_interval_seconds: data.polling_interval_seconds ?? 60,
        enabled: data.enabled ?? true,
      },
    });

    await writeLog(created.id, "info", `CONTAINER CADASTRADO (${created.provider})`);
    res.status(201).json(created);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Create container error:", error);
    res.status(500).json({ error: error?.message || "Erro interno do servidor" });
  }
}

export async function updateContainer(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const access = await assertContainerAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }

    const data = updateSchema.parse(req.body);

    const updated = await prisma.container.update({
      where: { id },
      data: {
        ...(data.provider ? { provider: data.provider } : {}),
        ...(data.name ? { name: safeName(data.name) } : {}),
        ...(data.image ? { image: data.image } : {}),
        ...(data.registry !== undefined ? { registry: data.registry } : {}),
        ...(data.host !== undefined ? { host: data.host } : {}),
        ...(data.azure_subscription_id !== undefined ? { azure_subscription_id: data.azure_subscription_id } : {}),
        ...(data.azure_resource_group !== undefined ? { azure_resource_group: data.azure_resource_group } : {}),
        ...(data.azure_resource_name !== undefined ? { azure_resource_name: data.azure_resource_name } : {}),
        ...(data.azure_revision_name !== undefined ? { azure_revision_name: data.azure_revision_name } : {}),
        ...(data.azure_container_name !== undefined ? { azure_container_name: data.azure_container_name } : {}),
        ...(data.polling_interval_seconds !== undefined ? { polling_interval_seconds: data.polling_interval_seconds } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      },
    });

    await writeLog(updated.id, "info", "CONTAINER ATUALIZADO");
    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Update container error:", error);
    res.status(500).json({ error: error?.message || "Erro interno do servidor" });
  }
}

export async function deleteContainer(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const access = await assertContainerAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }

    await prisma.container.delete({ where: { id } });
    res.json({ message: "Container deleted" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "ContÃªiner nÃ£o encontrado" });
      return;
    }
    console.error("Delete container error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// ==================== ACTIONS ====================

export async function refreshContainer(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const access = await assertContainerAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }

    const c = access.container;
    const now = new Date();

    let status: string | null = null;
    let restarts: number | null = null;
    let state: any = undefined;

    if (c.provider === "docker") {
      const client = getDockerClient(c.host || undefined);
      const inspected = await inspectDocker(client, c.name);
      status = inspected?.State?.Status ?? null;
      restarts =
        typeof inspected?.RestartCount === "number"
          ? inspected.RestartCount
          : inspected?.State?.RestartCount ?? null;
      state = inspected?.State;
    } else if (c.provider === "azure_aci") {
      if (!c.azure_subscription_id || !c.azure_resource_group || !c.azure_resource_name) {
        res.status(400).json({ error: "Azure ACI: dados incompletos no cadastro." });
        return;
      }
      const inspected = await inspectAciContainerGroup({
        subscriptionId: c.azure_subscription_id,
        resourceGroup: c.azure_resource_group,
        containerGroupName: c.azure_resource_name,
      });
      status = (inspected as any)?.provisioningState ?? (inspected as any)?.instanceView?.state ?? null;
      state = inspected;
    } else if (c.provider === "azure_containerapps") {
      if (!c.azure_subscription_id || !c.azure_resource_group || !c.azure_resource_name || !c.azure_revision_name) {
        res.status(400).json({ error: "Azure Container Apps: dados incompletos no cadastro." });
        return;
      }
      const inspected = await inspectContainerAppsRevision({
        subscriptionId: c.azure_subscription_id,
        resourceGroup: c.azure_resource_group,
        containerAppName: c.azure_resource_name,
        revisionName: c.azure_revision_name,
      });
      status = (inspected as any)?.properties?.provisioningState ?? null;
      state = inspected;
    }

    const updated = await prisma.container.update({
      where: { id },
      data: {
        status,
        restarts: restarts ?? undefined,
        last_seen_at: now,
      },
    });

    await writeLog(updated.id, "info", `REFRESH: status=${status ?? "null"}`);
    res.json({ ...updated, state });
  } catch (error: any) {
    console.error("Refresh container error:", error);
    res.status(500).json({ error: error?.message || "Erro interno do servidor" });
  }
}

export async function restartContainer(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const access = await assertContainerAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }

    const c = access.container;

    if (c.provider === "docker") {
      const client = getDockerClient(c.host || undefined);
      await restartDocker(client, c.name);
    } else if (c.provider === "azure_aci") {
      if (!c.azure_subscription_id || !c.azure_resource_group || !c.azure_resource_name) {
        res.status(400).json({ error: "Azure ACI: dados incompletos no cadastro." });
        return;
      }
      await restartAciContainerGroup({
        subscriptionId: c.azure_subscription_id,
        resourceGroup: c.azure_resource_group,
        containerGroupName: c.azure_resource_name,
      });
    } else if (c.provider === "azure_containerapps") {
      if (!c.azure_subscription_id || !c.azure_resource_group || !c.azure_resource_name || !c.azure_revision_name) {
        res.status(400).json({ error: "Azure Container Apps: dados incompletos no cadastro." });
        return;
      }
      await restartContainerAppsRevision({
        subscriptionId: c.azure_subscription_id,
        resourceGroup: c.azure_resource_group,
        containerAppName: c.azure_resource_name,
        revisionName: c.azure_revision_name,
      });
    }

    await writeLog(c.id, "warn", "RESTART SOLICITADO");
    res.json({ message: "Restart solicitado" });
  } catch (error: any) {
    console.error("Restart container error:", error);
    res.status(500).json({ error: error?.message || "Erro interno do servidor" });
  }
}

export async function getContainerLogs(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { tail, timeoutMs, sinceSec } = logsQuerySchema.parse(req.query);

    const access = await assertContainerAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }

    const c = access.container;

    let logs = "";
    if (c.provider === "docker") {
      const client = getDockerClient(c.host || undefined);
      logs = await getDockerLogs(client, c.name, tail, timeoutMs, sinceSec);
    } else if (c.provider === "azure_aci") {
      if (!c.azure_subscription_id || !c.azure_resource_group || !c.azure_resource_name || !c.azure_container_name) {
        res.status(400).json({ error: "Azure ACI: para logs, preencha azure_container_name no cadastro." });
        return;
      }
      logs = await getAciContainerLogs({
        subscriptionId: c.azure_subscription_id,
        resourceGroup: c.azure_resource_group,
        containerGroupName: c.azure_resource_name,
        containerName: c.azure_container_name,
        tail,
      });
    } else {
      logs = "Logs nÃ£o suportados para Azure Container Apps (revision).";
    }

    await writeLog(c.id, "info", `LOGS: tail=${tail} timeoutMs=${timeoutMs} sinceSec=${sinceSec}`);
    res.json({ logs });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Get container logs error:", error);
    res.status(500).json({ error: error?.message || "Erro interno do servidor" });
  }
}

export async function getContainerHistory(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { limit } = historyQuerySchema.parse(req.query);

    const access = await assertContainerAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }

    const history = await prisma.containerLog.findMany({
      where: { container_id: id },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    res.json(history);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Get container history error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

