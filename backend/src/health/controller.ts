import { Response } from "express";
import { RequestWithUser } from "@/types";
import { prisma } from "@/lib/prisma";
import {
  openIncidentIfNotExists,
  resolveIncident,
} from "./autoIncident.service";

export async function healthSummary(
  req: RequestWithUser,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    /* =========================
       APIS
       ========================= */
    const apis = await prisma.api.findMany();
    const apis_offline = [];

    for (const api of apis) {
      const ruleId = `health:api:${api.id}`;

      if (api.status !== "online") {
        apis_offline.push({
          id: api.id,
          name: api.name,
          status: api.status,
          type: "API",
        });

        await openIncidentIfNotExists({
          ruleId,
          title: `API offline: ${api.name}`,
          description: `API ${api.name} estÃ¡ com status ${api.status}`,
          severity: "high",
        });
      } else {
        await resolveIncident(ruleId);
      }
    }

    /* =========================
       DATABASES
       ========================= */
    const databases = await prisma.database.findMany();
    const databases_offline = [];

    for (const db of databases) {
      const ruleId = `health:database:${db.id}`;

      if (db.status !== "online") {
        databases_offline.push({
          id: db.id,
          name: db.name,
          status: db.status,
          type: "DATABASE",
        });

        await openIncidentIfNotExists({
          ruleId,
          title: `Banco offline: ${db.name}`,
          description: `Banco ${db.name} estÃ¡ com status ${db.status}`,
          severity: "critical",
        });
      } else {
        await resolveIncident(ruleId);
      }
    }

    /* =========================
       CONTAINERS
       ========================= */
    const containers = await prisma.container.findMany();
    const containers_stopped = [];

    for (const c of containers) {
      const ruleId = `health:container:${c.id}`;

      if (c.status !== "running") {
        containers_stopped.push({
          id: c.id,
          name: c.name,
          status: c.status,
          type: "CONTAINER",
        });

        await openIncidentIfNotExists({
          ruleId,
          title: `Container parado: ${c.name}`,
          description: `Container ${c.name} estÃ¡ ${c.status}`,
          severity: "high",
        });
      } else {
        await resolveIncident(ruleId);
      }
    }

    /* =========================
       AUTOMATIONS
       ========================= */
    const automations = await prisma.agent.findMany();
    const automations_disabled = [];

    for (const a of automations) {
      const ruleId = `health:automation:${a.id}`;

      if (!a.active) {
        automations_disabled.push({
          id: a.id,
          name: a.name,
          status: "disabled",
          type: "AUTOMATION",
        });

        await openIncidentIfNotExists({
          ruleId,
          title: `AutomaÃ§Ã£o desativada: ${a.name}`,
          description: `AutomaÃ§Ã£o ${a.name} estÃ¡ desativada`,
          severity: "medium",
        });
      } else {
        await resolveIncident(ruleId);
      }
    }

    const total_issues =
      apis_offline.length +
      databases_offline.length +
      containers_stopped.length +
      automations_disabled.length;

    res.json({
      apis_offline,
      databases_offline,
      containers_stopped,
      automations_disabled,
      total_issues,
    });
  } catch (err) {
    console.error("healthSummary error", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

