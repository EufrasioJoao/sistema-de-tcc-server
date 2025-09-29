import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import { UserRoles } from "@prisma/client";
import { db } from "../lib/db";

// Role-based access control middleware
export const requireRole = (allowedRoles: UserRoles[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Acesso negado. Permissões insuficientes.",
      });
    }

    next();
  };
};

// Check if user can access TCC based on their role and course coordination
export const canAccessTCC = async (userId: string, tccId: string): Promise<boolean> => {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, organization_id: true },
    });

    if (!user) return false;

    // ADMIN and SISTEM_MANAGER have full access
    if (user.role === UserRoles.ADMIN || user.role === UserRoles.SISTEM_MANAGER) {
      return true;
    }

    // Get TCC with course information
    const tcc = await db.tCC.findFirst({
      where: {
        id: tccId,
        deletedAt: null,
      },
      include: {
        course: {
          select: {
            coordinatorId: true,
            coordinator: {
              select: {
                organization_id: true,
              },
            },
          },
        },
      },
    });

    if (!tcc) return false;

    // Check organization access
    if (tcc.course.coordinator?.organization_id !== user.organization_id) {
      return false;
    }

    // COURSE_COORDENATOR can only access TCCs from their coordinated courses
    if (user.role === UserRoles.COURSE_COORDENATOR) {
      return tcc.course.coordinatorId === userId;
    }

    // ACADEMIC_REGISTER can access all TCCs in their organization
    if (user.role === UserRoles.ACADEMIC_REGISTER) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking TCC access:", error);
    return false;
  }
};

// Check if user can modify TCC (create, edit, delete)
export const canModifyTCC = async (userId: string, tccId?: string): Promise<boolean> => {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    // ADMIN and SISTEM_MANAGER can modify all TCCs
    if (user.role === UserRoles.ADMIN || user.role === UserRoles.SISTEM_MANAGER) {
      return true;
    }

    // For existing TCC, check specific access
    if (tccId) {
      // COURSE_COORDENATOR can modify TCCs from their courses
      if (user.role === UserRoles.COURSE_COORDENATOR) {
        return await canAccessTCC(userId, tccId);
      }

      // ACADEMIC_REGISTER can only edit, not delete
      if (user.role === UserRoles.ACADEMIC_REGISTER) {
        return await canAccessTCC(userId, tccId);
      }
    } else {
      // For creating new TCCs
      if (user.role === UserRoles.COURSE_COORDENATOR || user.role === UserRoles.ACADEMIC_REGISTER) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking TCC modification rights:", error);
    return false;
  }
};

// Check if user can delete TCC
export const canDeleteTCC = async (userId: string, tccId: string): Promise<boolean> => {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    // Only ADMIN and SISTEM_MANAGER can delete TCCs
    if (user.role === UserRoles.ADMIN || user.role === UserRoles.SISTEM_MANAGER) {
      return await canAccessTCC(userId, tccId);
    }

    return false;
  } catch (error) {
    console.error("Error checking TCC deletion rights:", error);
    return false;
  }
};

// Check file download permissions
export const canDownloadFile = async (userId: string, fileId: string): Promise<boolean> => {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, organization_id: true },
    });

    if (!user) return false;

    // Check if file belongs to a TCC the user can access
    const file = await db.file.findFirst({
      where: {
        id: fileId,
        organization_id: user.organization_id,
        deleted_at: null,
      },
      include: {
        tcc: {
          select: { id: true },
        },
        defenseRecordForTcc: {
          select: { id: true },
        },
      },
    });

    if (!file) return false;

    // If file is associated with a TCC, check TCC access
    const tccId = file.tcc?.id || file.defenseRecordForTcc?.id;
    if (tccId) {
      return await canAccessTCC(userId, tccId);
    }

    // For other files, check role-based access
    return user.role === UserRoles.ADMIN || user.role === UserRoles.SISTEM_MANAGER;
  } catch (error) {
    console.error("Error checking file download permissions:", error);
    return false;
  }
};

// Middleware to check TCC access
export const requireTCCAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  const hasAccess = await canAccessTCC(userId, id);
  if (!hasAccess) {
    res.status(403).json({
      success: false,
      message: "Acesso negado a este TCC",
    });
    return;
  }

  next();
};

// Middleware to check TCC modification rights
export const requireTCCModifyAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  const canModify = await canModifyTCC(userId, id);
  if (!canModify) {
    res.status(403).json({
      success: false,
      message: "Sem permissão para modificar este TCC",
    });
    return;
  }

  next();
};

// Middleware to check TCC deletion rights
export const requireTCCDeleteAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  const canDelete = await canDeleteTCC(userId, id);
  if (!canDelete) {
    res.status(403).json({
      success: false,
      message: "Sem permissão para excluir este TCC",
    });
    return;
  }

  next();
};
