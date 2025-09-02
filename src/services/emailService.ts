import { createTransport } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import dotenv from "dotenv";

dotenv.config();

function createWelcomeEmailTemplate(
  name: string,
  email: string,
  password: string
) {
  const loginUrl = process.env.FRONTEND_URL;

  return {
    subject: "Bem-vindo à Plataforma de TCCs!",
    body: `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px; margin: auto; }
            .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .credentials { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 20px; font-size: 12px; color: #777; }
            a { color: #007bff; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <p class="header">Olá, ${name}!</p>
            <p>Sua conta na Plataforma de TCCs criada com sucesso. Abaixo estão suas credenciais de acesso:</p>
            <div class="credentials">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Senha:</strong> ${password}</p>
            </div>
            <p>Para acessar sua conta, clique no link abaixo:</p>
            <a href="${loginUrl}">Acessar a Plataforma</a>
            <p class="footer">Se você não criou esta conta, por favor ignore este email.</p>
          </div>
        </body>
      </html>
    `,
  };
}

export async function sendWelcomeEmail(
  name: string,
  email: string,
  password: string
) {
  const template = createWelcomeEmailTemplate(name, email, password);

  try {
    const transporter = createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMT_EMAIL,
        pass: process.env.SMT_PASSWORD,
      },
    } as unknown as SMTPTransport);

    await transporter.sendMail({
      from: process.env.SOURCE_EMAIL,
      to: email,
      subject: template.subject,
      html: template.body,
    });

    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error("Error sending email via Nodemailer:", error);
  }
}

function createResetCodeTemplate(name: string, code: string) {
  return {
    subject: "Plataforma de TCCs - Recuperação de Senha",
    body: `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px; margin: auto; }
            .header { font-size: 22px; font-weight: bold; margin-bottom: 16px; }
            .code { text-align: center; margin: 30px 0; }
            .code-box { display: inline-block; background-color: #f2f2f2; padding: 15px 30px; border-radius: 5px; font-family: monospace; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #333; }
            .footer { margin-top: 20px; font-size: 12px; color: #777; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">Recuperação de Senha</div>
            <p>Olá ${name},</p>
            <p>Recebemos uma solicitação para redefinir sua senha. Se você não solicitou esta alteração, por favor ignore este email.</p>
            <p>Use o código abaixo para redefinir sua senha:</p>
            <div class="code">
              <div class="code-box">${code}</div>
            </div>
            <p>Este código expirará em 1 hora por motivos de segurança.</p>
            <div class="footer">
              <p>Plataforma de TCCs &copy; ${new Date().getFullYear()}</p>
              <p>Este é um email automático. Por favor, não responda.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export async function sendPasswordResetCodeEmail(
  name: string,
  email: string,
  code: string
) {
  const template = createResetCodeTemplate(name, code);

  try {
    const transporter = createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMT_EMAIL,
        pass: process.env.SMT_PASSWORD,
      },
    } as unknown as SMTPTransport);

    await transporter.sendMail({
      from: process.env.SOURCE_EMAIL,
      to: email,
      subject: template.subject,
      html: template.body,
    });

    console.log(`Password reset code email sent to ${email}`);
  } catch (error) {
    console.error("Error sending reset code email via Nodemailer:", error);
  }
}

export async function sendExpiringDocumentsSummaryEmail(
  recipients: string[],
  summary: {
    totalExpiring: number;
    totalExpired: number;
    sample: {
      id: string | number;
      name: string;
      daysUntilExpiration: number;
      expirationDate: Date;
    }[];
    expiredSample: {
      id: string | number;
      name: string;
      daysUntilExpiration: number;
      expirationDate: Date;
    }[];
  }
) {
  const subject = `Plataforma de TCCs - Resumo de documentos a expirar`;

  const formatPtDate = (d: Date) => new Date(d).toLocaleDateString("pt-PT");

  const expiringRows = summary.sample
    .slice(0, 10)
    .map(
      (item) => `
        <tr>
          <td style="padding:8px;border:1px solid #eee;">${item.name}</td>
          <td style="padding:8px;border:1px solid #eee;">${
            item.daysUntilExpiration
          }</td>
          <td style="padding:8px;border:1px solid #eee;">${formatPtDate(
            item.expirationDate
          )}</td>
        </tr>`
    )
    .join("");

  const expiredRows = (summary.expiredSample || [])
    .slice(0, 10)
    .map(
      (item) => `
        <tr>
          <td style="padding:8px;border:1px solid #eee;">${item.name}</td>
          <td style="padding:8px;border:1px solid #eee;">${Math.abs(
            item.daysUntilExpiration
          )}</td>
          <td style="padding:8px;border:1px solid #eee;">${formatPtDate(
            item.expirationDate
          )}</td>
        </tr>`
    )
    .join("");

  const hasExpiring = summary.sample && summary.sample.length > 0;
  const hasExpiredList =
    summary.expiredSample && summary.expiredSample.length > 0;

  const sectionHtml = hasExpiring
    ? `
      <h3 style="margin-top:20px;">Top 10 mais próximos do vencimento</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border:1px solid #eee;">Documento</th>
            <th style="text-align:left;padding:8px;border:1px solid #eee;">Dias restantes</th>
            <th style="text-align:left;padding:8px;border:1px solid #eee;">Data de expiração</th>
          </tr>
        </thead>
        <tbody>
          ${expiringRows}
        </tbody>
      </table>
    `
    : hasExpiredList
    ? `
      <h3 style="margin-top:20px;">Top 10 expirados recentes</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border:1px solid #eee;">Documento</th>
            <th style="text-align:left;padding:8px;border:1px solid #eee;">Dias desde expiração</th>
            <th style="text-align:left;padding:8px;border:1px solid #eee;">Data de expiração</th>
          </tr>
        </thead>
        <tbody>
          ${expiredRows}
        </tbody>
      </table>
    `
    : '<p style="margin-top:16px;">Sem itens</p>';

  const html = `
    <html>
      <body style="font-family:Arial,sans-serif;color:#333;">
        <div style="max-width:640px;margin:0 auto;padding:16px;border:1px solid #eee;border-radius:8px;">
          <h2 style="margin:0 0 12px 0;">Resumo diário - Documentos a expirar</h2>
          <p>Total a expirar (<= 30 dias): <strong>${summary.totalExpiring}</strong></p>
          <p>Total expirados: <strong>${summary.totalExpired}</strong></p>
          ${sectionHtml}
          <p style="font-size:12px;color:#888;margin-top:16px;">Este é um email automático. Por favor, não responda.</p>
        </div>
      </body>
    </html>
  `;

  try {
    const transporter = createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMT_EMAIL || process.env.SMTP_USER,
        pass: process.env.SMT_PASSWORD || process.env.SMTP_PASS,
      },
    } as unknown as SMTPTransport);

    await transporter.sendMail({
      from:
        process.env.SOURCE_EMAIL || "Plataforma de TCCs <noreply@ucm.ac.mz>",
      to: recipients,
      subject,
      html,
    });
    console.log(
      `Expiring documents summary email sent to: ${recipients.join(", ")}`
    );
  } catch (error) {
    console.error("Error sending expiring documents summary email:", error);
  }
}
