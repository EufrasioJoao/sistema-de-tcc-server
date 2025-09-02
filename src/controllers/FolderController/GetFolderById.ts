import { Request, Response } from "express";
import { db } from "../../lib/db";

export async function getFolderById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    const folder = await db.folder.findUnique({
      where: { id: id },
    });

    if (!folder) {
      res.status(404).json({ success: false, message: "Pasta não encontrada" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Pasta recuperada com sucesso",
      folder,
    });
  } catch (error: any) {
    console.error("Error in getfolderById:", error.message);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar pasta",
      error: error.message,
    });
  }
}
