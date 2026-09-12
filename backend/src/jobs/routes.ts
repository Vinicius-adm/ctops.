import { Router } from 'express';
import {
  createJob,
  listJobs,
  getJob,
  updateJob,
  deleteJob,
  getJobEvents
} from './controller';
import { authMiddleware } from '@/middleware/auth';

const jobsRouter = Router();

jobsRouter.use(authMiddleware);

jobsRouter.post('/', createJob);
jobsRouter.get('/', listJobs);
jobsRouter.get('/:id', getJob);
jobsRouter.patch('/:id', updateJob);
jobsRouter.delete('/:id', deleteJob);
jobsRouter.get('/:id/events', getJobEvents);

export default jobsRouter;
