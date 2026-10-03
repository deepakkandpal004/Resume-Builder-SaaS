import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { verifyPayment } from "@/lib/services/paymentService";
import { ServiceError } from "@/lib/services/errors";
import logger from "@/lib/observability/logger";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const result = await verifyPayment(authResult.userId, body);
    const { status, ...payload } = result;
    return NextResponse.json(payload, { status });
  } catch (error: any) {
    logger.error("Verify Razorpay Payment error:", error.message);
    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
