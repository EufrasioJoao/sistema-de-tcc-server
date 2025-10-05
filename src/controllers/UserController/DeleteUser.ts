import { Response } from "express";
import { db } from "../../lib/db";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { z } from "zod";

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const idSchema = z.object({
    id: z.string().uuid("ID de usuário inválido"),
  });

  try {
    const { id } = idSchema.parse(req.params);
    const requestingUser = req.user;

    // Permission Rules:
    // - Only ADMIN and SISTEM_MANAGER can delete users
    // - ADMIN can delete all users except their own account
    // - SISTEM_MANAGER can delete all users except ADMINs and their own account
    if (!requestingUser || (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'SISTEM_MANAGER')) {
      res.status(403).json({ success: false, message: "Não autorizado. Apenas administradores e gerentes de sistema podem excluir usuários." });
      return;
    }

    if (requestingUser.id === id) {
      res.status(403).json({
        success: false,
        message: "Não é possível excluir a si mesmo.",
      });
      return;
    }

    const userToDelete = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        organization_id: true,
        first_name: true,
        last_name: true,
        email: true,
      },
    });

    if (!userToDelete) {
      res.status(404).json({ success: false, message: "Usuário não encontrado" });
      return;
    }

    // Get requesting user's organization
    const requestingUserFull = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true },
    });

    if (!requestingUserFull) {
      res.status(404).json({ success: false, message: "Usuário solicitante não encontrado" });
      return;
    }

    // Check if user belongs to the same organization
    if (userToDelete.organization_id !== requestingUserFull.organization_id) {
      res.status(403).json({
        success: false,
        message: "Não é possível excluir usuários de outras organizações.",
      });
      return;
    }

    // Only ADMIN can delete other ADMINs
    if (userToDelete.role === 'ADMIN' && requestingUser.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: "Apenas administradores podem excluir outros administradores.",
      });
      return;
    }

    // Perform hard delete with cascade operations
    // We need to handle related data before deleting the user
    await db.$transaction(async (tx) => {
      // 1. Delete user's search history
      await tx.searchHistory.deleteMany({
        where: { userId: id },
      });

      // 2. Delete user's access history
      await tx.accessHistory.deleteMany({
        where: { accessed_by: id },
      });

      // 3. Update courses to remove coordinator reference
      await tx.course.updateMany({
        where: { coordinatorId: id },
        data: { coordinatorId: null },
      });

      // 4. For TCCs supervised by this user, we need to handle them
      // Check if there are TCCs supervised by this user
      const supervisedTccs = await tx.tCC.findMany({
        where: { supervisorId: id },
        select: { id: true, title: true },
      });

      if (supervisedTccs.length > 0) {
        // Find another supervisor in the same organization to transfer TCCs
        const alternativeSupervisor = await tx.user.findFirst({
          where: {
            organization_id: userToDelete.organization_id,
            role: { in: ['ADMIN', 'SISTEM_MANAGER'] },
            id: { not: id },
            deleted_at: null,
          },
        });

        if (!alternativeSupervisor) {
          // No alternative supervisor found, cannot delete user
          throw new Error(`Não é possível excluir o usuário pois ele é orientador de ${supervisedTccs.length} TCC(s) e não há outro supervisor disponível na organização para transferir a orientação.`);
        }

        // Transfer TCCs to alternative supervisor
        await tx.tCC.updateMany({
          where: { supervisorId: id },
          data: { supervisorId: alternativeSupervisor.id },
        });

        console.log(`Transferred ${supervisedTccs.length} TCC(s) from ${userToDelete.email} to ${alternativeSupervisor.email}`);
      }

      // 5. For files uploaded by this user, transfer to alternative user
      const uploadedFiles = await tx.file.findMany({
        where: { uploaded_by: id },
        select: { id: true, filename: true },
      });

      if (uploadedFiles.length > 0) {
        // Find another admin/manager in the same organization to transfer files
        const alternativeUploader = await tx.user.findFirst({
          where: {
            organization_id: userToDelete.organization_id,
            role: { in: ['ADMIN', 'SISTEM_MANAGER'] },
            id: { not: id },
            deleted_at: null,
          },
        });

        if (!alternativeUploader) {
          // No alternative uploader found, cannot delete user
          throw new Error(`Não é possível excluir o usuário pois ele enviou ${uploadedFiles.length} arquivo(s) e não há outro administrador disponível na organização para transferir a propriedade.`);
        }

        // Transfer files to alternative uploader
        await tx.file.updateMany({
          where: { uploaded_by: id },
          data: { uploaded_by: alternativeUploader.id },
        });

        console.log(`Transferred ${uploadedFiles.length} file(s) from ${userToDelete.email} to ${alternativeUploader.email}`);
      }

      // 6. Finally, delete the user
      await tx.user.delete({
        where: { id },
      });
    });

    console.log(`User successfully deleted: ${userToDelete.email} (${userToDelete.id}) by ${requestingUser.email} (${requestingUser.id})`);

    res.status(200).json({
      success: true,
      message: "Usuário excluído com sucesso",
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: "Dados de entrada inválidos.", errors: error.errors });
      return;
    }

    console.error("Error deleting user:", error);

    // Check if it's our custom business logic error
    if (error instanceof Error && (
      error.message.includes('orientador de') ||
      error.message.includes('enviou') ||
      error.message.includes('não há outro')
    )) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    // Check if it's a foreign key constraint error
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      res.status(400).json({
        success: false,
        message: "Não é possível excluir o usuário devido a dependências no sistema. Contate o administrador.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Erro interno ao excluir o usuário",
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
}
