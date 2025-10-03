import { db } from "../lib/db";
import { AccessHistoryAction } from "@prisma/client";

/**
 * Service for logging audit events in the TCC system
 */
export class AuditService {
  /**
   * Log a file access event
   */
  static async logFileAccess(
    userId: string,
    fileId: string,
    action: AccessHistoryAction,
    additionalInfo?: string
  ): Promise<void> {
    try {
      await db.accessHistory.create({
        data: {
          accessed_by: userId,
          file_id: fileId,
          action_performed: action,
          accessed_at: new Date(),
        },
      });

      console.log(`Audit: User ${userId} performed ${action} on file ${fileId}${additionalInfo ? ` - ${additionalInfo}` : ''}`);
    } catch (error) {
      console.error("Failed to log audit event:", error);
      // Don't throw error to avoid breaking the main functionality
    }
  }

  /**
   * Log TCC file view
   */
  static async logTCCView(userId: string, tccId: string, fileId: string): Promise<void> {
    await this.logFileAccess(userId, fileId, AccessHistoryAction.VIEW_FILE, `TCC: ${tccId}`);
  }

  /**
   * Log TCC file download
   */
  static async logTCCDownload(userId: string, tccId: string, fileId: string, fileType: 'main' | 'defense'): Promise<void> {
    await this.logFileAccess(userId, fileId, AccessHistoryAction.DOWNLOAD_FILE, `TCC: ${tccId} (${fileType} file)`);
  }

  /**
   * Log TCC file upload
   */
  static async logTCCUpload(userId: string, fileId: string, tccId?: string): Promise<void> {
    await this.logFileAccess(userId, fileId, AccessHistoryAction.UPLOAD_FILE, tccId ? `TCC: ${tccId}` : 'New TCC');
  }

  /**
   * Log TCC file edit/update
   */
  static async logTCCEdit(userId: string, tccId: string, fileId: string, action: string): Promise<void> {
    await this.logFileAccess(userId, fileId, AccessHistoryAction.EDIT_FILE, `TCC: ${tccId} - ${action}`);
  }

  /**
   * Get audit logs for a specific file
   */
  static async getFileAuditLogs(fileId: string, limit: number = 50) {
    return await db.accessHistory.findMany({
      where: {
        file_id: fileId,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
          },
        },
        file: {
          select: {
            id: true,
            filename: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        accessed_at: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditLogs(userId: string, limit: number = 50) {
    return await db.accessHistory.findMany({
      where: {
        accessed_by: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
          },
        },
        file: {
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
        },
      },
      orderBy: {
        accessed_at: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get comprehensive audit logs for administrators
   */
  static async getAuditLogs(
    organizationId: string,
    filters?: {
      userId?: string;
      fileId?: string;
      action?: AccessHistoryAction;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100
  ) {
    const whereClause: any = {
      user: {
        organization_id: organizationId,
      },
    };

    if (filters?.userId) {
      whereClause.accessed_by = filters.userId;
    }

    if (filters?.fileId) {
      whereClause.file_id = filters.fileId;
    }

    if (filters?.action) {
      whereClause.action_performed = filters.action;
    }

    if (filters?.startDate || filters?.endDate) {
      whereClause.accessed_at = {};
      if (filters.startDate) {
        whereClause.accessed_at.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.accessed_at.lte = filters.endDate;
      }
    }

    return await db.accessHistory.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
          },
        },
        file: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            tcc: {
              select: {
                id: true,
                title: true,
                author: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            defenseRecordForTcc: {
              select: {
                id: true,
                title: true,
                author: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        accessed_at: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get audit statistics for dashboard
   */
  static async getAuditStatistics(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await db.accessHistory.groupBy({
      by: ['action_performed'],
      where: {
        user: {
          organization_id: organizationId,
        },
        accessed_at: {
          gte: startDate,
        },
      },
      _count: {
        action_performed: true,
      },
    });

    const totalActions = await db.accessHistory.count({
      where: {
        user: {
          organization_id: organizationId,
        },
        accessed_at: {
          gte: startDate,
        },
      },
    });

    const uniqueUsers = await db.accessHistory.findMany({
      where: {
        user: {
          organization_id: organizationId,
        },
        accessed_at: {
          gte: startDate,
        },
      },
      select: {
        accessed_by: true,
      },
      distinct: ['accessed_by'],
    });

    return {
      totalActions,
      uniqueUsers: uniqueUsers.length,
      actionBreakdown: stats.reduce((acc, stat) => {
        acc[stat.action_performed] = stat._count.action_performed;
        return acc;
      }, {} as Record<string, number>),
      period: `${days} dias`,
    };
  }

  /**
   * Get time series data for audit charts
   */
  static async getAuditTimeSeriesData(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily activity data
    const dailyActivity = await db.$queryRaw<Array<{
      date: string;
      VIEW_FILE: number;
      DOWNLOAD_FILE: number;
      UPLOAD_FILE: number;
      EDIT_FILE: number;
      total: number;
    }>>`
      SELECT 
        DATE(accessed_at) as date,
        COUNT(CASE WHEN action_performed = 'VIEW_FILE' THEN 1 END) as VIEW_FILE,
        COUNT(CASE WHEN action_performed = 'DOWNLOAD_FILE' THEN 1 END) as DOWNLOAD_FILE,
        COUNT(CASE WHEN action_performed = 'UPLOAD_FILE' THEN 1 END) as UPLOAD_FILE,
        COUNT(CASE WHEN action_performed = 'EDIT_FILE' THEN 1 END) as EDIT_FILE,
        COUNT(*) as total
      FROM access_history ah
      JOIN users u ON ah.accessed_by = u.id
      WHERE u.organization_id = ${organizationId}
        AND ah.accessed_at >= ${startDate}
      GROUP BY DATE(accessed_at)
      ORDER BY DATE(accessed_at)
    `;

    // Get hourly activity for the last 24 hours
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const hourlyActivity = await db.$queryRaw<Array<{
      hour: string;
      actions: number;
    }>>`
      SELECT 
        HOUR(accessed_at) as hour,
        COUNT(*) as actions
      FROM access_history ah
      JOIN users u ON ah.accessed_by = u.id
      WHERE u.organization_id = ${organizationId}
        AND ah.accessed_at >= ${last24Hours}
      GROUP BY HOUR(accessed_at)
      ORDER BY HOUR(accessed_at)
    `;

    return {
      dailyActivity: dailyActivity.map(row => ({
        date: row.date,
        VIEW_FILE: Number(row.VIEW_FILE),
        DOWNLOAD_FILE: Number(row.DOWNLOAD_FILE),
        UPLOAD_FILE: Number(row.UPLOAD_FILE),
        EDIT_FILE: Number(row.EDIT_FILE),
        total: Number(row.total),
      })),
      hourlyActivity: hourlyActivity.map(row => ({
        hour: `${row.hour}:00`,
        actions: Number(row.actions),
      })),
    };
  }
}
