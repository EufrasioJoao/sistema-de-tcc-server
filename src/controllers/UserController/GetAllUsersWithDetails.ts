import { Request, Response } from "express";
import { db } from "../../lib/db";

export async function getAllUsersWithDetails(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const users = await db.user.findMany();

    if (!users || users.length === 0) {
      res.status(404).json({
        success: false,
        message: "Usuários Inexistentes",
      });
      return;
    }

    const uploadHistories = await db.$queryRaw<
      {
        userId: string;
        userFirstName: string;
        userEmail: string;
        date: string;
        filesUploaded: bigint;
      }[]
    >`
      SELECT 
        u.id AS userId,
        u.first_name AS userFirstName,
        u.email AS userEmail,
        DATE(a.accessed_at) AS date,
        COUNT(*) AS filesUploaded
      FROM user_access_history a
      JOIN users u ON a.accessed_by = u.id
      WHERE a.action_performed = 'File Created'
      GROUP BY u.id, u.first_name, u.email, DATE(a.accessed_at)
      ORDER BY u.id ASC, date ASC
    `;

    const formattedHistories = uploadHistories.reduce((acc, item) => {
      const {
        userId,
        userFirstName,
        userEmail,
        date,
        filesUploaded,
      } = item;

      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userFirstName,
          userEmail,
          history: [],
        };
      }

      acc[userId].history.push({
        date,
        filesUploaded: Number(filesUploaded),
      });

      return acc;
    }, {} as Record<string, { userId: string; userFirstName: string; userEmail: string; history: { date: string; filesUploaded: number }[] }>);

    res.status(200).json({
      success: true,
      message: "Historico dos usuários recuperado com sucesso",
      formattedHistories: Object.values(formattedHistories),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users with details",
      error,
    });
  }
}
