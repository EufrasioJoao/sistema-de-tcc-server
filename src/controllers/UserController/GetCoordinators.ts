import { Response } from "express";
import { db } from "../../lib/db";
import { AuthRequest } from "../../middlewares/authMiddleware";

/**
 * Get all users who can be coordinators (ADMIN, SISTEM_MANAGER, COURSE_COORDENATOR)
 */
export async function getCoordinators(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = await db.user.findUnique({
      where: { id: req.user?.id },
    });

    if (!requestingUser) {
      res.status(403).json({
        success: false,
        message: "Usuário não pertence a nenhuma organização.",
      });
      return;
    }

    const organizationId = requestingUser.organization_id;

    // Get users who can be coordinators
    const coordinators = await db.user.findMany({
      where: {
        deleted_at: null,
        organization_id: organizationId,
        is_active: true,
        role: {
          in: ["COURSE_COORDENATOR"],
        },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
      },
      orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
    });

    res.status(200).json({
      success: true,
      message: "Coordenadores recuperados com sucesso",
      coordinators,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao buscar coordenadores",
      error,
    });
  }
}
