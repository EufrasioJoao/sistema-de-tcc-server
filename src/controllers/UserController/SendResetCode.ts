import { Request, Response } from "express";
import { db } from "../../lib/db";
import { sendPasswordResetCodeEmail } from "../../services/emailService";

// Generate a 6-digit random code
const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export async function sendResetCode(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { email } = req.body;

    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const resetCode = generateResetCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Code expires in 15 minutes

    // Store the reset code and its expiration in a global or in-memory store
    // This is a simplified example. In a real-world scenario, you might use Redis or a similar store.
    if (!global.resetCodes) {
      global.resetCodes = {};
    }
    global.resetCodes[email] = {
      code: resetCode,
      expiresAt: expiresAt,
    };

    await sendPasswordResetCodeEmail(user?.first_name, email, resetCode);

    res.status(200).json({
      success: true,
      message: "Password reset code sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error sending password reset code",
      error: error,
    });
  }
}
