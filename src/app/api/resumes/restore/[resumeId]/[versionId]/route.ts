import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Resume from "@/lib/models/Resume";
import ResumeVersion from "@/lib/models/ResumeVersion";
import { getMongoUserId } from "@/lib/utils/userHelper";
import mongoose from "mongoose";
import logger from "@/lib/observability/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resumeId: string; versionId: string }> }
) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const userId = await getMongoUserId(authResult.userId);
    if (!userId) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const { resumeId, versionId } = await params;
    if (!mongoose.isValidObjectId(resumeId) || !mongoose.isValidObjectId(versionId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    const resume = await Resume.findOne({ userId, _id: resumeId });
    if (!resume) return NextResponse.json({ message: "Resume not found" }, { status: 404 });

    const version = await ResumeVersion.findOne({ _id: versionId, resumeId });
    if (!version) return NextResponse.json({ message: "Version not found" }, { status: 404 });

    const { _id, __v, userId: vUserId, resumeId: vResumeId, createdAt, updatedAt, ...snapshot } = version.snapshot as any;

    const restored = await Resume.findOneAndUpdate(
      { userId, _id: resumeId },
      snapshot,
      { new: true }
    );

    return NextResponse.json({ message: "Restored successfully", resume: restored });
  } catch (error: any) {
    logger.error("restoreVersion failed:", error.message);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
