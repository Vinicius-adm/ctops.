import { Router } from 'express';
import {
  createAlertRule,
  listAlertRules,
  getAlertRule,
  updateAlertRule,
  deleteAlertRule
} from './controller';
import { authMiddleware } from '@/middleware/auth';

const alertsRouter = Router();

alertsRouter.use(authMiddleware);

alertsRouter.post('/', createAlertRule);
alertsRouter.get('/', listAlertRules);
alertsRouter.get('/:id', getAlertRule);
alertsRouter.patch('/:id', updateAlertRule);
alertsRouter.delete('/:id', deleteAlertRule);

export default alertsRouter;
