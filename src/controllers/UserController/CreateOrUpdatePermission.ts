import { Request, Response } from "express";
import { db } from "../../lib/db";

export async function CreateOrUpdatePermission(req: Request, res: Response): Promise<void> {
  try {
    const { folderId, userId, accessLevel } = req.body;

    if (!folderId || !userId || !accessLevel) {
      res.status(400).json({
        success: false,
        message: "Folder ID, User ID, and Access Level are required",
      });
      return;
    }

    const existingPermission = await db.folderPermission.findFirst({
      where: {
        folderId: folderId,
        userId: userId,
      },
    });

    if (existingPermission) {
      const updatedPermission = await db.folderPermission.update({
        where: {
          id: existingPermission.id,
        },
        data: {
          accessLevel: accessLevel,
        },
      });
      res.status(200).json({
        success: true,
        message: "Permissão atualizada com sucesso",
        permission: updatedPermission,
      });
    } else {
      const newPermission = await db.folderPermission.create({
        data: {
          folderId: folderId,
          userId: userId,
          accessLevel: accessLevel,
        },
      });
      res.status(201).json({
        success: true,
        message: "Permissão criada com sucesso",
        permission: newPermission,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating or updating permission",
      error: error,
    });
  }
}
