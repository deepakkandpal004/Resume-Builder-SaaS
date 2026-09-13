import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Resume from "@/lib/models/Resume";
import AtsScore from "@/lib/models/AtsScore";
import { getMongoUserId } from "@/lib/utils/userHelper";
import mongoose from "mongoose";

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

    const scans = await AtsScore.find({ resumeId }).sort({ createdAt: -1 }).limit(10);

    const result = scans.map((doc: any) => ({
      scanId: doc._id,
      atsScore: doc.atsScore,
      jdSnippet: doc.jdSnippet,
      matchedKeywords: doc.matchedKeywords,
      missingKeywords: doc.missingKeywords,
      skillsGap: doc.skillsGap,
      suggestions: doc.suggestions,
      createdAt: doc.createdAt,
    }));

    return NextResponse.json({ scans: result });
  } catch (error: any) {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
