import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { UserRoles } from "@prisma/client";
import { db } from "../lib/db";

/**
 * Get general system statistics
 */
export async function getSystemStatistics(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true, role: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    // Only ADMIN and SISTEM_MANAGER can view system statistics
    if (
      user.role !== UserRoles.ADMIN &&
      user.role !== UserRoles.SISTEM_MANAGER
    ) {
      res.status(403).json({
        success: false,
        message:
          "Acesso negado. Apenas administradores podem visualizar estatísticas do sistema",
      });
      return;
    }

    // Get organization statistics
    const [
      totalUsers,
      activeUsers,
      totalCourses,
      totalStudents,
      totalTccs,
      totalFiles,
      storageUsed,
      recentActivity,
    ] = await Promise.all([
      // Total users
      db.user.count({
        where: {
          organization_id: user.organization_id,
          deleted_at: null,
        },
      }),
      // Active users (logged in last 30 days)
      db.user.count({
        where: {
          organization_id: user.organization_id,
          deleted_at: null,
          last_login_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Total courses
      db.course.count({
        where: {
          deletedAt: null,
        },
      }),
      // Total students
      db.student.count({
        where: {
          deletedAt: null,
        },
      }),
      // Total TCCs
      db.tCC.count({
        where: {
          deletedAt: null,
        },
      }),
      // Total files
      db.file.count({
        where: {
          organization_id: user.organization_id,
          deleted_at: null,
        },
      }),
      // Storage used
      db.organization.findUnique({
        where: { id: user.organization_id },
        select: { UsedStorage: true },
      }),
      // Recent activity (last 7 days)
      db.accessHistory.count({
        where: {
          user: {
            organization_id: user.organization_id,
          },
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
        },
        courses: totalCourses,
        students: totalStudents,
        tccs: totalTccs,
        files: totalFiles,
        storage: {
          used: storageUsed?.UsedStorage || 0,
        },
        activity: {
          recent: recentActivity,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching system statistics:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

/**
 * Get TCC statistics and reports
 */
export async function getTccReports(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true, role: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    // Get TCC statistics
    const [tccsByType, tccsByYear, tccsByCourse, recentTccs] =
      await Promise.all([
        // TCCs by type
        db.tCC.groupBy({
          by: ["type"],
          _count: {
            id: true,
          },
          where: {
            deletedAt: null,
          },
        }),
        // TCCs by year
        db.tCC.groupBy({
          by: ["year"],
          _count: {
            id: true,
          },
          where: {
            deletedAt: null,
          },
          orderBy: {
            year: "desc",
          },
          take: 5,
        }),
        // TCCs by course
        db.tCC.groupBy({
          by: ["courseId"],
          _count: {
            id: true,
          },
          where: {
            deletedAt: null,
          },
        }),
        // Recent TCCs
        db.tCC.findMany({
          where: {
            deletedAt: null,
          },
          include: {
            author: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            course: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        }),
      ]);

    // Get course names for TCCs by course
    const courseIds = tccsByCourse.map((item) => item.courseId);
    const courses = await db.course.findMany({
      where: {
        id: {
          in: courseIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Format data
    const tccsByCourseFormatted = tccsByCourse.map((item) => {
      const course = courses.find((c) => c.id === item.courseId);
      return {
        courseId: item.courseId,
        courseName: course?.name || "Curso não encontrado",
        count: item._count.id,
      };
    });

    res.json({
      success: true,
      data: {
        byType: tccsByType.map((item) => ({
          type: item.type,
          count: item._count.id,
        })),
        byYear: tccsByYear.map((item) => ({
          year: item.year,
          count: item._count.id,
        })),
        byCourse: tccsByCourseFormatted,
        recent: recentTccs,
      },
    });
  } catch (error) {
    console.error("Error fetching TCC reports:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

/**
 * Get user activity reports
 */
export async function getUserActivityReports(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true, role: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    // Only ADMIN and SISTEM_MANAGER can view user activity reports
    if (
      user.role !== UserRoles.ADMIN &&
      user.role !== UserRoles.SISTEM_MANAGER
    ) {
      res.status(403).json({
        success: false,
        message: "Acesso negado",
      });
      return;
    }

    const { days = "30" } = req.query;
    const daysNum = parseInt(days as string);
    const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const [
      activityByAction,
      activityByDay,
      mostActiveUsers,
      mostAccessedFiles,
    ] = await Promise.all([
      // Activity by action type
      db.accessHistory.groupBy({
        by: ["action_performed"],
        _count: {
          id: true,
        },
        where: {
          user: {
            organization_id: user.organization_id,
          },
          created_at: {
            gte: startDate,
          },
        },
      }),
      // Activity by day
      db.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT 
          DATE(ah.created_at) as date,
          CAST(COUNT(*) as SIGNED) as count
        FROM access_history ah
        JOIN users u ON ah.accessed_by = u.id
        WHERE u.organization_id = ${user.organization_id}
          AND ah.created_at >= ${startDate}
        GROUP BY DATE(ah.created_at)
        ORDER BY date DESC
        LIMIT 30
      `,
      // Most active users
      db.accessHistory.groupBy({
        by: ["accessed_by"],
        _count: {
          id: true,
        },
        where: {
          user: {
            organization_id: user.organization_id,
          },
          created_at: {
            gte: startDate,
          },
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 10,
      }),
      // Most accessed files
      db.accessHistory.groupBy({
        by: ["file_id"],
        _count: {
          id: true,
        },
        where: {
          user: {
            organization_id: user.organization_id,
          },
          file_id: {
            not: null,
          },
          created_at: {
            gte: startDate,
          },
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 10,
      }),
    ]);

    // Get user names for most active users
    const userIds = mostActiveUsers.map((item) => item.accessed_by);
    const users = await db.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
      },
    });

    // Get file names for most accessed files
    const fileIds = mostAccessedFiles
      .map((item) => item.file_id)
      .filter(Boolean) as string[];
    const files = await db.file.findMany({
      where: {
        id: {
          in: fileIds,
        },
      },
      select: {
        id: true,
        displayName: true,
        filename: true,
      },
    });

    // Format data
    const mostActiveUsersFormatted = mostActiveUsers.map((item) => {
      const userData = users.find((u) => u.id === item.accessed_by);
      return {
        userId: item.accessed_by,
        userName: userData
          ? `${userData.first_name} ${userData.last_name}`
          : "Usuário não encontrado",
        email: userData?.email || "",
        activityCount: item._count.id,
      };
    });

    const mostAccessedFilesFormatted = mostAccessedFiles.map((item) => {
      const fileData = files.find((f) => f.id === item.file_id);
      return {
        fileId: item.file_id,
        fileName:
          fileData?.displayName ||
          fileData?.filename ||
          "Arquivo não encontrado",
        accessCount: item._count.id,
      };
    });

    res.json({
      success: true,
      data: {
        byAction: activityByAction.map((item) => ({
          action: item.action_performed,
          count: item._count.id,
        })),
        byDay: activityByDay.map((item) => ({
          date: item.date,
          count: Number(item.count),
        })),
        mostActiveUsers: mostActiveUsersFormatted,
        mostAccessedFiles: mostAccessedFilesFormatted,
      },
    });
  } catch (error) {
    console.error("Error fetching user activity reports:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

/**
 * Get course statistics reports
 */
export async function getCourseReports(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true, role: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    const [
      coursesByTccCount,
      coursesByStudentCount,
      coursesWithMostSupervisors,
      coursesByYear,
      recentCourses,
    ] = await Promise.all([
      // Courses by TCC count
      db.course.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              tccs: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
        orderBy: {
          tccs: {
            _count: "desc",
          },
        },
        take: 10,
      }),
      // Courses by student count
      db.course.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              students: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
        orderBy: {
          students: {
            _count: "desc",
          },
        },
        take: 10,
      }),
      // Courses with most supervisors
      db.$queryRaw<
        Array<{ id: string; name: string; supervisor_count: number }>
      >`
                SELECT 
                    c.id,
                    c.name,
                    CAST(COUNT(DISTINCT t.supervisor) as SIGNED) as supervisor_count
                FROM courses c
                LEFT JOIN tccs t ON c.id = t.courseId AND t.deletedAt IS NULL AND t.supervisor IS NOT NULL
                WHERE c.deletedAt IS NULL
                GROUP BY c.id, c.name
                ORDER BY supervisor_count DESC
                LIMIT 10
            `,
      // Courses by creation year
      db.$queryRaw<Array<{ year: number; count: number }>>`
                SELECT 
                    YEAR(createdAt) as year,
                    CAST(COUNT(*) as SIGNED) as count
                FROM courses
                WHERE deletedAt IS NULL
                GROUP BY YEAR(createdAt)
                ORDER BY year DESC
                LIMIT 5
            `,
      // Recent courses
      db.course.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
    ]);

    // Get total courses count
    const totalCourses = await db.course.count({
      where: {
        deletedAt: null,
      },
    });

    res.json({
      success: true,
      data: {
        totalCourses,
        byTccCount: coursesByTccCount.map((course) => ({
          id: course.id,
          name: course.name,
          tccCount: course._count.tccs,
        })),
        byStudentCount: coursesByStudentCount.map((course) => ({
          id: course.id,
          name: course.name,
          studentCount: course._count.students,
        })),
        bySupervisorCount: coursesWithMostSupervisors.map((item) => ({
          id: item.id,
          name: item.name,
          supervisor_count: Number(item.supervisor_count),
        })),
        byYear: coursesByYear.map((item) => ({
          year: Number(item.year),
          count: Number(item.count),
        })),
        recent: recentCourses,
      },
    });
  } catch (error) {
    console.error("Error fetching course reports:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

/**
 * Get author statistics reports
 */
export async function getAuthorReports(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true, role: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    const [
      mostProductiveAuthors,
      authorsByCourse,
      authorsWithMostSupervisors,
      recentAuthors,
    ] = await Promise.all([
      // Most productive authors (by TCC count)
      db.student.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              tccs: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
          course: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          tccs: {
            _count: "desc",
          },
        },
        take: 10,
      }),
      // Authors by course
      db.student.groupBy({
        by: ["courseId"],
        _count: {
          id: true,
        },
        where: {
          deletedAt: null,
        },
      }),
      // Authors with most different supervisors
      db.$queryRaw<
        Array<{
          id: string;
          firstName: string;
          lastName: string;
          email: string;
          supervisor_count: number;
        }>
      >`
                SELECT 
                    s.id,
                    s.firstName,
                    s.lastName,
                    s.email,
                    CAST(COUNT(DISTINCT t.supervisor) as SIGNED) as supervisor_count
                FROM students s
                LEFT JOIN tccs t ON s.id = t.authorId AND t.deletedAt IS NULL AND t.supervisor IS NOT NULL
                WHERE s.deletedAt IS NULL
                GROUP BY s.id, s.firstName, s.lastName, s.email
                HAVING supervisor_count > 0
                ORDER BY supervisor_count DESC
                LIMIT 10
            `,
      // Recent authors
      db.student.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          course: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    // Get course names for authors by course
    const courseIds = authorsByCourse.map((item) => item.courseId);
    const courses = await db.course.findMany({
      where: {
        id: {
          in: courseIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const authorsByCourseFormatted = authorsByCourse.map((item) => {
      const course = courses.find((c) => c.id === item.courseId);
      return {
        courseId: item.courseId,
        courseName: course?.name || "Curso não encontrado",
        count: item._count.id,
      };
    });

    res.json({
      success: true,
      data: {
        mostProductive: mostProductiveAuthors.map((author) => ({
          id: author.id,
          name: `${author.firstName} ${author.lastName}`,
          email: author.email,
          courseName: author.course?.name,
          tccCount: author._count.tccs,
        })),
        byCourse: authorsByCourseFormatted,
        withMostSupervisors: authorsWithMostSupervisors.map((item) => ({
          id: item.id,
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          supervisor_count: Number(item.supervisor_count),
        })),
        recent: recentAuthors.map((author) => ({
          id: author.id,
          name: `${author.firstName} ${author.lastName}`,
          email: author.email,
          courseName: author.course?.name,
          createdAt: author.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching author reports:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

/**
 * Get keyword statistics reports
 */
export async function getKeywordReports(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true, role: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    // Get all TCCs and filter those with keywords
    const allTccs = await db.tCC.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        keywords: true,
        courseId: true,
        year: true,
        course: {
          select: {
            name: true,
          },
        },
      },
    });

    // Filter TCCs that actually have keywords
    const tccsWithKeywords = allTccs.filter(
      (tcc) => tcc.keywords && tcc.keywords.trim() !== ""
    );

    // Process keywords
    const keywordMap = new Map<
      string,
      {
        count: number;
        tccs: Array<{
          id: string;
          title: string;
          courseName: string;
          year: number;
        }>;
        courses: Set<string>;
        years: Set<number>;
      }
    >();

    tccsWithKeywords.forEach((tcc) => {
      if (tcc.keywords) {
        const keywords = tcc.keywords
          .split(",")
          .map((k) => k.trim().toLowerCase());
        keywords.forEach((keyword) => {
          if (keyword) {
            if (!keywordMap.has(keyword)) {
              keywordMap.set(keyword, {
                count: 0,
                tccs: [],
                courses: new Set(),
                years: new Set(),
              });
            }
            const keywordData = keywordMap.get(keyword)!;
            keywordData.count++;
            keywordData.tccs.push({
              id: tcc.id,
              title: tcc.title,
              courseName: tcc.course?.name || "Curso não encontrado",
              year: tcc.year,
            });
            keywordData.courses.add(tcc.course?.name || "Curso não encontrado");
            keywordData.years.add(tcc.year);
          }
        });
      }
    });

    // Convert to arrays and sort
    const mostUsedKeywords = Array.from(keywordMap.entries())
      .map(([keyword, data]) => ({
        keyword,
        count: data.count,
        courseCount: data.courses.size,
        yearSpread: data.years.size,
        tccs: data.tccs.slice(0, 5), // Limit to 5 TCCs per keyword
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Keywords by course
    const keywordsByCourse = new Map<string, Map<string, number>>();
    tccsWithKeywords.forEach((tcc) => {
      const courseName = tcc.course?.name || "Curso não encontrado";
      if (!keywordsByCourse.has(courseName)) {
        keywordsByCourse.set(courseName, new Map());
      }
      const courseKeywords = keywordsByCourse.get(courseName)!;

      if (tcc.keywords) {
        const keywords = tcc.keywords
          .split(",")
          .map((k) => k.trim().toLowerCase());
        keywords.forEach((keyword) => {
          if (keyword) {
            courseKeywords.set(keyword, (courseKeywords.get(keyword) || 0) + 1);
          }
        });
      }
    });

    const keywordsByCourseFormatted = Array.from(
      keywordsByCourse.entries()
    ).map(([courseName, keywords]) => ({
      courseName,
      topKeywords: Array.from(keywords.entries())
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    }));

    // Keywords by year
    const keywordsByYear = new Map<number, Map<string, number>>();
    tccsWithKeywords.forEach((tcc) => {
      if (!keywordsByYear.has(tcc.year)) {
        keywordsByYear.set(tcc.year, new Map());
      }
      const yearKeywords = keywordsByYear.get(tcc.year)!;

      if (tcc.keywords) {
        const keywords = tcc.keywords
          .split(",")
          .map((k) => k.trim().toLowerCase());
        keywords.forEach((keyword) => {
          if (keyword) {
            yearKeywords.set(keyword, (yearKeywords.get(keyword) || 0) + 1);
          }
        });
      }
    });

    const keywordsByYearFormatted = Array.from(keywordsByYear.entries())
      .map(([year, keywords]) => ({
        year,
        topKeywords: Array.from(keywords.entries())
          .map(([keyword, count]) => ({ keyword, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      }))
      .sort((a, b) => b.year - a.year);

    res.json({
      success: true,
      data: {
        mostUsed: mostUsedKeywords,
        byCourse: keywordsByCourseFormatted,
        byYear: keywordsByYearFormatted,
        totalKeywords: keywordMap.size,
        totalTccsWithKeywords: tccsWithKeywords.length,
      },
    });
  } catch (error) {
    console.error("Error fetching keyword reports:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

/**
 * Get storage reports
 */
export async function getStorageReports(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true, role: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    const [largestFiles, storageByUploader, organizationStorage] =
      await Promise.all([
        // Largest files
        db.file.findMany({
          where: {
            organization_id: user.organization_id,
            deleted_at: null,
          },
          select: {
            id: true,
            displayName: true,
            filename: true,
            size: true,
            type: true,
            uploader: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
          take: 10,
        }),
        // Storage by uploader
        db.file.groupBy({
          by: ["uploaded_by"],
          _count: {
            id: true,
          },
          where: {
            organization_id: user.organization_id,
            deleted_at: null,
          },
          orderBy: {
            _count: {
              id: "desc",
            },
          },
          take: 10,
        }),
        // Organization storage info
        db.organization.findUnique({
          where: { id: user.organization_id },
          select: {
            UsedStorage: true,
            name: true,
          },
        }),
      ]);

    // Get uploader names
    const uploaderIds = storageByUploader.map((item) => item.uploaded_by);
    const uploaders = await db.user.findMany({
      where: {
        id: {
          in: uploaderIds,
        },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
      },
    });

    // Format data
    const storageByUploaderFormatted = storageByUploader.map((item) => {
      const uploaderData = uploaders.find((u) => u.id === item.uploaded_by);
      return {
        uploaderId: item.uploaded_by,
        uploaderName: uploaderData
          ? `${uploaderData.first_name} ${uploaderData.last_name}`
          : "Usuário não encontrado",
        fileCount: item._count.id,
      };
    });

    res.json({
      success: true,
      data: {
        largestFiles,
        byUploader: storageByUploaderFormatted,
        organization: {
          name: organizationStorage?.name,
          usedStorage: organizationStorage?.UsedStorage || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching storage reports:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}
