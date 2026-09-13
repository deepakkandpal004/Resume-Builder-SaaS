import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import User from "@/lib/models/User";
import logger from "@/lib/observability/logger";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const firebaseUid = authResult.userId;
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return NextResponse.json({ message: "user not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error: any) {
    logger.error("getUserId failed:", error.message);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
