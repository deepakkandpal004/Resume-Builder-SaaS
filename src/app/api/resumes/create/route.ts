import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Resume from "@/lib/models/Resume";
import { getMongoUserId } from "@/lib/utils/userHelper";
import logger from "@/lib/observability/logger";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const userId = await getMongoUserId(authResult.userId);
    if (!userId) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const { title, template } = body;
    console.log("[API /api/resumes/create] Creating resume:", { userId, title, template });
    const newResume = await Resume.create({
      userId,
      title: title || "Untitled Resume",
      template: template || "classic",
    });
    console.log("[API /api/resumes/create] Resume created successfully with ID:", newResume._id);
    return NextResponse.json({ message: "Resume created successfully", resume: newResume }, { status: 201 });
  } catch (error: any) {
    console.error("[API /api/resumes/create Error]:", error);
    logger.error("createResume failed:", error.message);
    return NextResponse.json({ message: "Something went wrong creating resume" }, { status: 500 });
  }
}
