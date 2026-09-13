import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import User from "@/lib/models/User";
import { getMongoUserId } from "@/lib/utils/userHelper";
import crypto from "crypto";
import logger from "@/lib/observability/logger";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
    const userId = await getMongoUserId(authResult.userId);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ message: "Missing required payment details" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ message: "Razorpay secret key is not configured" }, { status: 500 });
    }

    const signBody = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signBody)
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (isSignatureValid) {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          subscriptionTier: "premium",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
        },
        { new: true }
      );

      if (!user) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }

      logger.info(`User ${userId} successfully upgraded to premium via Razorpay. Order: ${razorpay_order_id}`);
      return NextResponse.json({
        success: true,
        message: "Payment verified successfully. Your account has been upgraded to Premium!",
        user: {
          name: user.name,
          email: user.email,
          subscriptionTier: user.subscriptionTier,
        },
      });
    } else {
      logger.warn(`Invalid Razorpay signature for user ${userId}, Order: ${razorpay_order_id}`);
      return NextResponse.json({
        success: false,
        message: "Invalid signature verification. Payment authentication failed.",
      }, { status: 400 });
    }
  } catch (error: any) {
    logger.error("Verify Razorpay Payment error:", error.message);
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
