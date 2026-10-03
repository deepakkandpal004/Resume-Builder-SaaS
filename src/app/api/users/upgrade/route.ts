import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { upgradeUser } from "@/lib/services/userService";
import { ServiceError } from "@/lib/services/errors";
import logger from "@/lib/observability/logger";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const { promoCode } = await request.json();
    const result = await upgradeUser(authResult.userId, promoCode);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("upgradeUser failed:", error.message);
    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
