import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Resume from "@/lib/models/Resume";
import { getMongoUserId } from "@/lib/utils/userHelper";
import mongoose from "mongoose";
import logger from "@/lib/observability/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const userId = await getMongoUserId(authResult.userId);
    if (!userId) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const { resumeId } = await params;
    if (!mongoose.isValidObjectId(resumeId)) {
      return NextResponse.json({ message: "Invalid resume id" }, { status: 400 });
    }

    await Resume.findOneAndDelete({ userId, _id: resumeId });
    return NextResponse.json({ message: "Resume deleted successfully" });
  } catch (error: any) {
    logger.error("deleteResume failed:", error.message);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
