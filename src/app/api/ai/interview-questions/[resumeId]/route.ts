import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Resume from "@/lib/models/Resume";
import InterviewQuestion from "@/lib/models/InterviewQuestion";
import { getMongoUserId } from "@/lib/utils/userHelper";
import mongoose from "mongoose";

const INTERVIEW_PER_RESUME_CAP = 5;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const { resumeId } = await params;

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return NextResponse.json({ message: "Invalid resume ID." }, { status: 400 });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) return NextResponse.json({ message: "Resume not found." }, { status: 404 });
    if (resume.userId.toString() !== (await getMongoUserId(authResult.userId)).toString()) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const sets = await InterviewQuestion.find({ resumeId })
      .sort({ createdAt: -1 })
      .limit(INTERVIEW_PER_RESUME_CAP);

    return NextResponse.json({
      sets: sets.map((s: any) => ({
        setId: s._id,
        targetRole: s.targetRole,
        questions: s.questions,
        createdAt: s.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
