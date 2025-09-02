import { Request, Response } from "express";
import { db } from "../../lib/db";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import s3 from "../../lib/s3";

export async function deleteFile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const file = await db.file.findUnique({ where: { id } });

    if (!file) {
      res
        .status(404)
        .json({ success: false, message: "Arquivo não encontradado!" });
      return;
    }

    // Configuração para acesso ao S3
    const BUCKET_NAME = process.env.BUCKET_NAME;

    // Normalizar o caminho do arquivo para o formato correto do S3
    const s3Key = file.filename;

    try {
      // Deletar o arquivo do S3
      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
        })
      );

      // Use a transaction to ensure atomicity
      await db.$transaction(async (prisma) => {
        // Delete related records first to avoid foreign key constraint violations

        // Delete access history associated with the file
        await prisma.accessHistory.deleteMany({
          where: { file_id: file.id },
        });

        // After deleting related records, delete the file itself
        await prisma.file.delete({ where: { id: file.id } });
      });

      res.status(200).json({
        success: true,
        message: "Arquivo deletado com sucesso do banco de dados e do S3",
      });
    } catch (s3Error: any) {
      console.error(`Erro ao deletar arquivo do S3: ${s3Error.message}`);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao deletar arquivo",
      error: error.message,
    });
  }
}
