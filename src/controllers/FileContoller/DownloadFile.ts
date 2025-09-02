import { Request, Response } from "express";
import { db } from "../../lib/db";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import { Readable } from "stream";

import s3 from "../../lib/s3";

export async function downloadFile(req: Request, res: Response): Promise<void> {
  try {
    const fileId = req.params.id;

    // Buscar o arquivo no banco de dados
    const file = await db.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      res.status(404).json({
        success: false,
        message: "File not found",
      });
      return;
    }

    // Configuração para acesso ao S3
    const BUCKET_NAME = process.env.BUCKET_NAME;

    // Normalizar o caminho do arquivo para o formato correto do S3
    const s3Key = file.filename;

    try {
      // Obter o arquivo do S3
      const { Body, ContentType } = await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
        })
      );

      if (!Body) {
        throw new Error("Could not retrieve file content from S3");
      }

      // Configurar cabeçalhos da resposta
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.displayName || file.filename}"`
      );
      res.setHeader("Content-Type", ContentType || file.type);

      try {
        await db.accessHistory.create({
          data: {
            file_id: file.id,
            accessed_at: new Date(),
            action_performed: "DOWNLOAD_FILE",
            accessed_by: (req as any).user?.id || null,
          },
        });
      } catch (logError) {
        // Continuar mesmo se o registro de log falhar
        console.error("Failed to log download history:", logError);
      }

      // Transmitir o conteúdo do arquivo para o cliente
      if (Body instanceof Readable) {
        // Se Body for um stream (Readable)
        Body.pipe(res);
      } else if (Body instanceof Blob) {
        // Se Body for um Blob
        // Se Body for um Blob
        const blobStream: any = Body.stream();

        // Converter ReadableStream da Web API para Node.js Readable
        const nodeReadable = Readable.fromWeb(blobStream);

        // Agora podemos usar pipe
        nodeReadable.pipe(res);
      } else {
        // Outros tipos (como Buffer ou string)
        res.send(Body);
      }
    } catch (s3Error: any) {
      console.error(`Error retrieving file from S3: ${s3Error.message}`);

      if (s3Error.name === "NoSuchKey") {
        res.status(404).json({
          success: false,
          message: "File exists in database but not found in storage",
          error: "S3 object not found",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Error downloading file from S3",
          error: s3Error.message,
        });
      }
    }
  } catch (error: any) {
    console.error("Error in downloadFile:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
