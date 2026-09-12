import { Response } from "express";
import { RequestWithUser } from "@/types";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  endpoint: z.string().url().optional(),
});

const updateAgentSchema = createAgentSchema.partial();

export async function createAgent(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const data = createAgentSchema.parse(req.body);

    const agent = await prisma.agent.create({
      data: {
        ...data,
        owner_user_id: req.user.sub,
      },
    });

    res.status(201).json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Create agent error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function listAgents(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const query = req.user.role === "ADMIN_MASTER" ? {} : { owner_user_id: req.user.sub };

    const agents = await prisma.agent.findMany({
      where: query,
      orderBy: { created_at: "desc" },
    });

    res.json(agents);
  } catch (error) {
    console.error("List agents error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function getAgent(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && agent.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    res.json(agent);
  } catch (error) {
    console.error("Get agent error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function updateAgent(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;
    const data = updateAgentSchema.parse(req.body);

    const agent = await prisma.agent.findUnique({ where: { id } });

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && agent.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    const updated = await prisma.agent.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Update agent error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function deleteAgent(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const agent = await prisma.agent.findUnique({ where: { id } });

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && agent.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    await prisma.agent.delete({ where: { id } });

    res.json({ message: "Agent deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    console.error("Delete agent error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

