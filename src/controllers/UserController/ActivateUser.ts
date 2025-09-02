import { Response } from "express";
import { db } from "../../lib/db";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { z } from "zod";

export async function activateUser(req: AuthRequest, res: Response): Promise<void> {
    const idSchema = z.object({
        id: z.string().uuid("ID de usuário inválido"),
    });

    try {
        const { id } = idSchema.parse(req.params);
        const requestingUser = req.user;

        if (!requestingUser || requestingUser.role !== 'ADMIN') {
            res.status(403).json({ success: false, message: "Não autorizado" });
            return;
        }

        const userToActivate = await db.user.findUnique({ where: { id } });

        if (!userToActivate) {
            res.status(404).json({ success: false, message: "Usuário não encontrado" });
            return;
        }

        const activatedUser = await db.user.update({
            where: { id },
            data: { is_active: true },
        });

        res.status(200).json({
            success: true,
            message: "Usuário ativado com sucesso",
            user: activatedUser,
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ success: false, message: "Dados de entrada inválidos.", errors: error.errors });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Erro ao ativar o usuário",
            error,
        });
    }
}
