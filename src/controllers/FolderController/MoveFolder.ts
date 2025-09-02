import { AuthRequest } from "../../middlewares/authMiddleware";
import { db } from "../../lib/db";
import { Response } from "express";

export async function moveFolder(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { new_parent_folder_id } = req.body;

    const folderToMove = await db.folder.findUnique({ where: { id } });

    if (!folderToMove) {
      res.status(404).json({
        success: false,
        message: "Pasta não encontrada",
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

    const user = await db.user.findUnique({
      where: { id: user_id },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Operador não encontrado",
      });
      return;
    }

    const newParentFolder = new_parent_folder_id
      ? await db.folder.findUnique({ where: { id: new_parent_folder_id } })
      : null;

    if (new_parent_folder_id && !newParentFolder) {
      res.status(404).json({
        success: false,
        message: "Pasta de destino não encontrada",
      });
      return;
    }

    const updatedPath = async () => {
      if (newParentFolder) {
        let currentPath = `${newParentFolder.name}/${folderToMove.name}`;
        let currentFolder = newParentFolder as unknown as any;

        while (currentFolder?.parent_folder_id) {
          currentFolder = await db.folder.findUnique({
            where: { id: currentFolder.parent_folder_id },
          });

          if (!currentFolder) throw new Error("Parent folder not found");

          currentPath = `${currentFolder.name}/${currentPath}`;
        }

        return currentPath;
      } else {
        return folderToMove.name;
      }
    };

    const folderUpdatedPath = await updatedPath();

    const updatedFolder = await db.folder.update({
      where: { id },
      data: {
        parent_folder_id: new_parent_folder_id,
        path: folderUpdatedPath,
      },
    });

    await db.accessHistory.create({
      data: {
        folder_id: id,
        accessed_at: new Date(),
        action_performed: "MOVE_FOLDER",
        accessed_by: user_id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Pasta movida com sucesso",
      folder: updatedFolder,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao mover pasta",
      error: error.message,
    });
  }
}
