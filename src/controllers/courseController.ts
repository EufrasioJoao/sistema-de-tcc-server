import { db } from "../lib/db";
import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { registerUser } from "./UserController";

export async function getAllCourses(
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
      where: { id: requestingUser?.id },
      select: { organization_id: true },
    });

    // Extract query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) || "desc";
    const coordinatorFilter = req.query.coordinator as string;

    const skip = (page - 1) * limit;

    // Build base where clause
    const whereClause: any = {
      deletedAt: null,
      AND: [
        // Organization filter
        {
          OR: [
            {
              // Courses with coordinators from the same organization
              coordinator: {
                organization_id: user?.organization_id,
              },
            },
            {
              // Courses without coordinators (assuming they belong to all organizations)
              coordinatorId: null,
            },
          ],
        },
      ],
    };

    // Add search filter
    if (search) {
      whereClause.AND.push({
        name: {
          contains: search,
        },
      });
    }

    // Add coordinator filter
    if (coordinatorFilter === "with") {
      // Replace the organization filter with a more specific one
      whereClause.AND[0] = {
        coordinator: {
          organization_id: user?.organization_id,
        },
      };
    } else if (coordinatorFilter === "without") {
      // Replace the organization filter to only show courses without coordinators
      whereClause.AND[0] = {
        coordinatorId: null,
      };
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === "students") {
      orderBy.students = { _count: sortOrder };
    } else if (sortBy === "tccs") {
      orderBy.tccs = { _count: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Debug logging
    console.log("Search query:", {
      search,
      whereClause: JSON.stringify(whereClause, null, 2),
      orderBy,
      page,
      limit,
    });

    // Fetch courses with pagination
    const [courses, total] = await Promise.all([
      db.course.findMany({
        where: whereClause,
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
              students: {
                where: {
                  deletedAt: null,
                },
              },
              tccs: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.course.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: "Cursos recuperados com sucesso",
      courses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

// Get course by ID
export async function getCourseById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const requestingUser = req.user;

  if (!requestingUser) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  try {
    // Get user's organization
    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true },
    });

    const course = await db.course.findFirst({
      where: {
        id,
        coordinator: {
          organization_id: user?.organization_id,
        },
        deletedAt: null, // Filter out soft deleted courses
      },
      include: {
        coordinator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        students: {
          where: {
            deletedAt: null, // Only include non-deleted students
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentNumber: true,
            createdAt: true,
          },
          orderBy: {
            firstName: "asc",
          },
        },
        tccs: {
          where: {
            deletedAt: null, // Only include non-deleted TCCs
          },
          select: {
            id: true,
            title: true,
            type: true,
            year: true,
            createdAt: true,
            author: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            students: {
              where: {
                deletedAt: null, // Only count non-deleted students
              },
            },
            tccs: {
              where: {
                deletedAt: null, // Only count non-deleted TCCs
              },
            },
          },
        },
      },
    });

    if (!course) {
      res.status(404).json({
        success: false,
        message: "Curso não encontrado",
      });
      return;
    }

    res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error(`Error fetching course ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar curso",
      error,
    });
  }
}

// Create a new course
export async function createCourse(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const { name, coordinatorId } = req.body;
  const requestingUser = req.user;

  if (!requestingUser) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  try {
    const newCourse = await db.course.create({
      data: {
        name,
        coordinatorId,
      },
      include: {
        _count: {
          select: { students: true, tccs: true },
        },
        coordinator: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });
    res.status(201).json({
      success: true,
      message: "Curso criado com sucesso",
      course: newCourse,
    });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar curso",
      error,
    });
  }
}

// Update a course
export async function updateCourse(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const { name, coordinatorId } = req.body;
  const requestingUser = req.user;

  if (!requestingUser) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  try {
    const updatedCourse = await db.course.update({
      where: { id },
      data: {
        name,
        coordinatorId,
      },
      include: {
        _count: {
          select: { students: true, tccs: true },
        },
        coordinator: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });
    res.status(200).json({
      success: true,
      message: "Curso atualizado com sucesso",
      course: updatedCourse,
    });
  } catch (error) {
    console.error(`Error updating course ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar curso",
      error,
    });
  }
}

// Delete a course
export async function deleteCourse(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const requestingUser = req.user;

  if (!requestingUser) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  try {
    await db.course.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    res.status(200).json({
      success: true,
      message: "Curso deletado com sucesso",
    });
  } catch (error) {
    console.error(`Error deleting course ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Erro ao deletar curso",
      error,
    });
  }
}
