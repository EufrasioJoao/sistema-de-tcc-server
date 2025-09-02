import { Request, Response } from "express";
import { db } from "../../lib/db";
import z from "zod";

export async function getorganizationFolders(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const idSchema = z.coerce.string();
    const organizationId = idSchema.parse(req.params.organizationId);

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      res
        .status(404)
        .json({ success: false, message: "Entidade não encontrada" });
      return;
    }

    // Define the folder structure interface
    interface FolderWithSubfolders {
      id: string;
      name: string;
      path?: string | null;
      parent_folder_id?: string | null;
      organization_id: number;
      created_at: Date;
      updated_at: Date;
      hasFiles: boolean;
      hasSubfolders: boolean;
      subfolders: FolderWithSubfolders[];
    }

    // Recursive function to build folder structure
    async function buildFolderTree(
      parentFolderId: string | null
    ): Promise<FolderWithSubfolders[]> {
      const folders = await db.folder.findMany({
        where: {
          parent_folder_id: parentFolderId,
          organization_id: organizationId,
        },
        orderBy: {
          name: "asc",
        },
      });

      // @ts-ignore
      return await Promise.all(
        folders.map(async (folder) => {
          // Check if folder has subfolders
          const subfoldersCount = await db.folder.count({
            where: { parent_folder_id: folder.id },
          });

          // Check if folder has files
          const filesCount = await db.file.count({
            where: { folder_id: folder.id },
            orderBy: {
              filename: "asc",
            },
          });

          return {
            ...folder,
            hasFiles: filesCount > 0,
            hasSubfolders: subfoldersCount > 0,
            subfolders: await buildFolderTree(folder.id), // Recursively build subfolders
          };
        })
      );
    }

    // Build the folder tree starting from the root
    const folderTree = await buildFolderTree(null);

    res.status(200).json({
      success: true,
      message: "Pastas da entidade recuperadas com sucesso",
      folders: folderTree,
    });
  } catch (error: any) {
    console.error("Error in getorganizationFolders:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching folders",
      error: error.message,
    });
  }
}
