import { Request, Response } from "express";
import { db } from "../../lib/db";
import { UserRoles, TccType } from "@prisma/client";
import { AuthRequest } from "@/middlewares/authMiddleware";

export async function getDashboardData(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 1);

    // Get user's organization
    const userWithOrg = await db.user.findUnique({
      where: { id: user.id },
      select: {
        organization_id: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!userWithOrg) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    const organizationId = userWithOrg.organization_id;
    const isSystemAdmin =
      userWithOrg.role === UserRoles.ADMIN ||
      userWithOrg.role === UserRoles.SISTEM_MANAGER;

    // Base filters for organization-specific data
    const userOrgFilter = isSystemAdmin
      ? undefined
      : { organization_id: organizationId };
    const courseOrgFilter = isSystemAdmin
      ? undefined
      : {
          coordinator: {
            organization_id: organizationId,
          },
        };
    const tccOrgFilter = isSystemAdmin
      ? undefined
      : {
          author: {
            course: {
              coordinator: {
                organization_id: organizationId,
              },
            },
          },
        };

    // Fetch organizational metrics
    const [
      totalUsers,
      totalTccs,
      totalFiles,
      totalCourses,
      usersByRole,
      tccsByType,
      monthlyTccStats,
      topCourses,
      allCourses,
    ] = await Promise.all([
      // Total users in organization
      db.user.count({
        where: userOrgFilter,
      }),

      // Total TCCs
      db.tCC.count({
        where: tccOrgFilter,
      }),

      // Total files
      db.file.count({
        where: {
          ...userOrgFilter,
          deleted_at: null,
        },
      }),

      // Total courses
      db.course.count({
        where: courseOrgFilter,
      }),

      // Users by role
      db.user.groupBy({
        by: ["role"],
        where: userOrgFilter,
        _count: {
          id: true,
        },
      }),

      // TCCs by type
      db.tCC.groupBy({
        by: ["type"],
        where: tccOrgFilter,
        _count: {
          id: true,
        },
      }),

      // Monthly TCC creation stats
      db.tCC.findMany({
        where: {
          ...tccOrgFilter,
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          createdAt: true,
          type: true,
        },
      }),

      // Top courses by TCC count
      db.course.findMany({
        where: courseOrgFilter,
        include: {
          _count: {
            select: {
              tccs: true,
            },
          },
        },
        orderBy: {
          tccs: {
            _count: "desc",
          },
        },
        take: 5,
      }),

      // All courses with detailed information
      db.course.findMany({
        where: courseOrgFilter,
        include: {
          coordinator: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          _count: {
            select: {
              students: true,
              tccs: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    // Process monthly TCC data
    const monthlyTccMap: Record<
      string,
      { date: string; bachelor: number; master: number; doctorate: number }
    > = {};

    monthlyTccStats.forEach((tcc: { createdAt: Date; type: TccType }) => {
      const date = tcc.createdAt.toISOString().split("T")[0];
      if (!monthlyTccMap[date]) {
        monthlyTccMap[date] = { date, bachelor: 0, master: 0, doctorate: 0 };
      }

      switch (tcc.type) {
        case TccType.BACHELOR:
          monthlyTccMap[date].bachelor++;
          break;
        case TccType.MASTER:
          monthlyTccMap[date].master++;
          break;
        case TccType.DOCTORATE:
          monthlyTccMap[date].doctorate++;
          break;
      }
    });

    const monthlyTccData = Object.values(monthlyTccMap);

    // Area Chart Data: Daily TCC registrations over the last 90 days (3 months) up to today
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89); // 90 days including today
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    const tccAreaChartData = Array.from({ length: 90 }, (_, i) => {
      const date = new Date(ninetyDaysAgo);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        tccs: 0,
      };
    });

    // Fetch TCCs from the last 90 days
    const recentTccs = await db.tCC.findMany({
      where: {
        ...tccOrgFilter,
        createdAt: {
          gte: ninetyDaysAgo,
          lte: today,
        },
      },
      select: {
        createdAt: true,
      },
    });

    recentTccs.forEach((tcc) => {
      const tccCreationDate = new Date(tcc.createdAt);
      tccCreationDate.setHours(0, 0, 0, 0);
      
      if (tccCreationDate >= ninetyDaysAgo && tccCreationDate <= today) {
        const dateStr = tccCreationDate.toISOString().split('T')[0];
        const dayData = tccAreaChartData.find((d) => d.date === dateStr);
        if (dayData) {
          dayData.tccs++;
        }
      }
    });

    // Format role distribution
    const roleDistribution = usersByRole.map(
      (role: { role: UserRoles; _count: { id: number } }) => ({
        role: role.role,
        count: role._count.id,
        label:
          {
            [UserRoles.ADMIN]: "Administrador",
            [UserRoles.SISTEM_MANAGER]: "Gerente do Sistema",
            [UserRoles.COURSE_COORDENATOR]: "Coordenador de Curso",
            [UserRoles.ACADEMIC_REGISTER]: "Registro Acadêmico",
          }[role.role] || role.role,
      })
    );

    // Format TCC type distribution
    const tccTypeDistribution = tccsByType.map(
      (type: { type: TccType; _count: { id: number } }) => ({
        type: type.type,
        count: type._count.id,
        label:
          {
            [TccType.BACHELOR]: "Graduação",
            [TccType.MASTER]: "Mestrado",
            [TccType.DOCTORATE]: "Doutorado",
          }[type.type] || type.type,
      })
    );

    const responseData = {
      organization: userWithOrg.organization,
      overview: {
        total_users: totalUsers,
        total_tccs: totalTccs,
        total_files: totalFiles,
        total_courses: totalCourses,
      },
      distributions: {
        users_by_role: roleDistribution,
        tccs_by_type: tccTypeDistribution,
      },
      trends: {
        monthly_tccs: monthlyTccData,
        tcc_area_chart: tccAreaChartData,
      },
      top_courses: topCourses.map(
        (course: { id: string; name: string; _count: { tccs: number } }) => ({
          id: course.id,
          name: course.name,
          tcc_count: course._count.tccs,
        })
      ),
      courses: allCourses,
    };

    res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error,
    });
  }
}
