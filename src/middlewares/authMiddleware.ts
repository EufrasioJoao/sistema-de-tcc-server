import { UserRoles } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables");
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRoles;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(403).json({
        success: false,
        message: "Bearer token is required!",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      email: string;
      role: UserRoles;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: "Error on AuthMiddleware",
      error,
    });
    return;
  }
};
