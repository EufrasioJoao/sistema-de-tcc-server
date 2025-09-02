import { Request, Response } from "express";
import { db } from "../../lib/db";

export async function deleteFolder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const folder = await db.folder.findUnique({ where: { id } });

    if (!folder) {
      res.status(404).json({
        success: false,
        message: "Pasta não encontrada",
      });
      return;
    }

    await db.folder.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Pasta deletada com sucesso",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao deletar pasta",
      error: error.message,
    });
  }
}
