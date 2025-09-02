import { Request, Response } from "express";
import { db } from "../../lib/db";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import s3 from "../../lib/s3";

export async function getFileById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Buscar o arquivo no banco de dados
    const file = await db.file.findUnique({
      where: { id: id },
    });

    if (!file) {
      res.status(404).json({ success: false, message: "File not found" });
      return;
    }

    // Configuração para acesso ao S3
    const BUCKET_NAME = process.env.BUCKET_NAME;

    // Normalizar o caminho do arquivo para o formato correto do S3
    const s3Key = file.filename;

    try {
      // Criar comando para gerar URL pré-assinada
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });

      // Gerar URL pré-assinada com validade de 1 hora (3600 segundos)
      const presignedUrl = await getSignedUrl(s3, command, {
        expiresIn: 3600,
      });

      // Verificar se o arquivo existe no S3
      try {
        // Opcional: verificar se o arquivo existe no S3
        await s3.send(
          new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
          })
        );
      } catch (headError) {
        // Se o arquivo não existir no S3, ainda retorna os metadados,
        // mas com uma flag indicando que o conteúdo não está disponível
        res.status(200).json({
          success: true,
          message: "File metadata found, but content unavailable in storage",
          file: {
            ...file,
            presignedUrl: null,
            contentAvailable: false,
          },
        });

        return;
      }

      // Retornar o arquivo com a URL pré-assinada
      res.status(200).json({
        success: true,
        message: "File fetched successfully",
        file: {
          ...file,
          presignedUrl,
          contentAvailable: true,
        },
      });
    } catch (s3Error: any) {
      // Em caso de erro no S3, ainda retorna os metadados do arquivo
      console.error(`S3 error for file ${id}:`, s3Error);
      res.status(200).json({
        success: true,
        message: "File metadata fetched, but S3 access failed",
        file,
        s3Error: s3Error.message || "Failed to generate access URL",
      });
    }
  } catch (error: any) {
    console.error("Error in getFileById:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching file",
      error: error.message,
    });
  }
}
