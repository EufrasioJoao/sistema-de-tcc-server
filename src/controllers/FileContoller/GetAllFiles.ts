import { Request, Response } from "express";
import { db } from "../../lib/db";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import s3 from "../../lib/s3";

export async function getAllFiles(req: Request, res: Response): Promise<void> {
  try {
    const files = await db.file.findMany({
      orderBy: {
        filename: "asc",
      },
    });

    if (!files || files.length === 0) {
      res.status(404).json({ success: false, message: "No files uploaded" });
      return;
    }

    const BUCKET_NAME = process.env.BUCKET_NAME;

    const filesWithPresignedUrls = await Promise.all(
      files.map(async (file) => {
        // Construir a chave S3 consistente com o método de upload
        const s3Key = file.filename;

        // Criar comando para gerar URL pré-assinado
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
        });

        try {
          // Gerar URL pré-assinado válido por 1 hora (3600 segundos)
          const presignedUrl = await getSignedUrl(s3, command, {
            expiresIn: 3600,
          });

          return {
            ...file,
            presignedUrl,
          };
        } catch (s3Error) {
          console.error(
            `Error generating presigned URL for file ${file.id}:`,
            s3Error
          );
          return {
            ...file,
            presignedUrl: null,
            s3Error: "Failed to generate access URL",
          };
        }
      })
    );

    res.status(200).json({
      success: true,
      message: "Files fetched successfuly",
      files: filesWithPresignedUrls,
    });
  } catch (error: any) {
    console.error("Error in getfolderById:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching folder",
      error: error.message,
    });
  }
}
