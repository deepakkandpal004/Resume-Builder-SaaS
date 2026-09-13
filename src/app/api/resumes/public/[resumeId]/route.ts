import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import Resume from "@/lib/models/Resume";
import mongoose from "mongoose";
import logger from "@/lib/observability/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  try {
    await connectDB();

    const { resumeId } = await params;
    if (!mongoose.isValidObjectId(resumeId)) {
      return NextResponse.json({ message: "Invalid resume id" }, { status: 400 });
    }

    const resume = await Resume.findOne({ public: true, _id: resumeId });
    if (!resume) return NextResponse.json({ message: "Resume not found" }, { status: 404 });

    return NextResponse.json(resume);
  } catch (error: any) {
    logger.error("getPublicResumeById failed:", error.message);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
