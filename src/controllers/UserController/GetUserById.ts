import { Response } from "express";
import { db } from "../../lib/db";
import { AuthRequest } from "../../middlewares/authMiddleware";

export async function getUserById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    const user = await db.user.findUnique({ 
      where: { id },
      include: {
        organization: {
          select: {
            name: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Usuário recuperado com sucesso",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao buscar usuário",
      error,
    });
  }
}
