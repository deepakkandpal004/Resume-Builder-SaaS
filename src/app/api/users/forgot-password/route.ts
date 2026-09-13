import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAuth } from "@/lib/config/firebase";
import logger from "@/lib/observability/logger";
import getMailer from "@/lib/config/mailer";

const frontendUrl = () =>
  process.env.CLIENT_URL?.split(",")[0] || "http://localhost:3000";

const getSender = () => {
  if (!process.env.SMTP_FROM) {
    throw new Error("SMTP_FROM is not configured");
  }
  return process.env.SMTP_FROM;
};

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[c] || c;
  });

const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  const mailer = getMailer();
  return mailer.sendMail({
    from: `"Resume Builder" <${getSender()}>`,
    to,
    subject,
    html,
  });
};

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email?.trim()) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const firebaseAuth = getFirebaseAuth();
    const firebaseUser = await firebaseAuth.getUserByEmail(normalizedEmail);

    const providers = firebaseUser.providerData?.map((p: any) => p.providerId) || [];
    const isGoogle = providers.includes("google.com");

    if (isGoogle) {
      return NextResponse.json({
        message: "If an account with that email exists, a reset link has been sent.",
        provider: "google",
      });
    }

    const resetLink = await firebaseAuth.generatePasswordResetLink(normalizedEmail);
    const targetUser = escapeHtml(normalizedEmail);

    await sendEmail({
      to: normalizedEmail,
      subject: `Password reset for ${normalizedEmail}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin-bottom:8px;color:#1f2937">Reset your password</h2>
          <p style="color:#6b7280;margin-bottom:8px">A password reset was requested for the account:</p>
          <p style="color:#1f2937;font-weight:600;margin-bottom:16px">${targetUser}</p>
          <p style="color:#6b7280;margin-bottom:24px">Click the button below — this link expires in <strong>1 hour</strong>.</p>
          <a href="${resetLink}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a>
          <p style="margin-top:24px;font-size:13px;color:#9ca3af">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (error: any) {
    logger.error("forgotPassword error:", error.message);
    if (error.code === "auth/user-not-found") {
      return NextResponse.json({
        message: "If an account with that email exists, a reset link has been sent.",
      });
    }
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
