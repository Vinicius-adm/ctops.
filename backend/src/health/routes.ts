import { Router } from "express";
import { healthSummary } from "./controller";
import { authMiddleware } from "@/middleware/auth";

const router = Router();

router.get("/summary", authMiddleware, healthSummary);

export default router;
