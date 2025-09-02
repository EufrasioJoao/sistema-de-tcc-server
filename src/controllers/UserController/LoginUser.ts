import { Request, Response } from "express";
import { db } from "../../lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function loginUser(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Credenciais inválidas!",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({
        success: false,
        message: "Credenciais inválidas",
      });
      return;
    }

    if (!user.is_active) {
      res.status(400).json({
        success: false,
        message: "Conta de usuário desativada",
      });
      return;
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });

    res.status(200).json({
      success: true,
      message: "Login realizado com sucesso",
      user,
      token,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro ao fazer login",
      error: error.message,
    });
  }
}
