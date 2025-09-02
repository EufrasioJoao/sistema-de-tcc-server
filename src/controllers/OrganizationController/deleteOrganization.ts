import { Request, Response } from "express";
import { db } from "../../lib/db";
import { z } from "zod";

export async function deleteOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const deleteOrganizationSchema = z.object({
    id: z.string().uuid("ID da organização inválido"),
  });

  try {
    const { id } = deleteOrganizationSchema.parse(req.params);

    const organization = await db.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      res
        .status(404)
        .json({ success: false, message: "Organização não encontrada" });
      return;
    }

    await db.organization.delete({ where: { id } });

    res
      .status(200)
      .json({ success: true, message: "Organização excluída com sucesso" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao excluir organização",
      error: error.message,
    });
  }
}
