import { db } from "../lib/db";
import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { registerUser } from "./UserController";

// Get all courses
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

    const courses = await db.course.findMany({
      where: {
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
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      message: "Cursos recuperados com sucesso",
      courses,
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
