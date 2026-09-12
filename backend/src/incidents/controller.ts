import { Response } from "express";
import { RequestWithUser } from "@/types";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createIncidentSchema = z.object({
  rule_id: z.string().optional(),
  severity: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

const updateIncidentSchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved"]).optional(),
  severity: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

export async function createIncident(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const data = createIncidentSchema.parse(req.body);

    const incident = await prisma.incident.create({
      data,
    });

    res.status(201).json(incident);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Create incident error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function listIncidents(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const incidents = await prisma.incident.findMany({
      orderBy: { created_at: "desc" },
    });

    res.json(incidents);
  } catch (error) {
    console.error("List incidents error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function getIncident(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const incident = await prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      res.status(404).json({ error: "Incidente nÃ£o encontrado" });
      return;
    }

    res.json(incident);
  } catch (error) {
    console.error("Get incident error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function updateIncident(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;
    const data = updateIncidentSchema.parse(req.body);

    const incident = await prisma.incident.findUnique({ where: { id } });

    if (!incident) {
      res.status(404).json({ error: "Incidente nÃ£o encontrado" });
      return;
    }

    const updateData: any = { ...data };
    if (data.status === "resolved") {
      updateData.resolved_at = new Date();
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Update incident error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function deleteIncident(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const incident = await prisma.incident.findUnique({ where: { id } });

    if (!incident) {
      res.status(404).json({ error: "Incidente nÃ£o encontrado" });
      return;
    }

    await prisma.incident.delete({ where: { id } });

    res.json({ message: "Incident deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Incidente nÃ£o encontrado" });
      return;
    }
    console.error("Delete incident error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

