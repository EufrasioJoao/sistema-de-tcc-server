import { Request, Response } from "express";
import { db } from "../../lib/db";
import { z } from "zod";

export async function getOrganizationStorage(
  req: Request,
  res: Response
): Promise<void> {
  const getOrganizationStorageSchema = z.object({
    id: z.string().uuid("ID da organização inválido"),
  });

  try {
    const { id } = getOrganizationStorageSchema.parse(req.params);

    const organization = await db.organization.findUnique({
      where: { id },
      select: {
        UsedStorage: true,
      },
    });

    if (!organization) {
      res.status(404).json({
        success: false,
        message: "Organização não encontrada",
      });
      return;
    }

    // Convert bytes to gigabytes (1 GB = 1024^3 bytes)
    const usedStorageGB = (organization.UsedStorage || 0) / Math.pow(1024, 3);

    const storageInfo = {
      used: usedStorageGB.toFixed(4),
    };

    res.status(200).json({
      success: true,
      message: "Informações de armazenamento recuperadas com sucesso",
      storage: storageInfo,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao buscar informações de armazenamento",
      error: error.message,
    });
  }
}
