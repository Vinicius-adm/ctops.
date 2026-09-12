import { Response } from "express";
import { RequestWithUser, AuthResponse } from "@/types";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { generateToken } from "@/utils/jwt";
import { isPrismaConnectionError } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ error: "Credenciais invÃ¡lidas" });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: "UsuÃ¡rio desabilitado" });
      return;
    }

    const validPassword = await bcryptjs.compare(password, user.password_hash);

    if (!validPassword) {
      res.status(401).json({ error: "Credenciais invÃ¡lidas" });
      return;
    }

    const token = generateToken(user.id, user.email, user.role);

    const response: AuthResponse = {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as "USER" | "ADMIN_MASTER",
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Login error:", error);
    if (isPrismaConnectionError(error)) {
      res.status(503).json({ error: "Banco de dados indisponÃ­vel", hint: "Verifique o Postgres (porta/host) e a DATABASE_URL do .env" });
      return;
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function register(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "E-mail jÃ¡ existe" });
      return;
    }

    const passwordHash = await bcryptjs.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
        role: "USER",
        is_active: true,
      },
    });

    // AUTO-LOGIN: RETORNA TOKEN + USER NO MESMO FORMATO DO /login
    const token = generateToken(user.id, user.email, user.role);

    const response: AuthResponse = {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as "USER" | "ADMIN_MASTER",
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Register error:", error);
    if (isPrismaConnectionError(error)) {
      res.status(503).json({ error: "Banco de dados indisponÃ­vel", hint: "Verifique o Postgres (porta/host) e a DATABASE_URL do .env" });
      return;
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function getMe(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
    });

    if (!user || !user.is_active) {
      res.status(404).json({ error: "UsuÃ¡rio nÃ£o encontrado" });
      return;
    }

    const response = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.json(response);
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function changePassword(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { current_password, new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
    });

    if (!user) {
      res.status(404).json({ error: "UsuÃ¡rio nÃ£o encontrado" });
      return;
    }

    const validPassword = await bcryptjs.compare(current_password, user.password_hash);

    if (!validPassword) {
      res.status(400).json({ error: "Senha atual incorreta" });
      return;
    }

    const passwordHash = await bcryptjs.hash(new_password, 10);

    await prisma.user.update({
      where: { id: req.user.sub },
      data: { password_hash: passwordHash },
    });

    res.json({ message: "Senha alterada com sucesso" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function uploadAvatar(req: RequestWithUser, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "Nenhum arquivo enviado" });
      return;
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    await prisma.user.update({
      where: { id: req.user.sub },
      data: { avatar_url: avatarUrl },
    });

    res.json({
      message: "Avatar atualizado com sucesso",
      avatar_url: avatarUrl,
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function logout(req: RequestWithUser, res: Response): Promise<void> {
  res.json({ message: "Logout realizado com sucesso" });
}

