import { Request, Response } from "express";
import { db } from "../../lib/db";
import bcrypt from "bcrypt";
import { z, ZodError } from "zod";

export async function resetPasswordWithCode(
  req: Request,
  res: Response
): Promise<void> {
  const schema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
    password: z.string().min(6),
  });

  try {
    const { email, code, password } = schema.parse(req.body);

    const storedCode = global.resetCodes?.[email];

    if (!storedCode || storedCode.code !== code) {
      res.status(400).json({ status: "error", message: "Código inválido" });
      return;
    }

    if (new Date() > storedCode.expiresAt) {
      res.status(400).json({ status: "error", message: "Código expirado" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    delete global.resetCodes[email];

    res
      .status(200)
      .json({ status: "success", message: "Senha redefinida com sucesso" });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: "error",
        message: "Validação falhou",
        errors: error.errors,
      });
      return;
    }
    res.status(500).json({ status: "error", message: "Erro interno do servidor" });
  }
}
