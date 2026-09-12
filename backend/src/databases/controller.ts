import { Response } from "express";
import { RequestWithUser } from "@/types";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { testTcpConnection } from "@/utils/tcp";

const createDatabaseSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().positive(),
  database_name: z.string().min(1),
  description: z.string().optional(),
});

const updateDatabaseSchema = createDatabaseSchema.partial();

function validateDbHost(host: string): { valid: boolean; message?: string } {
  const h = String(host || "").trim();
  if (!h) return { valid: false, message: "Host Ã© obrigatÃ³rio" };
  if (h.includes("://")) return { valid: false, message: "Host invÃ¡lido (nÃ£o use http://, tcp://, etc.)" };
  if (h.includes("/") || h.includes("\\")) return { valid: false, message: "Host invÃ¡lido (nÃ£o use paths)" };
  if (/\s/.test(h)) return { valid: false, message: "Host invÃ¡lido (nÃ£o use espaÃ§os)" };
  if (/^\d+$/.test(h)) {
  return { valid: false, message: "Host invÃ¡lido: parece uma porta. Coloque o hostname/ip em host e a porta no campo port." };
}

  // âœ… EVITA ERRO COMUM: COLOCAR PORTA NO HOST (EX: "4444")
  if (/^\d+$/.test(h)) {
    return { valid: false, message: "Host invÃ¡lido: parece uma porta. Coloque o hostname/ip em host e a porta no campo port." };
  }

  return { valid: true };
}

async function assertDatabaseAccess(req: RequestWithUser, id: string) {
  const database = await prisma.database.findUnique({ where: { id } });
  if (!database) return { ok: false as const, status: 404, body: { error: "Banco de dados nÃ£o encontrado" } };

  if (!req.user) return { ok: false as const, status: 401, body: { error: "NÃ£o autorizado" } };

  if (req.user.role !== "ADMIN_MASTER" && database.owner_user_id !== req.user.sub) {
    return { ok: false as const, status: 403, body: { error: "Proibido" } };
  }

  return { ok: true as const, database };
}

export async function createDatabase(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const data = createDatabaseSchema.parse(req.body);

    const hv = validateDbHost(data.host);
    if (!hv.valid) {
      res.status(400).json({ error: hv.message });
      return;
    }

    const database = await prisma.database.create({
      data: { ...data, owner_user_id: req.user.sub },
    });

    res.status(201).json(database);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Create database error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function listDatabases(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const where = req.user.role === "ADMIN_MASTER" ? {} : { owner_user_id: req.user.sub };

    const databases = await prisma.database.findMany({
      where,
      orderBy: { created_at: "desc" },
    });

    res.json(databases);
  } catch (error) {
    console.error("List databases error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function getDatabase(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const access = await assertDatabaseAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }

    res.json(access.database);
  } catch (error) {
    console.error("Get database error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function updateDatabase(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const access = await assertDatabaseAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }

    const data = updateDatabaseSchema.parse(req.body);

    if (data.host) {
      const hv = validateDbHost(data.host);
      if (!hv.valid) {
        res.status(400).json({ error: hv.message });
        return;
      }
    }

    const updated = await prisma.database.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Update database error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function deleteDatabase(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const access = await assertDatabaseAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }

    await prisma.database.delete({ where: { id } });

    res.json({ message: "Database deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Banco de dados nÃ£o encontrado" });
      return;
    }
    console.error("Delete database error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function testDatabaseConnection(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const access = await assertDatabaseAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }

    const database = access.database;
    const now = new Date();

    const hv = validateDbHost(database.host);
    const port = Number(database.port);

    if (!hv.valid || !Number.isFinite(port) || port < 1 || port > 65535) {
      const error = hv.message || "Porta invÃ¡lida";

      await prisma.databaseHealthCheck.create({
        data: { database_id: database.id, ok: false, latency_ms: 0, error },
      });

      await prisma.database.update({
        where: { id: database.id },
        data: { last_check_at: now, is_healthy: false, error_message: error },
      });

      res.status(400).json({
        ok: false,
        latency_ms: 0,
        error,
        message: error,
        host: database.host,
        port,
        type: database.type,
      });
      return;
    }

    const timeoutMs = Number(req.query.timeoutMs || 3000);
    const timeoutSafe = Number.isFinite(timeoutMs)
      ? Math.min(Math.max(timeoutMs, 500), 15000)
      : 3000;

    const result = await testTcpConnection(database.host, port, timeoutSafe);

    await prisma.databaseHealthCheck.create({
      data: {
        database_id: database.id,
        ok: result.ok,
        latency_ms: result.latency_ms,
        error: result.ok ? null : result.error || "Falha de conexÃ£o",
      },
    });

    await prisma.database.update({
      where: { id: database.id },
      data: {
        last_check_at: now,
        is_healthy: result.ok,
        error_message: result.ok ? null : result.error || "Falha de conexÃ£o",
      },
    });

    if (result.ok) {
      res.json({
        ok: true,
        latency_ms: result.latency_ms,
        message: `ConexÃ£o OK (TCP) em ${result.latency_ms}ms`,
        host: database.host,
        port,
        type: database.type,
      });
      return;
    }

    res.status(502).json({
      ok: false,
      latency_ms: result.latency_ms,
      error: result.error || "Falha de conexÃ£o",
      message: `Falha ao conectar (TCP): ${result.error || "erro desconhecido"}`,
      host: database.host,
      port,
      type: database.type,
    });
  } catch (error) {
    console.error("Test database connection error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function listDatabaseHealth(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const access = await assertDatabaseAccess(req, id);
    if (!access.ok) {
      res.status(access.status).json(access.body);
      return;
    }

    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 500);

    const rows = await prisma.databaseHealthCheck.findMany({
      where: { database_id: id },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    res.json(rows);
  } catch (error) {
    console.error("List database health error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

