import { Router } from 'express';
import { createUser, listUsers, disableUser, resetUserPassword } from './controller';
import { authMiddleware, requireAdmin } from '@/middleware/auth';

const usersRouter = Router();

usersRouter.use(authMiddleware);
usersRouter.use(requireAdmin);

usersRouter.post('/', createUser);
usersRouter.get('/', listUsers);
usersRouter.patch('/:id/disable', disableUser);
usersRouter.patch('/:id/reset-password', resetUserPassword);

export default usersRouter;
