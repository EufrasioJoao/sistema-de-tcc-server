import { Request, Response } from "express";
import { db } from "../../lib/db";
import bcrypt from "bcrypt";
import z from "zod";
import { addMonths } from "date-fns";

// Gerar codigo da entidade
function generateOrganizationCode(name: string, count: number): string {
  const currentYear = new Date().getFullYear();
  const currentDay = new Date().getDate();

  const OrganizationInitials = name
    .split(" ")
    .filter((part) => part.trim() !== "")
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const OrganizationCode = `${OrganizationInitials}-${
    count + 1
  }-${currentDay}${currentYear}`;

  return OrganizationCode;
}

// Gerar password do administrador da entidade
function generateOrganizationAdminPassword(
  name: string,
  count: number
): string {
  const currentYear = new Date().getFullYear();

  const userInitials = name
    .split(" ")
    .filter((part) => part.trim() !== "")
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const userPassword = `${userInitials}.${count + 1}.${currentYear}`;

  return userPassword;
}

export async function createOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const phoneNumberSchema = z
    .string()
    .min(5, "Número do administrador inválido");

  const organizationSchema = z.object({
    name: z.string().min(1, "Nome da entidade é obrigatório."),
    email: z.string().email("E-mail inválido."),
    city: z.string().min(1, "Cidade da entidade é obrigatória."),
    state: z.string().min(1, "Estado/Provincia da entidade é obrigatório."),
  });

  const organizationAdminSchema = z.object({
    firstName: z
      .string()
      .min(1, "Primeiro nome do administrador é obrigatório."),
    lastName: z
      .string()
      .min(1, "Último nome do administrador é obrigatório."),
    email: z.string().email("E-mail do administrador é inválido."),
    phoneNumber: phoneNumberSchema,
  });

  try {
    const {
      name,
      email,
      city,
      state,
    } = organizationSchema.parse(req.body.organization);

    const {
      firstName,
      lastName,
      email: adminEmail,
      phoneNumber,
    } = await organizationAdminSchema.parseAsync(req.body.organizationAdmin);

    // Validar user email
    const existingUserEmail = await db.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingUserEmail) {
      throw new Error("Email do admin já em uso");
    }

    // Validar Organization email
    const existingOrganizationEmail = await db.organization.findUnique({
      where: { email: email },
    });
    if (existingOrganizationEmail) {
      throw new Error("Email da entidade já em uso");
    }

    const organizationCount = await db.organization.count();
    const organizationAdminPassword = generateOrganizationAdminPassword(
      `${firstName} ${lastName}`,
      organizationCount
    );
    const hashedOrganizationAdminPassword = await bcrypt.hash(
      organizationAdminPassword,
      10
    );

    const transaction = await db.$transaction(async (tx) => {
      const newOrganization = await tx.organization.create({
        data: {
          name,
          email,
          city,
          state,
          is_active: true,
        },
      });

      const organizationAdmin = await tx.user.create({
        data: {
          first_name: firstName,
          last_name: lastName,
          password: hashedOrganizationAdminPassword,
          email: adminEmail,
          phone_number: phoneNumber,
          is_active: true,
          role: "ADMIN",
          organization: {
            connect: { id: newOrganization.id },
          },
        },
      });

      return {
        organizationAdmin,
        organizationAdminPassword,
        organization: newOrganization,
      };
    });

    res.status(201).json({
      success: true,
      message: "Entidade criada com sucesso",
      transaction,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error registering Organization",
      error: error.message,
    });
  }
}
