import { Response } from "express";
import { db } from "../../lib/db";
import { z } from "zod";
import { AuthRequest } from "../../middlewares/authMiddleware";

export async function searchUser(req: AuthRequest, res: Response): Promise<void> {
  const querySchema = z.object({
    query: z.string().min(1, "A busca não pode ser vazia."),
  });

  try {
    const { query } = querySchema.parse(req.query);
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(403).json({ success: false, message: "Não autorizado" });
      return;
    }

    const users = await db.user.findMany({
      where: {
        OR: [
          { first_name: { contains: query } },
          { last_name: { contains: query } },
          { email: { contains: query } },
        ],
      },
    });

    if (users.length === 0) {
      res.status(404).json({ success: false, message: "Nenhum usuário encontrado" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Usuários encontrados com sucesso",
      users,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: "Busca inválida.", errors: error.errors });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Erro ao buscar usuários",
      error,
    });
  }
}
