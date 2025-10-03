import { Response } from "express";
import { db } from "../../lib/db";
import { AuthRequest } from "../../middlewares/authMiddleware";

export async function getAllUsers(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = await db.user.findUnique({
      where: { id: req.user?.id },
    });

    if (!requestingUser) {
      res.status(403).json({
        success: false,
        message: "Usuário não pertence a nenhuma organização.",
      });
      return;
    }

    const organizationId = requestingUser.organization_id;

    // Extract query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const role = (req.query.role as string) || "";
    const status = (req.query.status as string) || "";

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      deleted_at: null,
      organization_id: organizationId,
    };

    // Add search conditions
    if (search) {
      whereClause.OR = [
        { first_name: { contains: search, } },
        { last_name: { contains: search, } },
        { email: { contains: search, } },
      ];
    }

    // Add role filter
    if (role) {
      whereClause.role = role;
    }

    // Add status filter
    if (status === "active") {
      whereClause.is_active = true;
    } else if (status === "inactive") {
      whereClause.is_active = false;
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      db.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      db.user.count({ where: whereClause }),
    ]);

    // Get all users for stats (without pagination)
    const allUsers = await db.user.findMany({
      where: {
        deleted_at: null,
        organization_id: organizationId,
      },
    });

    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((user) => user.is_active).length;
    const inactiveUsers = totalUsers - activeUsers;

    const rolesTranslation: Record<string, string> = {
      ADMIN: "Administrador",
      SISTEM_MANAGER: "Gerente de Sistema",
      COURSE_COORDENATOR: "Coordenador de Curso",
      ACADEMIC_REGISTER: "Registro Acadêmico",
    };

    const allRoles = Object.keys(rolesTranslation);
    const rolesCount = allRoles.reduce(
      (acc, role) => {
        acc[role] = 0;
        return acc;
      },
      {} as Record<string, number>
    );

    allUsers.forEach((user) => {
      if (user.role && rolesCount.hasOwnProperty(user.role)) {
        rolesCount[user.role]++;
      }
    });

    const barChartData = Object.entries(rolesCount)
      .filter(([, total]) => total > 0)
      .map(([name, total]) => ({
        name: rolesTranslation[name] || name,
        total,
      }));





    // Area Chart Data: Daily user registrations over the last 90 days (3 months) up to today
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89); // 90 days including today
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    const areaChartData = Array.from({ length: 90 }, (_, i) => {
      const date = new Date(ninetyDaysAgo);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        usuarios: 0,
      };
    });

    allUsers.forEach((user) => {
      const userCreationDate = new Date(user.created_at);
      userCreationDate.setHours(0, 0, 0, 0);

      if (userCreationDate >= ninetyDaysAgo && userCreationDate <= today) {
        const dateStr = userCreationDate.toISOString().split('T')[0];
        const dayData = areaChartData.find((d) => d.date === dateStr);
        if (dayData) {
          dayData.usuarios++;
        }
      }
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      message: "Usuários recuperados com sucesso",
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        rolesCount,
        barChartData,
        areaChartData,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Erro ao buscar usuários", error });
  }
}
