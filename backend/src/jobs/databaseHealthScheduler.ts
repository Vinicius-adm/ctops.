import cron, { ScheduledTask } from "node-cron";
import { prisma } from "@/lib/prisma";
import { ensureDbConnection } from "@/lib/db";
import { testTcpConnection } from "@/utils/tcp";

let task: ScheduledTask | null = null;
let isRunning = false;

function validateDbHost(host: string): { valid: boolean; message?: string } {
  const h = String(host || "").trim();

  if (!h) return { valid: false, message: "Host é obrigatório" };
  if (h.includes("://")) return { valid: false, message: "Host inválido (não use http://, tcp:// etc.)" };
  if (h.includes("/") || h.includes("\\")) return { valid: false, message: "Host inválido (não use paths)" };
  if (/\s/.test(h)) return { valid: false, message: "Host inválido (não use espaços)" };

  // ✅ EVITA ERRO COMUM: COLOCAR PORTA NO HOST (EX: "4444")
  if (/^\d+$/.test(h)) {
    return { valid: false, message: "Host inválido: parece uma porta. Coloque o hostname/ip em host e a porta no campo port." };
  }

  return { valid: true };
}


async function safeMarkDown(databaseId: string, error: string) {
  const now = new Date();

  try {
    await prisma.databaseHealthCheck.create({
      data: { database_id: databaseId, ok: false, latency_ms: 0, error },
    });

    await prisma.database.update({
      where: { id: databaseId },
      data: { last_check_at: now, is_healthy: false, error_message: error },
    });
  } catch (e) {
    console.error("[DB SCHEDULER] Failed to write health status:", e);
  }
}

async function testOneDatabase(databaseId: string) {
  const db = await prisma.database.findUnique({ where: { id: databaseId } });
  if (!db) return;

  const now = new Date();

  const hostCheck = validateDbHost(db.host);
  const port = Number(db.port);

  if (!hostCheck.valid || !Number.isFinite(port) || port < 1 || port > 65535) {
    const error = hostCheck.message || "Porta inválida";
    await safeMarkDown(db.id, error);
    return;
  }

  const result = await testTcpConnection(db.host, port, 3000);

  try {
    await prisma.databaseHealthCheck.create({
      data: {
        database_id: db.id,
        ok: result.ok,
        latency_ms: result.latency_ms,
        error: result.ok ? null : result.error || "Falha de conexão",
      },
    });

    await prisma.database.update({
      where: { id: db.id },
      data: {
        last_check_at: now,
        is_healthy: result.ok,
        error_message: result.ok ? null : result.error || "Falha de conexão",
      },
    });
  } catch (e) {
    console.error("[DB SCHEDULER] Failed to persist result:", e);
  }
}

async function runAllDatabasesOnce() {
  if (isRunning) return; // EVITA OVERLAP
  isRunning = true;

  try {
    const ok = await ensureDbConnection({ retries: 1, initialDelayMs: 0, logPrefix: "[DB HEALTH]" });
    if (!ok) return;

    const databases = await prisma.database.findMany({
      select: { id: true },
      orderBy: { created_at: "desc" },
    });

    for (const d of databases) {
      try {
        await testOneDatabase(d.id);
      } catch (err: any) {
        const error = err?.message || "Erro inesperado no scheduler";
        await safeMarkDown(d.id, error);
      }
    }
  } finally {
    isRunning = false;
  }
}

/**
 * CRON: minuto 0 de toda hora = 0 * * * *
 */
export function startDatabaseHealthScheduler() {
  // EVITA DUPLICAR TASK EM HOT-RELOAD
  if (task) return;

  // RODA UMA VEZ NA INICIALIZAÇÃO (PRA JÁ POPULAR)
  runAllDatabasesOnce().catch(() => {});

  task = cron.schedule("0 * * * *", async () => {
    await runAllDatabasesOnce();
  });

  task.start();
}

/** ENCERRAMENTO LIMPO */
export async function shutdownDatabaseHealthScheduler() {
  try {
    if (task) {
      task.stop();
      task = null;
    }
  } catch (e) {
    console.error("[DB SCHEDULER] Error stopping task:", e);
  }

  try {
    await prisma.$disconnect();
  } catch (e) {
    console.error("[DB SCHEDULER] Error disconnecting prisma:", e);
  }
}
