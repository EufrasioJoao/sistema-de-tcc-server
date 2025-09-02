import { Request, Response } from "express";
import { db } from "../../lib/db";
import { z } from "zod";

export async function updateOrganization(req: Request, res: Response) {
  const updateOrganizationParamsSchema = z.object({
    id: z.string().uuid("ID da organização inválido"),
  });

  const updateOrganizationBodySchema = z.object({
    name: z.string().optional(),
    email: z.string().email("E-mail inválido.").optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    is_active: z.boolean().optional(),
  });

  try {
    const { id } = updateOrganizationParamsSchema.parse(req.params);
    const data = updateOrganizationBodySchema.parse(req.body);

    const organization = await db.organization.update({
      where: { id },
      data,
    });

    res.status(200).json({
      success: true,
      message: "Organização atualizada com sucesso",
      organization,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Erro ao atualizar organização",
      error: error.message,
    });
  }
}
