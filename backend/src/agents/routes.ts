import { Router } from 'express';
import {
  createAgent,
  listAgents,
  getAgent,
  updateAgent,
  deleteAgent
} from './controller';
import { authMiddleware } from '@/middleware/auth';

const agentsRouter = Router();

agentsRouter.use(authMiddleware);

agentsRouter.post('/', createAgent);
agentsRouter.get('/', listAgents);
agentsRouter.get('/:id', getAgent);
agentsRouter.patch('/:id', updateAgent);
agentsRouter.delete('/:id', deleteAgent);

export default agentsRouter;
