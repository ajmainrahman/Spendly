import { Resend } from "resend";
import { logger } from "./logger";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
): Promise<void> {
  if (!resend) {
    logger.warn({ resetUrl }, "RESEND_API_KEY not set — password reset link (dev only)");
    return;
  }

  const { error } = await resend.emails.send({
    from: "Spendly <noreply@resend.dev>",
    to,
    subject: "Reset your Spendly password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Reset your password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your Spendly password. Click the button below — this link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Reset password
        </a>
        <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    logger.error({ error }, "Failed to send password reset email");
    throw new Error("Failed to send reset email");
  }
}
