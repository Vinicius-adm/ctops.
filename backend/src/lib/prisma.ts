import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    // EVITA SPAM "prisma:error" NO CONSOLE EM ERROS TRANSIENTES (DB RESTART / CONEXÃO CAIU).
    // OS ERROS IMPORTANTES AINDA SOBEM VIA try/catch NOS CONTROLLERS.
    log: process.env.NODE_ENV === "development" ? ["warn"] : [],
  });

if (process.env.NODE_ENV !== "production") global.__prisma = prisma;
