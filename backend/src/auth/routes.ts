import { Router } from "express";
import { login, register, getMe, logout, changePassword, uploadAvatar } from "./controller";
import { authMiddleware } from "@/middleware/auth";
import { upload } from "@/utils/upload";

const authRouter = Router();

// PUBLIC
authRouter.post("/register", register);
authRouter.post("/login", login);

// PRIVATE
authRouter.get("/me", authMiddleware, getMe);
authRouter.post("/logout", authMiddleware, logout);
authRouter.patch("/change-password", authMiddleware, changePassword);
authRouter.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);

export default authRouter;
