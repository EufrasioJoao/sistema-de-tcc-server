import { Request, Response } from "express";
import { db } from "../../lib/db";

export async function getAllOrganizations(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const organizations = await db.organization.findMany();

    res.status(200).json({ success: true, organizations });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao listar organizações",
      error: error.message,
    });
  }
}
