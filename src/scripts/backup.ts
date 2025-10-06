import { exec } from "child_process";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs";
import { promisify } from "util";
import os from "os";
import path from "path";
import dotenv from "dotenv";
import env from "../config/env";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function backupDatabase() {
  const environment = env.ENVIRONMENT;

  if (environment !== "production") {
    console.log("Backup is only allowed in production environment.");
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");

  const backupFileName = `backup-${year}-${month}-${day}.sql`;
  const backupFilePath = path.join(os.tmpdir(), backupFileName);
  const s3Key = `database-backup/${year}/${month}/${day}/${backupFileName}`;

  const dbUrl = new URL(env.DATABASE_URL!);
  const dbName = dbUrl.pathname.slice(1);

  // Create backup record
  const backupRecord = await prisma.backup.create({
    data: {
      filename: backupFileName,
      s3_key: s3Key,
      status: "IN_PROGRESS",
    },
  });

  try {
    console.log("Starting database backup...");

    const mysqldumpCommand =
      os.platform() === "win32"
        ? `"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe"`
        : "mysqldump";

    await execAsync(
      `${mysqldumpCommand} --user=${dbUrl.username} --password=${dbUrl.password} --host=${dbUrl.hostname} ${dbName} > ${backupFilePath}`
    );

    console.log("Database dump created successfully.");

    const fileStats = fs.statSync(backupFilePath);
    const fileStream = fs.createReadStream(backupFilePath);

    // Configuração para acesso ao S3
    const s3 = new S3Client({
      region: env.AWS_S3_BUCKET_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileStream,
      })
    );

    const s3Url = `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_S3_BUCKET_REGION}.amazonaws.com/${s3Key}`;

    // Update backup record as completed
    await prisma.backup.update({
      where: { id: backupRecord.id },
      data: {
        status: "COMPLETED",
        s3_url: s3Url,
        file_size: BigInt(fileStats.size),
        completed_at: new Date(),
      },
    });

    console.log(`Backup successfully uploaded to S3: ${s3Key}`);

    fs.unlinkSync(backupFilePath);
    console.log("Local backup file deleted.");
  } catch (error) {
    console.error("Failed to backup database:", error);

    // Update backup record as failed
    await prisma.backup.update({
      where: { id: backupRecord.id },
      data: {
        status: "FAILED",
        error_message: error instanceof Error ? error.message : String(error),
        completed_at: new Date(),
      },
    });

    if (fs.existsSync(backupFilePath)) {
      fs.unlinkSync(backupFilePath);
    }
  } finally {
    await prisma.$disconnect();
  }
}

export { backupDatabase };
