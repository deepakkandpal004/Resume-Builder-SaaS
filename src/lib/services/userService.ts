/**
 * Layered architecture — user account business logic.
 */
import User from "@/lib/models/User";
import Resume from "@/lib/models/Resume";
import AtsScore from "@/lib/models/AtsScore";
import { getFirebaseAuth } from "@/lib/config/firebase";
import getMailer from "@/lib/config/mailer";
import logger from "@/lib/observability/logger";
import { ServiceError } from "./errors";

const VALID_PROMO_CODES = (process.env.PROMO_CODES || "")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

// ── Dashboard resume list ───────────────────────────────────────────────

export async function getUserResumes(firebaseUid: string) {
  const user: any = await User.findOne({ firebaseUid });
  if (!user) throw new ServiceError("user not found", 404);

  const resumes = await Resume.find({ userId: user._id }).lean();

  const resumeIds = resumes.map((r: any) => r._id);
  const latestScans = await AtsScore.aggregate([
    { $match: { resumeId: { $in: resumeIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$resumeId",
        atsScore: { $first: "$atsScore" },
        scannedAt: { $first: "$createdAt" },
      },
    },
  ]);

  const scoreMap = Object.fromEntries(
    latestScans.map((s: any) => [
      s._id.toString(),
      { atsScore: s.atsScore, scannedAt: s.scannedAt },
    ])
  );

  const enriched = resumes.map((r: any) => ({
    ...r,
    lastAts: scoreMap[r._id.toString()] ?? null,
  }));

  return { resumes: enriched };
}

// ── Current user profile ────────────────────────────────────────────────

export async function getUserData(firebaseUid: string) {
  const user = await User.findOne({ firebaseUid });
  if (!user) throw new ServiceError("user not found", 404);
  return { user };
}

// ── Firebase → Mongo sync ───────────────────────────────────────────────

export interface SyncInput {
  firebaseUid: string;
  name?: unknown;
  tokenEmail?: string;
  tokenName?: string;
  emailVerified?: boolean;
}

export async function syncUser(input: SyncInput) {
  const { firebaseUid } = input;
  const tokenEmail = input.tokenEmail?.trim().toLowerCase() || "";
  const name = input.name || input.tokenName;
  const emailVerified = input.emailVerified === true;

  let user: any = await User.findOne({ firebaseUid });

  if (user) {
    user.name = name || user.name;
    if (tokenEmail) user.email = tokenEmail;
    user.emailVerified = user.emailVerified || emailVerified;
    await user.save();
  } else {
    user = tokenEmail ? await User.findOne({ email: tokenEmail }) : null;

    if (user) {
      user.firebaseUid = firebaseUid;
      user.name = name || user.name;
      user.emailVerified = user.emailVerified || emailVerified;
      await user.save();
    } else {
      user = await User.create({
        firebaseUid,
        name: name || tokenEmail?.split("@")[0] || "User",
        email: tokenEmail || `${firebaseUid}@anonymous.user`,
        emailVerified,
      });
    }
  }

  return { user };
}

// ── Promo-code upgrade ──────────────────────────────────────────────────

export async function upgradeUser(firebaseUid: string, promoCode: unknown) {
  const user: any = await User.findOne({ firebaseUid });
  if (!user) throw new ServiceError("User not found.", 404);

  if (user.subscriptionTier === "premium") {
    throw new ServiceError("Your account is already premium.", 400);
  }

  if (!VALID_PROMO_CODES.length || !promoCode) {
    throw new ServiceError("Invalid promo code.", 400);
  }

  const normalised = String(promoCode).trim().toUpperCase();
  if (!VALID_PROMO_CODES.includes(normalised)) {
    throw new ServiceError("Invalid promo code.", 400);
  }

  user.subscriptionTier = "premium";
  await user.save();

  return {
    message: "Upgrade successful! You now have Premium access.",
    user,
  };
}

// ── Password reset ──────────────────────────────────────────────────────

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

export async function sendPasswordReset(email: unknown) {
  if (typeof email !== "string" || !email.trim()) {
    throw new ServiceError("Email is required.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  try {
    const firebaseAuth = getFirebaseAuth();
    const firebaseUser = await firebaseAuth.getUserByEmail(normalizedEmail);

    const providers = firebaseUser.providerData?.map((p: any) => p.providerId) || [];
    const isGoogle = providers.includes("google.com");

    if (isGoogle) {
      return {
        message: "If an account with that email exists, a reset link has been sent.",
        provider: "google",
      };
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

    return {
      message: "If an account with that email exists, a reset link has been sent.",
    };
  } catch (error: any) {
    logger.error("forgotPassword error:", error.message);
    if (error.code === "auth/user-not-found") {
      return {
        message: "If an account with that email exists, a reset link has been sent.",
      };
    }
    throw new ServiceError("Something went wrong. Please try again.", 500);
  }
}
