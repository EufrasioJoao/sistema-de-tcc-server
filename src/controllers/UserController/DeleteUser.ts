import { Response } from "express";
import { db } from "../../lib/db";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { z } from "zod";

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const idSchema = z.object({
    id: z.string().uuid("ID de usuário inválido"),
  });

  try {
    const { id } = idSchema.parse(req.params);
    const requestingUser = req.user;

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: "Não autorizado" });
      return;
    }

    if (requestingUser.id === id) {
        res.status(403).json({
            success: false,
            message: "Não é possível excluir a si mesmo.",
        });
        return;
    }

    const userToDelete = await db.user.findUnique({
      where: { id },
    });

    if (!userToDelete) {
      res.status(404).json({ success: false, message: "Usuário não encontrado" });
      return;
    }

    if (userToDelete.role === 'ADMIN') {
      res.status(403).json({
        success: false,
        message: "Não é possível excluir um usuário administrador.",
      });
      return;
    }

    await db.user.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Usuário excluído com sucesso",
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: "Dados de entrada inválidos.", errors: error.errors });
        return;
    }
    res.status(500).json({
      success: false,
      message: "Erro ao excluir o usuário",
      error,
    });
  }
}
