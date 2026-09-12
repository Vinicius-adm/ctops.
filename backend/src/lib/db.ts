import { prisma } from "@/lib/prisma";

/**
 * TENTA CONECTAR NO BANCO E RETORNA TRUE/FALSE.
 * - ÚTIL PARA EVITAR QUE JOBS/SCHEDULERS ENTREM EM LOOP DE ERRO QUANDO O POSTGRES ESTÁ OFFLINE.
 * - NÃO LANÇA EXCEÇÃO PARA O CHAMADOR POR PADRÃO (APENAS RETORNA FALSE).
 */
export async function ensureDbConnection(opts?: {
  retries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  logPrefix?: string;
}): Promise<boolean> {
  const retries = opts?.retries ?? 5;
  const initialDelayMs = opts?.initialDelayMs ?? 300;
  const maxDelayMs = opts?.maxDelayMs ?? 5000;
  const prefix = opts?.logPrefix ?? "[DB]";

  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await prisma.$connect();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      // LOGA SOMENTE O ESSENCIAL
      console.error(`${prefix} Não foi possível conectar no Postgres (tentativa ${attempt}/${retries}).`, {
        message: msg,
      });

      if (attempt >= retries) return false;

      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(Math.floor(delay * 1.8), maxDelayMs);
    }
  }

  return false;
}

/**
 * IDENTIFICA ERROS DE CONEXÃO DO PRISMA PARA RESPOSTAS HTTP MAIS ADEQUADAS.
 */
export function isPrismaConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("P1001") ||
    msg.includes("Can't reach database server") ||
    msg.includes("PrismaClientInitializationError")
  );
}
