import { Router } from "express";
import { authMiddleware } from "@/middleware/auth";
import { getDashboardSummary } from "./controller";

const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);

dashboardRouter.get("/summary", getDashboardSummary);

export default dashboardRouter;
