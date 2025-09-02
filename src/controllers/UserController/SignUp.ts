import { Request, Response } from "express";
import * as bcrypt from "bcrypt";
import { db } from "../../lib/db";
import jwt from "jsonwebtoken";

export async function SignUp(req: Request, res: Response): Promise<void> {
  try {
    const {
      first_name,
      last_name,
      email,
      phone_number,
      password,
      organization_name,
      city,
      state,
    } = req.body;

    if (
      !first_name ||
      !last_name ||
      !email ||
      !password ||
      !organization_name
    ) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ message: "User with this email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const organization = await db.organization.create({
      data: {
        name: organization_name,
        city,
        state,
      },
    });

    const user = await db.user.create({
      data: {
        first_name,
        last_name,
        email,
        phone_number,
        password: hashedPassword,
        organization: {
          connect: { id: organization.id },
        },
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });

    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
