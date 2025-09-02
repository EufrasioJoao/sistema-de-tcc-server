import { Response } from "express";
import { db } from "../../lib/db";
import { AuthRequest } from "../../middlewares/authMiddleware";

export const moveFile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { new_folder_id } = req.body;

    const fileToMove = await db.file.findUnique({ where: { id } });

    if (!fileToMove) {
      res.status(404).json({
        success: false,
        message: "Arquivo não encontrado",
      });
      return;
    }

    const user_id = req.user?.id;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "Não autorizado: ID do usuário não encontrado",
      });
      return;
    }

    const newParentFolder = new_folder_id
      ? await db.folder.findUnique({ where: { id: new_folder_id } })
      : null;

    if (new_folder_id && !newParentFolder) {
      res.status(404).json({
        success: false,
        message: "Pasta de destino não encontrada",
      });
      return;
    }

    const updatedPath = newParentFolder
      ? `${newParentFolder.path}/${fileToMove.filename}`
      : fileToMove.filename;

    const updatedFile = await db.file.update({
      where: { id },
      data: {
        folder_id: new_folder_id,
        path: updatedPath,
      },
    });

    await db.accessHistory.create({
      data: {
        accessed_at: new Date(),
        action_performed: "MOVE_FILE",
        accessed_by: user_id,
        file_id: fileToMove.id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Arquivo movido com sucesso",
      file: updatedFile,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao mover arquivo",
      error: error.message,
    });
  }
};
