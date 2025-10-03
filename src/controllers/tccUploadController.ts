import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { db } from "../lib/db";
import { TccType } from "@prisma/client";
import { uploadTCCFiles } from "../services/fileUploadService";
import { UploadedFile } from "express-fileupload";
import { AuditService } from "../services/auditService";

/**
 * Create TCC with file upload using form data
 */
export async function createTCCWithUpload(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const requestingUser = req.user;

  if (!requestingUser) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  try {
    // Extract form data
    const { title, year, keywords, type, authorId, supervisorId, courseId } =
      req.body;

    // Get uploaded files from express-fileupload
    const files = req.files;
    const tccFile = files?.tccFile as UploadedFile;
    const defenseFile = files?.defenseFile as UploadedFile;

    if (!tccFile) {
      res.status(400).json({
        success: false,
        message: "Arquivo do TCC é obrigatório",
      });
      return;
    }

    // Get user's organization
    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true },
    });

    if (!user?.organization_id) {
      res.status(400).json({
        success: false,
        message: "Usuário não possui organização associada",
      });
      return;
    }

    // Verify all related entities belong to the user's organization
    const [student, supervisor, course] = await Promise.all([
      db.student.findFirst({
        where: {
          id: authorId,
          course: {
            coordinator: {
              organization_id: user.organization_id,
            },
          },
          deletedAt: null,
        },
      }),
      db.user.findFirst({
        where: {
          id: supervisorId,
          organization_id: user.organization_id,
          deleted_at: null,
        },
      }),
      db.course.findFirst({
        where: {
          id: courseId,
          coordinator: {
            organization_id: user.organization_id,
          },
          deletedAt: null,
        },
      }),
    ]);

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Estudante não encontrado ou não pertence à sua organização",
      });
      return;
    }

    if (!supervisor) {
      res.status(404).json({
        success: false,
        message: "Supervisor não encontrado ou não pertence à sua organização",
      });
      return;
    }

    if (!course) {
      res.status(404).json({
        success: false,
        message: "Curso não encontrado ou não pertence à sua organização",
      });
      return;
    }

    // Upload files to S3
    const uploadResult = await uploadTCCFiles({
      tccFile,
      defenseFile,
      organizationId: user.organization_id,
      tccType: type as TccType,
      year: parseInt(year),
      uploadedBy: requestingUser.id,
    });

    // Create TCC record in database
    const newTCC = await db.tCC.create({
      data: {
        title,
        year: parseInt(year),
        keywords: keywords || null,
        type: type as TccType,
        authorId,
        supervisorId,
        courseId,
        fileId: uploadResult.tccFile.id,
        defenseRecordFileId: uploadResult.defenseFile?.id || null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentNumber: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        file: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            size: true,
            created_at: true,
          },
        },
        defenseRecordFile: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            size: true,
            created_at: true,
          },
        },
      },
    });

    await db.organization.update({
      where: { id: user.organization_id },
      data: {
        UsedStorage: {
          increment: (uploadResult.tccFile.size || 0) + (uploadResult.defenseFile?.size || 0)
        }
      }
    })

    // Log TCC upload audit
    await AuditService.logTCCUpload(requestingUser.id, uploadResult.tccFile.id, newTCC.id);
    if (uploadResult.defenseFile) {
      await AuditService.logTCCUpload(requestingUser.id, uploadResult.defenseFile.id, newTCC.id);
    }

    res.status(201).json({
      success: true,
      message: "TCC criado com sucesso",
      tcc: newTCC,
      uploadInfo: {
        tccFileUrl: uploadResult.tccFile.s3Url,
        defenseFileUrl: uploadResult.defenseFile?.s3Url,
      },
    });
  } catch (error: any) {
    console.error("Error creating TCC with upload:", error);

    // Handle specific multer errors
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        message: "Arquivo muito grande. Tamanho máximo: 50MB",
      });
      return;
    }

    if (error.message.includes("Only PDF files are allowed")) {
      res.status(400).json({
        success: false,
        message: "Apenas arquivos PDF são permitidos",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || "Erro ao criar TCC",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}

/**
 * Update TCC defense record file
 */
export async function updateTCCDefenseRecord(
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
    // Get uploaded file from express-fileupload
    const files = req.files;
    const defenseFile = files?.defenseFile as UploadedFile;

    if (!defenseFile) {
      res.status(400).json({
        success: false,
        message: "Arquivo de ata de defesa é obrigatório",
      });
      return;
    }

    // Get user's organization
    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true },
    });

    if (!user?.organization_id) {
      res.status(400).json({
        success: false,
        message: "Usuário não possui organização associada",
      });
      return;
    }

    // Verify TCC belongs to user's organization
    const tcc = await db.tCC.findFirst({
      where: {
        id,
        course: {
          coordinator: {
            organization_id: user.organization_id,
          },
        },
        deletedAt: null,
      },
    });

    if (!tcc) {
      res.status(404).json({
        success: false,
        message: "TCC não encontrado ou não pertence à sua organização",
      });
      return;
    }

    // Upload defense record file
    const uploadResult = await uploadTCCFiles({
      tccFile: defenseFile, // We'll use this as defense file
      organizationId: user.organization_id,
      tccType: tcc.type,
      year: tcc.year,
      uploadedBy: requestingUser.id,
    });

    // Update TCC with defense record file
    const updatedTCC = await db.tCC.update({
      where: { id },
      data: {
        defenseRecordFileId: uploadResult.tccFile.id, // Using tccFile result for defense record
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentNumber: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        file: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            size: true,
            created_at: true,
          },
        },
        defenseRecordFile: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            size: true,
            created_at: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Ata de defesa atualizada com sucesso",
      tcc: updatedTCC,
      uploadInfo: {
        defenseFileUrl: uploadResult.tccFile.s3Url,
      },
    });
  } catch (error: any) {
    console.error("Error updating TCC defense record:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Erro ao atualizar ata de defesa",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}

