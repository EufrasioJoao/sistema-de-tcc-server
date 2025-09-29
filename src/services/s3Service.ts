import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import env from "../config/env";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Initialize S3 client
const s3Client = new S3Client({
  region: env.AWS_S3_BUCKET_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export interface UploadFileParams {
  file: Buffer;
  fileName: string;
  mimeType: string;
  organizationId: string;
  fileType: 'tcc' | 'defense-record' | 'document' | 'other';
}

export interface UploadResult {
  key: string;
  url: string;
  fileName: string;
  size: number;
}

/**
 * Upload file to S3 with organized folder structure
 */
export async function uploadFileToS3(params: UploadFileParams): Promise<UploadResult> {
  const { file, fileName, mimeType, organizationId, fileType } = params;
  
  // Generate unique file name to avoid conflicts
  const fileExtension = path.extname(fileName);
  const uniqueFileName = `${uuidv4()}${fileExtension}`;
  
  // Create organized folder structure
  const key = `organizations/${organizationId}/${fileType}/${new Date().getFullYear()}/${uniqueFileName}`;
  
  const uploadParams = {
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: mimeType,
    Metadata: {
      originalName: fileName,
      organizationId: organizationId,
      fileType: fileType,
      uploadDate: new Date().toISOString(),
    },
  };

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const url = `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_S3_BUCKET_REGION}.amazonaws.com/${key}`;

    return {
      key,
      url,
      fileName: uniqueFileName,
      size: file.length,
    };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw new Error("Failed to upload file to S3");
  }
}

/**
 * Delete file from S3
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  const deleteParams = {
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new Error("Failed to delete file from S3");
  }
}

/**
 * Generate presigned URL for file download
 */
export async function generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const getParams = {
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new GetObjectCommand(getParams);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new Error("Failed to generate download URL");
  }
}

/**
 * Get file metadata from S3
 */
export async function getFileMetadata(key: string) {
  const params = {
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    };
  } catch (error) {
    console.error("Error getting file metadata:", error);
    throw new Error("Failed to get file metadata");
  }
}

/**
 * Validate file type and size
 */
export function validateFile(file: any, allowedTypes: string[] = ['application/pdf'], maxSize: number = 50 * 1024 * 1024): boolean {
  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Check file size (50MB default)
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
  }

  return true;
}

/**
 * Generate file path for different TCC types
 */
export function generateTCCFilePath(organizationId: string, tccType: 'BACHELOR' | 'MASTER' | 'DOCTORATE', year: number, isDefenseRecord: boolean = false): string {
  const typeFolder = {
    'BACHELOR': 'monografias',
    'MASTER': 'dissertacoes',
    'DOCTORATE': 'teses'
  };

  const fileTypeFolder = isDefenseRecord ? 'atas-defesa' : 'documentos';
  
  return `organizations/${organizationId}/tccs/${typeFolder[tccType]}/${year}/${fileTypeFolder}`;
}
