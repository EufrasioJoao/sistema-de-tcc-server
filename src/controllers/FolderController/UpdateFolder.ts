import { Request, Response } from "express";
import { db } from "../../lib/db";
import { z } from "zod";

const folderSchema = z.object({
  name: z.string().min(1, "O nome da pasta é obrigatório"),
});

export async function updateFolder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name } = folderSchema.partial().parse(req.body);

    const folder = await db.folder.findUnique({ where: { id } });

    if (!folder) {
      res.status(404).json({
        success: false,
        message: "Pasta não encontrada",
      });
      return;
    }

    const updatedPath = async () => {
      if (folder.parent_folder_id) {
        let currentFolder = await db.folder.findUnique({
          where: { id: folder.parent_folder_id },
        });

        if (!currentFolder) throw new Error("Folder not found");

        let currentPath: string = `${currentFolder.name}/${name}`;

        while (currentFolder?.parent_folder_id) {
          currentFolder = await db.folder.findUnique({
            where: { id: currentFolder.parent_folder_id },
          });

          if (!currentFolder) throw new Error("Parent folder not found");

          currentPath = `${currentFolder.name}/${currentPath}`;
        }

        return currentPath;
      } else {
        return name;
      }
    };

    const folderUpdatedPath = await updatedPath();
    const updatedFolder = await db.folder.update({
      where: { id },
      data: {
        name: name,
        path: folderUpdatedPath,
      },
    });

    res.status(200).json({
      success: true,
      message: "Pasta atualizada com sucesso",
      folder: updatedFolder,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar pasta",
      error: error instanceof z.ZodError ? error.errors : error.message,
    });
  }
}
