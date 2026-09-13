import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Razorpay from "razorpay";
import User from "@/lib/models/User";
import { getMongoUserId } from "@/lib/utils/userHelper";
import logger from "@/lib/observability/logger";

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing in .env");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const userId = await getMongoUserId(authResult.userId);
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const rzp = getRazorpayInstance();

    const amount = 29900;
    const currency = "INR";
    const receipt = `receipt_order_${Date.now()}`;

    const order = await rzp.orders.create({
      amount,
      currency,
      receipt,
      payment_capture: true as any,
    });

    if (!order) {
      throw new Error("Razorpay order creation failed");
    }

    user.razorpayOrderId = (order as any).id;
    await user.save();

    return NextResponse.json({
      orderId: (order as any).id,
      amount: (order as any).amount,
      currency: (order as any).currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      user: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    logger.error("Create Razorpay Order error:", error.message);
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
