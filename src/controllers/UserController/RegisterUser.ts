import { Request, Response } from "express";
import { db } from "../../lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";
import { sendWelcomeEmail } from "../../services/emailService";
import { AuthRequest } from "@/middlewares/authMiddleware";

// generate password from name
function generatePassword(name: string) {
  if (name.length < 2) {
    throw new Error("The name must have at least two letters.");
  }
  const prefix = name.slice(0, 2).toLowerCase();
  const randomNumbers = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomNumbers}`;
}

export async function registerUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userSchema = z.object({
    first_name: z
      .string()
      .min(2, "First name is required")
      .nonempty("First name is required"),
    last_name: z
      .string()
      .min(1, "Last name is required")
      .nonempty("Last name is required"),
    email: z.string().email("Invalid email"),
    phone_number: z
      .string()
      .regex(/^\d{5,15}$/, "Phone number must be between 7 and 15 digits")
      .optional(),
    role: z.enum([
      "ADMIN",
      "SISTEM_MANAGER",
      "COURSE_COORDENATOR",
      "ACADEMIC_REGISTER",
    ]),
  });

  try {
    const { first_name, last_name, email, phone_number, role } =
      userSchema.parse(req.body);

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email already exists",
      });
      return;
    }

    const password = generatePassword(first_name);
    const hashedPassword = await bcrypt.hash(password, 10);

    const reqUser = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
      select: { organization_id: true },
    });

    if (!reqUser?.organization_id) {
      res.status(400).json({
        success: false,
        message: "The user making the request is not part of an organization.",
      });
      return;
    }

    const user = await db.user.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashedPassword,
        phone_number,
        role,
        organization: {
          connect: { id: reqUser.organization_id },
        },
      },
    });

    await sendWelcomeEmail(first_name, email, password);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error,
    });
  }
}
