import { Router } from 'express';
import {
  createIncident,
  listIncidents,
  getIncident,
  updateIncident,
  deleteIncident
} from './controller';
import { authMiddleware } from '@/middleware/auth';

const incidentsRouter = Router();

incidentsRouter.use(authMiddleware);

incidentsRouter.post('/', createIncident);
incidentsRouter.get('/', listIncidents);
incidentsRouter.get('/:id', getIncident);
incidentsRouter.patch('/:id', updateIncident);
incidentsRouter.delete('/:id', deleteIncident);

export default incidentsRouter;
