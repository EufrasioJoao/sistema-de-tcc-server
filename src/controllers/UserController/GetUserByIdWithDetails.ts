import { Request, Response } from "express";
import { db } from "../../lib/db";

export async function getUserByIdWithDetails(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Usuário Inexistente",
      });
      return;
    }

    const accessHistory = await db.accessHistory.findMany({
      where: { accessed_by: id },
      orderBy: { accessed_at: "asc" },
    });

    interface DailyHistory {
      date: string;
      views: number;
      downloads: number;
      edits: number;
    }

    const formattedHistory = accessHistory.reduce<Record<string, DailyHistory>>(
      (acc, item) => {
        if (item.accessed_at) {
          const date = item.accessed_at.toISOString().split("T")[0];
          if (!acc[date]) {
            acc[date] = {
              date,
              views: 0,
              downloads: 0,
              edits: 0,
            };
          }

          switch (item.action_performed) {
            case "VIEW_FILE":
            case "DOWNLOAD_FILE":
              acc[date].downloads++;
              break;
            case "EDIT_FILE":
              break;
          }
        }
        return acc;
      },
      {}
    );

    res.status(200).json({
      success: true,
      message: "Histórico do usuário recuperado com sucesso",
      user: {
        ...user,
        history: Object.values(formattedHistory),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user with details",
      error,
    });
  }
}
