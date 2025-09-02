import { db } from "../../lib/db";
import { z } from "zod";
import { Response } from "express";
import { Folder, File, UserRoles } from "@prisma/client";
import { AuthRequest } from "../../middlewares/authMiddleware";

export async function searchForFolderContent(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const searchParamsSchema = z.object({
    organizationId: z.coerce.string(),
    folderId: z.string().uuid().optional(),
    searchTerm: z.string().min(1, "Termo de busca inválido"),
  });

  const searchQuerySchema = z
    .object({
      userId: z.coerce.string().optional(),
    })
    .refine((data) => data.userId || data.userId, {
      message: "Either userId or userId must be provided in the query.",
    });

  try {
    const { organizationId, folderId, searchTerm } = searchParamsSchema.parse(
      req.params
    );
    const { userId } = searchQuerySchema.parse(req.query);

    let userIsAdmin = false;
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role === "ADMIN") {
        userIsAdmin = true;
      }
    } else if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (
        user?.role === UserRoles.ADMIN ||
        user?.role === UserRoles.SISTEM_MANAGER
      ) {
        userIsAdmin = true;
      }
    }

    let searchScopeFolderIds: string[] = [];
    if (folderId) {
      const getSubfolderIds = async (
        currentFolderId: string
      ): Promise<string[]> => {
        const subfolders = await db.folder.findMany({
          where: { parent_folder_id: currentFolderId },
          select: { id: true },
        });
        const subfolderIds = subfolders.map((f) => f.id);
        let allIds = [...subfolderIds];
        for (const id of subfolderIds) {
          allIds = allIds.concat(await getSubfolderIds(id));
        }
        return allIds;
      };
      searchScopeFolderIds = [folderId, ...(await getSubfolderIds(folderId))];
    } else {
      const allFoldersInOrganization = await db.folder.findMany({
        where: { organization_id: organizationId },
        select: { id: true },
      });
      searchScopeFolderIds = allFoldersInOrganization.map((f) => f.id);
    }

    let foldersWithPermissions;
    let filesWithPermissions;

    if (userIsAdmin) {
      const folders = await db.folder.findMany({
        where: {
          id: { in: searchScopeFolderIds },
          name: { contains: searchTerm },
        },
        orderBy: { name: "asc" },
      });

      const files = await db.file.findMany({
        where: {
          folder_id: { in: searchScopeFolderIds },
          displayName: { contains: searchTerm },
        },
        orderBy: { displayName: "asc" },
      });

      foldersWithPermissions = folders.map((folder) => ({
        ...folder,
        accessLevel: "MANAGE",
      }));

      filesWithPermissions = files.map((file) => ({
        ...file,
        accessLevel: "MANAGE",
      }));
    } else {
      const userPermissions = await db.folderPermission.findMany({
        where: {
          OR: [
            { userId: userId ? userId : undefined },
            { userId: userId ? userId : undefined },
          ],
        },
      });

      const permittedFolderIds = userPermissions
        .filter((p) => p.folderId && p.accessLevel !== "NO_ACCESS")
        .map((p) => p.folderId);

      const finalFolderIds = permittedFolderIds.filter((id) =>
        searchScopeFolderIds.includes(id as string)
      ) as string[];

      const folders = await db.folder.findMany({
        where: {
          id: { in: finalFolderIds },
          name: { contains: searchTerm },
        },
        orderBy: { name: "asc" },
      });

      const files = await db.file.findMany({
        where: {
          folder_id: { in: finalFolderIds },
          displayName: { contains: searchTerm },
        },
        orderBy: { displayName: "asc" },
      });

      const folderPermissionsMap = new Map(
        userPermissions
          .filter((p) => p.folderId)
          .map((p) => [p.folderId, p.accessLevel])
      );

      foldersWithPermissions = folders.map((folder: Folder) => ({
        ...folder,
        accessLevel: folderPermissionsMap.get(folder.id),
      }));

      filesWithPermissions = files.map((file: File) => ({
        ...file,
        accessLevel: folderPermissionsMap.get(file.folder_id),
      }));
    }

    res.status(200).json({
      success: true,
      message: "Resultados da busca recuperados com sucesso",
      data: {
        folders: foldersWithPermissions,
        files: filesWithPermissions,
      },
    });
  } catch (error: any) {
    console.error("Error in searchForFolderContent:", error.message);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar conteúdo",
      error: error.message,
    });
  }
}
