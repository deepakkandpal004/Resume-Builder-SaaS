import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { syncUser } from "@/lib/services/userService";
import { ServiceError } from "@/lib/services/errors";
import logger from "@/lib/observability/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json().catch(() => ({}));
    const result = await syncUser({
      firebaseUid: authResult.userId,
      name: body.name,
      tokenEmail: authResult.firebaseUser?.email?.trim().toLowerCase() || "",
      tokenName: authResult.firebaseUser?.name || authResult.firebaseUser?.displayName,
      emailVerified: authResult.firebaseUser?.email_verified === true,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("syncUser failed: " + (error?.message || error));
    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      {
        message: "Something went wrong syncing user profile",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
