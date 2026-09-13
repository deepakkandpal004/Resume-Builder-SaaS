import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import User from "@/lib/models/User";
import Resume from "@/lib/models/Resume";
import AtsScore from "@/lib/models/AtsScore";
import logger from "@/lib/observability/logger";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const firebaseUid = authResult.userId;
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      console.warn("[API /api/users/resumes] User not found for UID:", firebaseUid);
      return NextResponse.json({ message: "user not found" }, { status: 404 });
    }

    const resumes = await Resume.find({ userId: user._id }).lean();
    console.log(`[API /api/users/resumes] Found ${resumes.length} resumes for user:`, user._id);

    const resumeIds = resumes.map((r: any) => r._id);
    const latestScans = await AtsScore.aggregate([
      { $match: { resumeId: { $in: resumeIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$resumeId",
          atsScore: { $first: "$atsScore" },
          scannedAt: { $first: "$createdAt" },
        },
      },
    ]);

    const scoreMap = Object.fromEntries(
      latestScans.map((s: any) => [
        s._id.toString(),
        { atsScore: s.atsScore, scannedAt: s.scannedAt },
      ])
    );

    const enriched = resumes.map((r: any) => ({
      ...r,
      lastAts: scoreMap[r._id.toString()] ?? null,
    }));

    return NextResponse.json({ resumes: enriched });
  } catch (error: any) {
    console.error("[API /api/users/resumes Error]:", error);
    logger.error("getUserResumes failed:", error.message);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
