import { RequestHandler, Request, Response, NextFunction } from "express";
import { RequestWithUser } from "@/types";
import { extractTokenFromHeader, verifyToken } from "@/utils/jwt";

export const authMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    res.status(401).json({ error: "Não autorizado - Nenhum token fornecido" });
    return;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: "Não autorizado - Token inválido" });
    return;
  }

  (req as RequestWithUser).user = decoded;
  next();
};

export const requireAdmin: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const r = req as RequestWithUser;

  if (!r.user) {
    res.status(401).json({ error: "NÃ£o autorizado" });
    return;
  }

  if (r.user.role !== "ADMIN_MASTER") {
    res.status(403).json({ error: "Proibido - Acesso de administrador necessário" });
    return;
  }

  next();
};

export function requireOwnerOrAdmin(resourceOwnerId: string | undefined) {
  const handler: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const r = req as RequestWithUser;

    if (!r.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    if (r.user.role !== "ADMIN_MASTER" && r.user.sub !== resourceOwnerId) {
      res.status(403).json({ error: "Proibido - Acesso negado" });
      return;
    }

    next();
  };

  return handler;
}

