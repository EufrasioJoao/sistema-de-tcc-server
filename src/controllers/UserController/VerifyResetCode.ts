import { Request, Response } from "express";
import { z, ZodError } from "zod";

export async function verifyResetCode(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
  });

  try {
    const { email, code } = schema.parse(req.body);

    const storedCode = global.resetCodes?.[email];

    if (!storedCode || storedCode.code !== code) {
      res.status(400).json({ status: "error", message: "Código inválido" });
      return;
    }

    if (new Date() > storedCode.expiresAt) {
      res.status(400).json({ status: "error", message: "Código expirado" });
      return;
    }

    res.status(200).json({ status: "success", message: "Código verificado" });
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
