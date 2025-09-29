import { UploadedFile } from "express-fileupload";
import { uploadFileToS3, validateFile, generateTCCFilePath } from "./s3Service";
import { db } from "../lib/db";
import { TccType } from "@prisma/client";

export interface UploadTCCFileParams {
  file: UploadedFile;
  organizationId: string;
  tccType: TccType;
  year: number;
  isDefenseRecord?: boolean;
  uploadedBy: string;
  folderId?: string;
}

export interface UploadedFileResult {
  id: string;
  filename: string;
  displayName: string;
  size: number;
  mimetype: string;
  s3Key: string;
  s3Url: string;
  createdAt: Date;
}

/**
 * Upload TCC file to S3 and save metadata to database
 */
export async function uploadTCCFile(
  params: UploadTCCFileParams
): Promise<UploadedFileResult> {
  const {
    file,
    organizationId,
    tccType,
    year,
    isDefenseRecord = false,
    uploadedBy,
    folderId,
  } = params;

  try {
    // Validate file
    validateFile(file);

    // Upload to S3
    const s3Result = await uploadFileToS3({
      file: file.data,
      fileName: file.name,
      mimeType: file.mimetype,
      organizationId,
      fileType: isDefenseRecord ? "defense-record" : "tcc",
    });

    // Save file metadata to database
    const savedFile = await db.file.create({
      data: {
        filename: s3Result.key,
        displayName: file.name,
        size: file.size.toString(),
        type: "PDF",
        path: s3Result.key,
        organization_id: organizationId,
        uploaded_by: uploadedBy,
      },
    });

    return {
      id: savedFile.id,
      filename: savedFile.filename,
      displayName: savedFile.displayName,
      size: parseInt(savedFile.size),
      mimetype: file.mimetype,
      s3Key: savedFile.path || "",
      s3Url: s3Result.url,
      createdAt: savedFile.created_at,
    };
  } catch (error) {
    console.error("Error uploading TCC file:", error);
    throw new Error(
      `Failed to upload file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Upload multiple TCC files
 */
export async function uploadMultipleTCCFiles(
  files: UploadedFile[],
  params: Omit<UploadTCCFileParams, "file">
): Promise<UploadedFileResult[]> {
  const results: UploadedFileResult[] = [];

  for (const file of files) {
    const result = await uploadTCCFile({
      ...params,
      file,
    });
    results.push(result);
  }

  return results;
}

/**
 * Upload multiple files (TCC document and defense record)
 */
export async function uploadTCCFiles(params: {
  tccFile: UploadedFile;
  defenseFile?: UploadedFile;
  organizationId: string;
  tccType: TccType;
  year: number;
  uploadedBy: string;
  folderId?: string;
}): Promise<{
  tccFile: UploadedFileResult;
  defenseFile?: UploadedFileResult;
}> {
  const {
    tccFile,
    defenseFile,
    organizationId,
    tccType,
    year,
    uploadedBy,
    folderId,
  } = params;

  try {
    // Upload TCC file
    const tccResult = await uploadTCCFile({
      file: tccFile,
      organizationId,
      tccType,
      year,
      isDefenseRecord: false,
      uploadedBy,
      folderId,
    });

    let defenseResult: UploadedFileResult | undefined;

    // Upload defense record if provided
    if (defenseFile) {
      defenseResult = await uploadTCCFile({
        file: defenseFile,
        organizationId,
        tccType,
        year,
        isDefenseRecord: true,
        uploadedBy,
        folderId,
      });
    }

    return {
      tccFile: tccResult,
      defenseFile: defenseResult,
    };
  } catch (error) {
    console.error("Error uploading TCC files:", error);
    throw new Error(
      `Failed to upload files: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
