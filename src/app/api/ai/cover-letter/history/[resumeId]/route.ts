import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Resume from "@/lib/models/Resume";
import CoverLetter from "@/lib/models/CoverLetter";
import { getMongoUserId } from "@/lib/utils/userHelper";
import mongoose from "mongoose";

const COVER_LETTER_PER_RESUME_CAP = 10;

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

    let resume;
    try {
      resume = await Resume.findById(resumeId);
    } catch {
      return NextResponse.json({ message: "Database unavailable. Please try again." }, { status: 503 });
    }

    if (!resume) {
      return NextResponse.json({ message: "Resume not found." }, { status: 404 });
    }

    if (resume.userId.toString() !== (await getMongoUserId(authResult.userId)).toString()) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const letters = await CoverLetter.find({ resumeId })
      .sort({ createdAt: -1 })
      .limit(COVER_LETTER_PER_RESUME_CAP);

    const result = letters.map((doc: any) => ({
      letterId: doc._id,
      companyName: doc.companyName,
      positionTitle: doc.positionTitle,
      tone: doc.tone,
      jobDescription: doc.jobDescription,
      content: doc.content,
      createdAt: doc.createdAt,
    }));

    return NextResponse.json({ letters: result });
  } catch (error: any) {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
