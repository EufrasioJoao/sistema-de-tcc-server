import { z } from "zod";
import { Request, Response } from "express";
import { db } from "../../lib/db";

const folderSchema = z.object({
  name: z.string().min(1, "O nome da pasta é obrigatório"),
  parent_folder_id: z.string().optional(),
  organization_id: z.coerce.string().min(1, "O ID da organização é obrigatório"),
  user_id: z.coerce.string().min(1, "O ID do usuário é obrigatório"),
});

export async function createFolder(req: Request, res: Response): Promise<void> {
  try {
    const { name, parent_folder_id, organization_id, user_id } =
      folderSchema.parse(req.body);

    // Check if the user exists
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

    // Check if a folder with the same name already exists in the target location
    const existingFolder = await db.folder.findFirst({
      where: { name, parent_folder_id, organization_id: organization_id },
    });

    if (existingFolder) {
      res.status(400).json({
        success: false,
        message: "A pasta já existe!",
      });
      return;
    }

    const path = async () => {
      // If the folder has a parent, build the path recursively
      if (parent_folder_id) {
        let currentFolder = await db.folder.findUnique({
          where: { id: parent_folder_id },
        });

        if (!currentFolder) throw new Error("Pasta não encontrada!");

        let currentPath: string = `${currentFolder.name}/${name}`;

        while (currentFolder?.parent_folder_id) {
          currentFolder = await db.folder.findUnique({
            where: { id: currentFolder.parent_folder_id },
          });

          if (!currentFolder) throw new Error("Pasta não encontrada");

          currentPath = `${currentFolder.name}/${currentPath}`;
        }

        return currentPath;
      } else {
        return name;
      }
    };

    const folderPath = await path();

    const folder = await db.folder.create({
      data: {
        name: name,
        path: folderPath,
        parent_folder_id: parent_folder_id,
        organization_id: organization_id,
      },
    });

    // Log access history
    await db.accessHistory.create({
      data: {
        folder_id: folder.id,
        accessed_at: new Date(),
        action_performed: "CREATE_FOLDER",
        accessed_by: user_id,
      },
    });

    res.status(201).json({
      success: true,
      message: "Pasta criada com sucesso",
      folder,
    });
  } catch (error) {
    console.error("Error in createFolder:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar pasta",
      error:
        error instanceof Error
          ? { message: error.message }
          : { message: "An unknown error occurred" },
    });
  }
}
