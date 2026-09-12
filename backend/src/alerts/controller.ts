import { Response } from "express";
import { RequestWithUser } from "@/types";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createAlertRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  condition: z.string().min(1),
  enabled: z.boolean().optional().default(true),
  notification_channels: z.string().optional(),
});

const updateAlertRuleSchema = createAlertRuleSchema.partial();

export async function createAlertRule(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const data = createAlertRuleSchema.parse(req.body);

    const rule = await prisma.alertRule.create({
      data: {
        ...data,
        owner_user_id: req.user.sub,
      },
    });

    res.status(201).json(rule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Create alert rule error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function listAlertRules(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const query = req.user.role === "ADMIN_MASTER" ? {} : { owner_user_id: req.user.sub };

    const rules = await prisma.alertRule.findMany({
      where: query,
      orderBy: { created_at: "desc" },
    });

    res.json(rules);
  } catch (error) {
    console.error("List alert rules error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function getAlertRule(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const rule = await prisma.alertRule.findUnique({
      where: { id },
    });

    if (!rule) {
      res.status(404).json({ error: "Alert rule not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && rule.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    res.json(rule);
  } catch (error) {
    console.error("Get alert rule error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function updateAlertRule(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;
    const data = updateAlertRuleSchema.parse(req.body);

    const rule = await prisma.alertRule.findUnique({ where: { id } });

    if (!rule) {
      res.status(404).json({ error: "Alert rule not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && rule.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    const updated = await prisma.alertRule.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Update alert rule error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function deleteAlertRule(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const rule = await prisma.alertRule.findUnique({ where: { id } });

    if (!rule) {
      res.status(404).json({ error: "Alert rule not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && rule.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    await prisma.alertRule.delete({ where: { id } });

    res.json({ message: "Alert rule deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Alert rule not found" });
      return;
    }
    console.error("Delete alert rule error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

