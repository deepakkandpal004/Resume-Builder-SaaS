import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import User from "@/lib/models/User";
import logger from "@/lib/observability/logger";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json().catch(() => ({}));
    const firebaseUid = authResult.userId;
    const tokenEmail =
      authResult.firebaseUser?.email?.trim().toLowerCase() || "";
    const name = body.name || authResult.firebaseUser?.name || authResult.firebaseUser?.displayName;
    const emailVerified =
      authResult.firebaseUser?.email_verified === true;

    console.log("[API /api/users/sync] Syncing user:", { firebaseUid, tokenEmail, name, emailVerified });

    let user = await User.findOne({ firebaseUid });

    if (user) {
      user.name = name || user.name;
      if (tokenEmail) user.email = tokenEmail;
      user.emailVerified = user.emailVerified || emailVerified;
      await user.save();
      console.log("[API /api/users/sync] Updated existing user in MongoDB:", user._id);
    } else {
      user = tokenEmail ? await User.findOne({ email: tokenEmail }) : null;

      if (user) {
        user.firebaseUid = firebaseUid;
        user.name = name || user.name;
        user.emailVerified = user.emailVerified || emailVerified;
        await user.save();
        console.log("[API /api/users/sync] Linked existing MongoDB account by email:", user._id);
      } else {
        user = await User.create({
          firebaseUid,
          name: name || tokenEmail?.split("@")[0] || "User",
          email: tokenEmail || `${firebaseUid}@anonymous.user`,
          emailVerified,
        });
        console.log("[API /api/users/sync] Created brand new user in MongoDB:", user._id);
      }
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("[API /api/users/sync Error]:", error);
    logger.error("syncUser failed: " + (error?.message || error));
    return NextResponse.json(
      {
        message: "Something went wrong syncing user profile",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
