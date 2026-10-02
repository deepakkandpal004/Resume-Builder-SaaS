import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Resume from "@/lib/models/Resume";
import { getMongoUserId } from "@/lib/utils/userHelper";
import mongoose from "mongoose";

// Toggle public link sharing for one of the user's own resumes.
// When `share` is true, the resume becomes viewable at /view/[resumeId]
// via the unauthenticated GET /api/resumes/public/[resumeId] endpoint.
// Turning it off instantly invalidates the link. No AI quota involved.
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const userId = await getMongoUserId(authResult.userId);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { resumeId, share } = await request.json();
    if (!mongoose.isValidObjectId(resumeId)) {
      return NextResponse.json({ message: "Invalid resume id" }, { status: 400 });
    }
    if (typeof share !== "boolean") {
      return NextResponse.json({ message: "Invalid share flag" }, { status: 400 });
    }

    const resume = await Resume.findOneAndUpdate(
      { _id: resumeId, userId },
      { public: share },
      { new: true }
    ).select("_id public");

    if (!resume) {
      return NextResponse.json({ message: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json({
      resumeId: String(resume._id),
      public: resume.public,
    });
  } catch (error: any) {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
