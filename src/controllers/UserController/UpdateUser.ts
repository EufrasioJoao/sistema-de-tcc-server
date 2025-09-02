import { Response } from "express";
import { db } from "../../lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";
import { AuthRequest } from "../../middlewares/authMiddleware";

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const updateSchema = z.object({
    first_name: z.string().min(2, "O primeiro nome é obrigatório").optional(),
    last_name: z.string().min(1, "O sobrenome é obrigatório").optional(),
    email: z.string().email("E-mail inválido").optional(),
    phone_number: z.string().regex(/^\d{5,15}$/, "O número de telefone deve ter entre 7 e 15 dígitos").optional(),
    old_password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres").optional(),
    new_password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres").optional(),
    is_active: z.boolean().optional(),
    role: z.enum(["ADMIN", "SISTEM_MANAGER", "COURSE_COORDENATOR", "ACADEMIC_REGISTER"]).optional(),
  });

  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(403).json({ success: false, message: "Não autorizado" });
      return;
    }

    const userToUpdate = await db.user.findUnique({ where: { id } });

    if (!userToUpdate) {
      res.status(404).json({ success: false, message: "Usuário não encontrado" });
      return;
    }

    // Authorization check
    if (requestingUser.role !== 'ADMIN' && requestingUser.id !== id) {
      res.status(403).json({ success: false, message: "Não autorizado a atualizar este usuário" });
      return;
    }
    
    // Only an admin can change a user's role or active status
    if ((data.role || data.is_active !== undefined) && requestingUser.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: "Não autorizado a alterar status ou função do usuário" });
        return;
    }

    if (data.email && data.email !== userToUpdate.email) {
      const existingEmail = await db.user.findUnique({ where: { email: data.email } });
      if (existingEmail) {
        res.status(400).json({ success: false, message: "Email já cadastrado!" });
        return;
      }
    }

    const { new_password, old_password, ...restOfData } = data;
    const updateData: any = { ...restOfData };

    if (new_password) {
      if (!old_password) {
        res.status(400).json({ success: false, message: "A senha antiga é obrigatória para definir uma nova senha." });
        return;
      }
      const isPasswordValid = await bcrypt.compare(old_password, userToUpdate.password);
      if (!isPasswordValid) {
        res.status(400).json({ success: false, message: "Palavra-passe antiga inválida!" });
        return;
      }
      updateData.password = await bcrypt.hash(new_password, 10);
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Usuário atualizado com sucesso",
      user: updatedUser,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar o usuário",
      error,
    });
  }
}
