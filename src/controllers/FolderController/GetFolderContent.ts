import { Request, Response } from "express";
import { db } from "../../lib/db";

export async function getFolderContent(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    const folder = await db.folder.findUnique({
      where: { id: id },
      include: {
        folders: {
          orderBy: {
            name: "asc",
          },
        },
        files: {
          orderBy: {
            filename: "asc",
          },
        },
      },
    });

    if (!folder) {
      res.status(404).json({ success: false, message: "Pasta não encontrada" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Conteúdo da pasta recuperado com sucesso",
      folder,
    });
  } catch (error: any) {
    console.error("Error in getFolderContent:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching folder",
      error: error.message,
    });
  }
}
