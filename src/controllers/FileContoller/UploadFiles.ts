import { Response } from "express";
import { db } from "../../lib/db";
import z from "zod";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import s3 from "../../lib/s3";

const fileUploadSchema = z.object({
  files: z.any(),
  folder_id: z.string().uuid(), // ID da pasta associada
});

export async function uploadFiles(
  req: AuthRequest,
  res: Response
): Promise<void> {
  if (!req.files || Object.keys(req.files).length === 0) {
    res.status(400).json({
      success: false,
      message: "Error uploading files",
      error: "No files provided!",
    });
    return;
  }

  try {
    const { folder_id, files } = fileUploadSchema.parse({
      ...req.params,
      ...req.body,
      ...req.files,
    });

    // Ensure files are an array
    const fileArray = Array.isArray(files) ? files : [files];

    // Check if the folder exists
    const fileFolder = await db.folder.findUnique({
      where: { id: folder_id },
    });

    if (!fileFolder) {
      res.status(403).json({
        success: false,
        message: "Error uploading files",
        error: "Folder not found!",
      });
      return;
    }

    const user = req.user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        message: "Não autorizado: ID do usuário não encontrado",
      });
      return;
    }

    const uploadedFiles = await Promise.all(
      fileArray.map(async (file: any) => {
        // Decodifica o nome do arquivo para lidar com caracteres especiais
        const originalFilename = Buffer.from(file.name, "latin1").toString(
          "utf8"
        );
        const { mimetype, size, data } = file;

        // Generate unique filenames preserving special characters
        const timestamp = Date.now();
        const lastDotIndex = originalFilename.lastIndexOf(".");
        const baseName =
          lastDotIndex !== -1
            ? originalFilename.slice(0, lastDotIndex)
            : originalFilename;

        const extension =
          lastDotIndex !== -1 ? originalFilename.slice(lastDotIndex) : "";
        const newFileName = `${baseName}_${timestamp}${extension}`;
        const filePath = `${fileFolder?.path}/${newFileName}`;

        // Upload para S3
        const BUCKET_NAME = process.env.BUCKET_NAME;

        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: newFileName,
            Body: data,
            ContentType: mimetype,
          })
        );

        // Save file metadata to the database
        const uploadedFile = await db.file.create({
          data: {
            filename: newFileName,
            displayName: originalFilename,
            path: filePath,
            type: mimetype,
            size: size.toString(),
            uploaded_by: user.id,
            organization_id: fileFolder?.organization_id,
            folder_id: fileFolder?.id,
          },
        });

        // Log access history
        await db.accessHistory.create({
          data: {
            file_id: uploadedFile.id,
            accessed_at: new Date(),
            action_performed: "UPLOAD_FILE",
            accessed_by: user.id,
          },
        });

        // Add filesize info to usedstorage
        if (uploadedFile.size) {
          await db.organization.update({
            where: { id: fileFolder?.organization_id },
            data: {
              UsedStorage: {
                increment: parseFloat(uploadedFile.size),
              },
            },
          });
        }

        return uploadedFile;
      })
    );

    res.status(201).json({
      success: true,
      message: "Files uploaded successfully",
      files: uploadedFiles,
    });
  } catch (error: any) {
    console.error("File upload error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred.";
    res.status(500).json({
      success: false,
      message: "Error uploading files",
      error: errorMessage,
    });
  }
}
