import { Request, Response } from "express";
import { db } from "../../lib/db";
import { z } from "zod";

export async function deactivateUser(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = z.coerce.string().parse(req.params.userId);

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado!",
      });
      return;
    }

    const deactivatedUser = await db.user.update({
      where: { id: userId },
      data: {
        is_active: false,
      },
    });

    res.status(200).json({
      success: true,
      message: "Usuário desativado com sucesso",
      deactivatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar usuário",
      error: error.message,
    });
  }
}
