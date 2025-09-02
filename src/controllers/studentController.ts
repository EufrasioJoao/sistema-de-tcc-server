import { db } from "../lib/db";
import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";

// Get all students
export async function getAllStudents(req: AuthRequest, res: Response): Promise<void> {
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
      select: { organization_id: true },
    });

    const students = await db.student.findMany({
      where: {
        course: {
          coordinator: {
            organization_id: user?.organization_id,
          },
        },
        deletedAt: null, // Filter out soft deleted students
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            tccs: {
              where: {
                deletedAt: null, // Only count non-deleted TCCs
              },
            },
          },
        },
      },
      orderBy: {
        firstName: "asc",
      },
    });

    res.status(200).json({
      success: true,
      message: "Estudantes recuperados com sucesso",
      students,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

// Get student by ID
export async function getStudentById(
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

    const student = await db.student.findFirst({
      where: { 
        id,
        course: {
          coordinator: {
            organization_id: user?.organization_id,
          },
        },
        deletedAt: null, // Filter out soft deleted students
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
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
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            tccs: {
              where: {
                deletedAt: null, // Only count non-deleted TCCs
              },
            },
          },
        },
      },
    });

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Estudante não encontrado",
      });
      return;
    }

    res.status(200).json({
      success: true,
      student,
    });
  } catch (error) {
    console.error(`Error fetching student ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar estudante",
      error,
    });
  }
}

// Create a new student
export async function createStudent(req: AuthRequest, res: Response): Promise<void> {
  const { firstName, lastName, email, studentNumber, courseId } = req.body;
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

    // Verify the course belongs to the user's organization
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        coordinator: {
          organization_id: user?.organization_id,
        },
        deletedAt: null,
      },
    });

    if (!course) {
      res.status(404).json({
        success: false,
        message: "Curso não encontrado ou não pertence à sua organização",
      });
      return;
    }

    // Check if email or student number already exists
    const existingStudent = await db.student.findFirst({
      where: {
        OR: [
          { email },
          { studentNumber },
        ],
        deletedAt: null,
      },
    });

    if (existingStudent) {
      const field = existingStudent.email === email ? "email" : "matrícula";
      res.status(400).json({
        success: false,
        message: `Já existe um estudante com este ${field}`,
      });
      return;
    }

    const newStudent = await db.student.create({
      data: {
        firstName,
        lastName,
        email,
        studentNumber,
        courseId,
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
          },
        },
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
    });

    res.status(201).json({
      success: true,
      message: "Estudante criado com sucesso",
      student: newStudent,
    });
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar estudante",
      error,
    });
  }
}

// Update a student
export async function updateStudent(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { firstName, lastName, email, studentNumber, courseId } = req.body;
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

    // Verify the student belongs to the user's organization
    const existingStudent = await db.student.findFirst({
      where: {
        id,
        course: {
          coordinator: {
            organization_id: user?.organization_id,
          },
        },
        deletedAt: null,
      },
    });

    if (!existingStudent) {
      res.status(404).json({
        success: false,
        message: "Estudante não encontrado ou não pertence à sua organização",
      });
      return;
    }

    // Verify the new course belongs to the user's organization
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        coordinator: {
          organization_id: user?.organization_id,
        },
        deletedAt: null,
      },
    });

    if (!course) {
      res.status(404).json({
        success: false,
        message: "Curso não encontrado ou não pertence à sua organização",
      });
      return;
    }

    // Check if email or student number already exists (excluding current student)
    const duplicateStudent = await db.student.findFirst({
      where: {
        OR: [
          { email },
          { studentNumber },
        ],
        NOT: { id },
        deletedAt: null,
      },
    });

    if (duplicateStudent) {
      const field = duplicateStudent.email === email ? "email" : "matrícula";
      res.status(400).json({
        success: false,
        message: `Já existe outro estudante com este ${field}`,
      });
      return;
    }

    const updatedStudent = await db.student.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        studentNumber,
        courseId,
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
          },
        },
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
    });

    res.status(200).json({
      success: true,
      message: "Estudante atualizado com sucesso",
      student: updatedStudent,
    });
  } catch (error) {
    console.error(`Error updating student ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar estudante",
      error,
    });
  }
}

// Delete a student (soft delete)
export async function deleteStudent(req: AuthRequest, res: Response): Promise<void> {
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

    // Verify the student belongs to the user's organization
    const student = await db.student.findFirst({
      where: {
        id,
        course: {
          coordinator: {
            organization_id: user?.organization_id,
          },
        },
        deletedAt: null,
      },
    });

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Estudante não encontrado ou não pertence à sua organização",
      });
      return;
    }

    // Soft delete the student and their TCCs
    await db.$transaction([
      // Soft delete all TCCs of the student
      db.tCC.updateMany({
        where: {
          authorId: id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      }),
      // Soft delete the student
      db.student.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Estudante removido com sucesso",
    });
  } catch (error) {
    console.error(`Error deleting student ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover estudante",
      error,
    });
  }
}
