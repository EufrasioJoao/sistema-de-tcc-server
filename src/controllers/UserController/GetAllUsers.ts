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

    const users = await db.user.findMany({
      where: {
        deleted_at: null,
        organization_id: organizationId,
      },
    });

    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.is_active).length;
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

    users.forEach((user) => {
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

    // Line Chart Data: User registrations over the last 6 months
    const lineChartData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleString("pt-BR", { month: "long" });
      return {
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        users: 0,
      };
    }).reverse();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    users.forEach((user) => {
      const userCreationDate = new Date(user.created_at);
      if (userCreationDate >= sixMonthsAgo) {
        const monthName = userCreationDate.toLocaleString("pt-BR", {
          month: "long",
        });
        const capitalizedMonthName =
          monthName.charAt(0).toUpperCase() + monthName.slice(1);
        const monthData = lineChartData.find(
          (d) => d.month === capitalizedMonthName
        );
        if (monthData) {
          monthData.users++;
        }
      }
    });

    res.status(200).json({
      success: true,
      message: "Usuários recuperados com sucesso",
      users,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        rolesCount,
        barChartData,
        lineChartData,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Erro ao buscar usuários", error });
  }
}
