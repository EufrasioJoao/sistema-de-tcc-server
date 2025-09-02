import { Request, Response } from "express";
import { db } from "../../lib/db";

export async function getOrganizationCreationHistory(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Obter todas as organizações e agrupar por data de criação
    const organizations = await db.organization.findMany({
      select: {
        created_at: true,
      },
    });

    // Processar os dados para criar o histórico
    const history = organizations.reduce((acc: Record<string, number>, organization) => {
      const date = organization.created_at.toISOString().split("T")[0]; // Garantir o formato 'ano-mes-dia'
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Transformar o histórico em um array no formato desejado
    const result = Object.entries(history).map(([date, created]) => ({
      date,
      created,
    }));

    res.status(200).json({ success: true, history: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao obter histórico de criação de Clientes",
      error: error.message,
    });
  }
}
