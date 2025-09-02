import { Response } from "express";
import { db } from "../../lib/db";
import { Prisma } from "@prisma/client";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { z } from "zod";

export async function getDashboardDataByOrganizationID(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const getDashboardDataSchema = z.object({
    organization_id: z.string().uuid("ID da organização inválido"),
  });

  try {
    const { organization_id } = getDashboardDataSchema.parse(req.query);

    const users = await db.user.findMany({
      where: { id: organization_id },
      select: {
        id: true,
        first_name: true,
        created_at: true,
      },
    });

    const creationHistory = await db.$queryRaw<
      { created_date: string; created_count: BigInt }[]
    >(
      Prisma.sql`SELECT 
                       DATE(created_at) AS created_date, 
                       COUNT(*) AS created_count
                     FROM 
                       User
                     WHERE 
                       organization_id = ${organization_id}
                     GROUP BY 
                       DATE(created_at)
                     ORDER BY 
                       created_date ASC`
    );

    const usersCreationHistory = creationHistory.map((record) => ({
      date: record.created_date,
      created: Number(record.created_count),
    }));

    const responseData = {
      users,
      charts_data: {
        users_creation_history: usersCreationHistory,
      },
    };

    res.status(200).json({
      success: true,
      message: "Dados do dashboard obtidos com sucesso",
      metrics: responseData,
    });
  } catch (error: any) {
    console.error("Erro ao obter os dados do dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter os dados do dashboard",
      error: error.message,
    });
  }
}
