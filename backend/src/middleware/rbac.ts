import { Response, NextFunction } from 'express';
import { RequestWithUser } from '@/types';

export function filterByOwnership(query: any, req: RequestWithUser) {
  if (!req.user) {
    throw new Error('Usuário não autenticado');
  }

  if (req.user.role === 'ADMIN_MASTER') {
    return query;
  }

  return query.where({ owner_user_id: req.user.sub });
}

export function ensureOwnershipOrAdmin(
  resourceOwnerId: string | undefined,
  userRole: string,
  userId: string
): boolean {
  return userRole === 'ADMIN_MASTER' || userId === resourceOwnerId;
}

export function validateResourceOwnership(
  resourceOwnerId: string | undefined
) {
  return (req: RequestWithUser, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    if (
      req.user.role !== 'ADMIN_MASTER' &&
      req.user.sub !== resourceOwnerId
    ) {
      res.status(403).json({ error: 'Proibido' });
      return;
    }

    next();
  };
}
