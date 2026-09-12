import { Router } from "express";
import {
  createDatabase,
  listDatabases,
  getDatabase,
  updateDatabase,
  deleteDatabase,
  testDatabaseConnection,
  listDatabaseHealth,
} from "./controller";
import { authMiddleware } from "@/middleware/auth";

const databasesRouter = Router();

databasesRouter.use(authMiddleware);

databasesRouter.post("/", createDatabase);
databasesRouter.get("/", listDatabases);
databasesRouter.get("/:id", getDatabase);
databasesRouter.patch("/:id", updateDatabase);
databasesRouter.delete("/:id", deleteDatabase);

databasesRouter.post("/:id/test", testDatabaseConnection);
databasesRouter.get("/:id/health", listDatabaseHealth);

export default databasesRouter;
