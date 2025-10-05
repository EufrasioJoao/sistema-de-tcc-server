import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { backupDatabase } from "../scripts/backup";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import env from "../config/env";

const prisma = new PrismaClient();

// Get backup history
export const getBackupHistory = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Filters
        const status = req.query.status as string;
        const search = req.query.search as string;
        const sortBy = req.query.sortBy as string || 'created_at';
        const sortOrder = req.query.sortOrder as string || 'desc';

        // Build where clause
        const where: any = {};

        if (status && status !== 'all') {
            where.status = status;
        }

        if (search) {
            where.filename = {
                contains: search,
            };
        }

        // Build orderBy clause
        const orderBy: any = {};
        orderBy[sortBy] = sortOrder;

        const [backups, total] = await Promise.all([
            prisma.backup.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                select: {
                    id: true,
                    filename: true,
                    status: true,
                    file_size: true,
                    created_at: true,
                    completed_at: true,
                    started_at: true,
                    error_message: true,
                },
            }),
            prisma.backup.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: {
                backups: backups.map((backup) => ({
                    ...backup,
                    file_size: backup.file_size ? Number(backup.file_size) : null,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            },
        });
    } catch (error) {
        console.error("Error fetching backup history:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor",
        });
    }
};

// Create new backup
export const createBackup = async (req: Request, res: Response) => {
    try {
        // Check if there's already a backup in progress
        const inProgressBackup = await prisma.backup.findFirst({
            where: {
                status: "IN_PROGRESS",
            },
        });

        if (inProgressBackup) {
            res.status(400).json({
                success: false,
                message: "Já existe um backup em andamento",
            });
            return
        }

        // Start backup process asynchronously
        backupDatabase().catch((error) => {
            console.error("Backup process failed:", error);
        });

        res.json({
            success: true,
            message: "Backup iniciado com sucesso",
        });
        return
    } catch (error) {
        console.error("Error starting backup:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor",
        });
        return
    }
};

// Download backup file
export const downloadBackup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const backup = await prisma.backup.findUnique({
            where: { id },
        });

        if (!backup) {
            res.status(404).json({
                success: false,
                message: "Backup não encontrado",
            }); return
        }

        if (backup.status !== "COMPLETED") {
            res.status(400).json({
                success: false,
                message: "Backup não está completo",
            }); return
        }

        if (!backup.s3_key) {
            res.status(400).json({
                success: false,
                message: "Arquivo de backup não encontrado",
            }); return
        }

        // Generate signed URL for S3 download
        const s3 = new S3Client({
            region: env.AWS_S3_BUCKET_REGION,
            credentials: {
                accessKeyId: env.AWS_ACCESS_KEY,
                secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            },
        });

        const command = new GetObjectCommand({
            Bucket: env.AWS_S3_BUCKET_NAME,
            Key: backup.s3_key,
        });

        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour

        res.json({
            success: true,
            data: {
                downloadUrl: signedUrl,
                filename: backup.filename,
            },
        });
    } catch (error) {
        console.error("Error generating download URL:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor",
        }); return
    }
};