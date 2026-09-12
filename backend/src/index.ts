import express from 'express';
import "dotenv/config";
import cors from 'cors';
import helmet from 'helmet';
import authRouter from '@/auth/routes';
import usersRouter from '@/users/routes';
import jobsRouter from '@/jobs/routes';
import apisRouter from '@/apis/routes';
import databasesRouter from '@/databases/routes';
import agentsRouter from '@/agents/routes';
import alertsRouter from '@/alerts/routes';
import incidentsRouter from '@/incidents/routes';
import containersRouter from '@/containers/routes';
import dashboardRouter from '@/dashboard/routes';
import { startDatabaseHealthScheduler } from '@/jobs/databaseHealthScheduler';
import { startApiHealthScheduler } from '@/jobs/apiHealthScheduler';
import { ensureDbConnection } from '@/lib/db';
import { RequestWithUser } from '@/types';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/jobs', jobsRouter);
app.use('/apis', apisRouter);
app.use('/databases', databasesRouter);
app.use('/agents', agentsRouter);
app.use('/alerts', alertsRouter);
app.use('/incidents', incidentsRouter);
app.use('/containers', containersRouter);
app.use('/dashboard', dashboardRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message
  });
});

app.listen(PORT, () => {

  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📝 Frontend URL: ${FRONTEND_URL}`);
  // ✅ SCHEDULERS (SÓ INICIA QUANDO O POSTGRES ESTIVER ACESSÍVEL)
  (async () => {
    const ok = await ensureDbConnection({ retries: 10, initialDelayMs: 400, logPrefix: "[PRISMA]" });
    if (!ok) {
      console.error("⚠️ Postgres indisponível. Schedulers NÃO foram iniciados (API ainda sobe, mas endpoints que usam DB vão falhar). Verifique o container/porta do Postgres e a DATABASE_URL do .env.");
      return;
    }

    startDatabaseHealthScheduler();
    startApiHealthScheduler();
  })().catch((e) => console.error("Scheduler bootstrap error:", e));

});

export default app;
