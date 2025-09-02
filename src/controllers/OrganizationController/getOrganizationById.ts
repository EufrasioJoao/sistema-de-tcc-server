import { Request, Response } from "express";
import { db } from "../../lib/db";
import { z } from "zod";

export async function getOrganizationById(
  req: Request,
  res: Response
): Promise<void> {
  const getOrganizationByIdSchema = z.object({
    id: z.string().uuid("ID da organização inválido"),
  });
  try {
    const { id } = getOrganizationByIdSchema.parse(req.params);

    const organization = await db.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      res
        .status(404)
        .json({ success: false, message: "Organização não encontrada" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Organização recuperada com sucesso!",
      organization,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao buscar organização",
      error: error.message,
    });
  }
}
