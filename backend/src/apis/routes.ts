import { Router } from "express";
import { createAPI, listAPIs, getAPI, getAPIHistory, revealAPIUrl, updateAPI, deleteAPI, testAPI } from "./controller";
import { authMiddleware } from "@/middleware/auth";

const apisRouter = Router();

apisRouter.use(authMiddleware);

apisRouter.post("/", createAPI);
apisRouter.get("/", listAPIs);
apisRouter.get("/:id", getAPI);
apisRouter.get("/:id/history", getAPIHistory);
apisRouter.get("/:id/reveal", revealAPIUrl);
apisRouter.patch("/:id", updateAPI);
apisRouter.delete("/:id", deleteAPI);

// ✅ TESTE (ATUALIZA STATUS/LATÊNCIA)
apisRouter.post("/:id/test", testAPI);

export default apisRouter;
