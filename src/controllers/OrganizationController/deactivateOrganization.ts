import { Request, Response } from "express";
import { db } from "../../lib/db";
import z from "zod";

export async function deactivateOrganization(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { organizationId } = z.object({
        organizationId: z.string().uuid(),
    }).parse(req.params);

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      res.status(404).json({
        success: false,
        message: "Organização não encontrada!",
      });
      return;
    }

    const deactivatedOrganization = await db.organization.update({
      where: { id: organizationId },
      data: {
        is_active: false,
      },
    });

    res.status(200).json({
      success: true,
      message: "Organização desativada com sucesso",
      organization: deactivatedOrganization,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao desativar organização",
      error: error.message,
    });
  }
}
