import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { getResumeById } from "@/lib/services/resumeService";
import { ServiceError } from "@/lib/services/errors";
import logger from "@/lib/observability/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const { resumeId } = await params;
    const result = await getResumeById(authResult.userId, resumeId);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("getResumeById failed:", error.message);
    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
