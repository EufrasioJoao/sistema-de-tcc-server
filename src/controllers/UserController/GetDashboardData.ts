import { Request, Response } from "express";
import { db } from "../../lib/db";

export async function getDashboardData(req: Request, res: Response): Promise<void> {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Fetch total count of organizations and users
    const totalOrganizations = await db.organization.count();
    const totalUsers = await db.user.count();

    // Fetch activity data for this month using Prisma's query API
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 1);

    // Fetch files and folders created this month
    const filesCreated = await db.file.findMany({
      where: {
        created_at: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        created_at: true,
      },
    });

    const foldersCreated = await db.folder.findMany({
      where: {
        created_at: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        created_at: true,
      },
    });

    // Define the type for the accumulator object
    type ActivityAcc = Record<
      string,
      { date: string; foldersCreated: number; filesCreated: number }
    >;

    const activityMap: ActivityAcc = {};

    filesCreated.forEach(file => {
        const date = file.created_at.toISOString().split("T")[0];
        if (!activityMap[date]) {
            activityMap[date] = { date, foldersCreated: 0, filesCreated: 0 };
        }
        activityMap[date].filesCreated++;
    });

    foldersCreated.forEach(folder => {
        const date = folder.created_at.toISOString().split("T")[0];
        if (!activityMap[date]) {
            activityMap[date] = { date, foldersCreated: 0, filesCreated: 0 };
        }
        activityMap[date].foldersCreated++;
    });

    const activityData = Object.values(activityMap);

    const responseData = {
      card_data: {
        total_organizations: totalOrganizations,
        total_users: totalUsers,
      },
      activity_data: {
        activity_of_this_month: activityData,
      },
    };

    res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error); // For debugging
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error,
    });
  }
}
