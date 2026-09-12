import { Response } from "express";
import { RequestWithUser } from "@/types";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(["USER", "ADMIN_MASTER"]).optional().default("USER"),
});

export async function createUser(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { email, name, password, role } = createUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: "E-mail jÃ¡ existe" });
      return;
    }

    const passwordHash = await bcryptjs.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password_hash: passwordHash,
        role,
        is_active: true,
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Create user error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function listUsers(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function disableUser(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { is_active: false },
    });

    res.json({
      message: "User disabled successfully",
      user: {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "UsuÃ¡rio nÃ£o encontrado" });
      return;
    }
    console.error("Disable user error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function resetUserPassword(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      return;
    }

    const passwordHash = await bcryptjs.hash(new_password, 10);

    const user = await prisma.user.update({
      where: { id },
      data: { password_hash: passwordHash },
    });

    res.json({
      message: "Password reset successfully",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "UsuÃ¡rio nÃ£o encontrado" });
      return;
    }
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

