import { Request, Response } from "express";
import { db } from "../../lib/db";

export async function getFolderOrFilePermission(req: Request, res: Response): Promise<void> {
  try {
    const { folderId, userId } = req.params;

    if (!folderId || !userId) {
      res.status(400).json({
        success: false,
        message: "Folder ID and User ID are required",
      });
      return;
    }

    const permission = await db.folderPermission.findFirst({
      where: {
        folderId: folderId,
        userId: userId,
      },
    });

    if (permission) {
      res.status(200).json({
        success: true,
        message: "Permissão recuperada com sucesso",
        permission: permission,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Permissão não encontrada",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching permission",
      error: error,
    });
  }
}
