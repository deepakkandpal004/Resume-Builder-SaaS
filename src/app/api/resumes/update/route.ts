import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import { updateResume } from "@/lib/services/resumeService";
import { ServiceError } from "@/lib/services/errors";
import logger from "@/lib/observability/logger";

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const formData = await request.formData();
    const resumeId = formData.get("resumeId") as string;
    const resumeData = formData.get("resumeData") as string;
    const imageFile = formData.get("image") as File | null;

    const result = await updateResume(authResult.userId, {
      resumeId,
      resumeData,
      imageFile,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("updateResume failed:", error.message);
    if (error instanceof ServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
