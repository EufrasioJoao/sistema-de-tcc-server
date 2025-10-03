import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { AuditService } from "../services/auditService";
import { AccessHistoryAction, UserRoles } from "@prisma/client";
import { db } from "../lib/db";

/**
 * Get audit logs for administrators
 */
export async function getAuditLogs(
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

    // Get user organization
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

    // Only ADMIN and SISTEM_MANAGER can view audit logs
    if (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SISTEM_MANAGER) {
      res.status(403).json({
        success: false,
        message: "Acesso negado. Apenas administradores podem visualizar logs de auditoria",
      });
      return;
    }

    // Extract query parameters
    const {
      page = "1",
      limit = "50",
      userId,
      fileId,
      action,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const filters: any = {};
    if (userId) filters.userId = userId as string;
    if (fileId) filters.fileId = fileId as string;
    if (action) filters.action = action as AccessHistoryAction;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    // Get audit logs
    const auditLogs = await AuditService.getAuditLogs(
      user.organization_id,
      filters,
      limitNum
    );

    // Get total count for pagination
    const totalCount = await db.accessHistory.count({
      where: {
        user: {
          organization_id: user.organization_id,
        },
        ...(filters.userId && { accessed_by: filters.userId }),
        ...(filters.fileId && { file_id: filters.fileId }),
        ...(filters.action && { action_performed: filters.action }),
        ...(filters.startDate || filters.endDate) && {
          accessed_at: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        auditLogs: auditLogs.slice(skip, skip + limitNum),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

/**
 * Get audit statistics for dashboard
 */
export async function getAuditStatistics(
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

    // Only ADMIN and SISTEM_MANAGER can view audit statistics
    if (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SISTEM_MANAGER) {
      res.status(403).json({
        success: false,
        message: "Acesso negado",
      });
      return;
    }

    const { days = "30" } = req.query;
    const daysNum = parseInt(days as string);

    const statistics = await AuditService.getAuditStatistics(
      user.organization_id,
      daysNum
    );

    // Get time series data for charts
    const timeSeriesData = await AuditService.getAuditTimeSeriesData(
      user.organization_id,
      daysNum
    );

    res.json({
      success: true,
      data: {
        ...statistics,
        timeSeriesData,
      },
    });
  } catch (error) {
    console.error("Error fetching audit statistics:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;
    const { userId } = req.params;

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

    // Check if requesting user can view this user's audit logs
    const canViewUserAudit =
      user.role === UserRoles.ADMIN ||
      user.role === UserRoles.SISTEM_MANAGER ||
      requestingUser.id === userId; // Users can view their own logs

    if (!canViewUserAudit) {
      res.status(403).json({
        success: false,
        message: "Acesso negado",
      });
      return;
    }

    // Verify target user exists and belongs to same organization
    const targetUser = await db.user.findFirst({
      where: {
        id: userId,
        organization_id: user.organization_id,
      },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    const { limit = "50" } = req.query;
    const limitNum = Math.min(parseInt(limit as string), 100);

    const auditLogs = await AuditService.getUserAuditLogs(userId, limitNum);

    res.json({
      success: true,
      data: {
        user: {
          id: targetUser.id,
          firstName: targetUser.first_name,
          lastName: targetUser.last_name,
          email: targetUser.email,
          role: targetUser.role,
        },
        auditLogs,
      },
    });
  } catch (error) {
    console.error("Error fetching user audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

/**
 * Get audit logs for a specific file
 */
export async function getFileAuditLogs(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;
    const { fileId } = req.params;

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

    // Only ADMIN and SISTEM_MANAGER can view file audit logs
    if (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SISTEM_MANAGER) {
      res.status(403).json({
        success: false,
        message: "Acesso negado",
      });
      return;
    }

    // Verify file exists and belongs to same organization
    const file = await db.file.findFirst({
      where: {
        id: fileId,
        organization_id: user.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        filename: true,
        displayName: true,
        tcc: {
          select: {
            id: true,
            title: true,
          },
        },
        defenseRecordForTcc: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!file) {
      res.status(404).json({
        success: false,
        message: "Arquivo não encontrado",
      });
      return;
    }

    const { limit = "50" } = req.query;
    const limitNum = Math.min(parseInt(limit as string), 100);

    const auditLogs = await AuditService.getFileAuditLogs(fileId, limitNum);

    res.json({
      success: true,
      data: {
        file,
        auditLogs,
      },
    });
  } catch (error) {
    console.error("Error fetching file audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}
