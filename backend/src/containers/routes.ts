import { Router } from "express";

import { authMiddleware } from "@/middleware/auth";

import {
  listContainers,
  getContainer,
  createContainer,
  updateContainer,
  deleteContainer,
  refreshContainer,
  restartContainer,
  getContainerLogs,
  getContainerHistory,
} from "./controller";

const containersRouter = Router();

containersRouter.use(authMiddleware);

// CRUD
containersRouter.get("/", listContainers);
containersRouter.post("/", createContainer);
containersRouter.get("/:id", getContainer);
containersRouter.patch("/:id", updateContainer);
containersRouter.delete("/:id", deleteContainer);

// COMPAT (ROTAS ANTIGAS)
containersRouter.post("/:id/refresh", refreshContainer);

// ACTIONS (NOVO PADRÃO)
containersRouter.post("/:id/actions/refresh", refreshContainer);
containersRouter.post("/:id/actions/restart", restartContainer);

// LOGS / HISTORY
containersRouter.get("/:id/logs", getContainerLogs);
containersRouter.get("/:id/history", getContainerHistory);

export default containersRouter;
