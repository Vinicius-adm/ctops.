import { Response } from "express";
import { RequestWithUser } from "@/types";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createJobSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  schedule: z.string().optional(),
  status: z.enum(["active", "inactive", "paused"]).optional().default("active"),
});

const updateJobSchema = createJobSchema.partial();

export async function createJob(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const data = createJobSchema.parse(req.body);

    const job = await prisma.job.create({
      data: {
        ...data,
        owner_user_id: req.user.sub,
      },
    });

    res.status(201).json(job);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Create job error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function listJobs(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const query = req.user.role === "ADMIN_MASTER" ? {} : { owner_user_id: req.user.sub };

    const jobs = await prisma.job.findMany({
      where: query,
      orderBy: { created_at: "desc" },
    });

    res.json(jobs);
  } catch (error) {
    console.error("List jobs error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function getJob(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: { events: { orderBy: { created_at: "desc" } } },
    });

    if (!job) {
      res.status(404).json({ error: "Tarefa nÃ£o encontrada" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && job.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    res.json(job);
  } catch (error) {
    console.error("Get job error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function updateJob(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;
    const data = updateJobSchema.parse(req.body);

    const job = await prisma.job.findUnique({ where: { id } });

    if (!job) {
      res.status(404).json({ error: "Tarefa nÃ£o encontrada" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && job.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    const updated = await prisma.job.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Update job error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function deleteJob(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const job = await prisma.job.findUnique({ where: { id } });

    if (!job) {
      res.status(404).json({ error: "Tarefa nÃ£o encontrada" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && job.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    await prisma.job.delete({ where: { id } });

    res.json({ message: "Job deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Tarefa nÃ£o encontrada" });
      return;
    }
    console.error("Delete job error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function getJobEvents(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const job = await prisma.job.findUnique({ where: { id } });

    if (!job) {
      res.status(404).json({ error: "Tarefa nÃ£o encontrada" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && job.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    const events = await prisma.jobEvent.findMany({
      where: { job_id: id },
      orderBy: { created_at: "desc" },
    });

    res.json(events);
  } catch (error) {
    console.error("Get job events error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

