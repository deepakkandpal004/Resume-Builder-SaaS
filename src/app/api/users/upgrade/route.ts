import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import User from "@/lib/models/User";
import logger from "@/lib/observability/logger";

const VALID_PROMO_CODES = (process.env.PROMO_CODES || "")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const firebaseUid = authResult.userId;
    const { promoCode } = await request.json();

    const user = await User.findOne({ firebaseUid });
    if (!user) return NextResponse.json({ message: "User not found." }, { status: 404 });

    if (user.subscriptionTier === "premium") {
      return NextResponse.json({ message: "Your account is already premium." }, { status: 400 });
    }

    if (!VALID_PROMO_CODES.length || !promoCode) {
      return NextResponse.json({ message: "Invalid promo code." }, { status: 400 });
    }

    const normalised = promoCode.trim().toUpperCase();
    if (!VALID_PROMO_CODES.includes(normalised)) {
      return NextResponse.json({ message: "Invalid promo code." }, { status: 400 });
    }

    user.subscriptionTier = "premium";
    await user.save();

    return NextResponse.json({
      message: "Upgrade successful! You now have Premium access.",
      user,
    });
  } catch (error: any) {
    logger.error("upgradeUser failed:", error.message);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
