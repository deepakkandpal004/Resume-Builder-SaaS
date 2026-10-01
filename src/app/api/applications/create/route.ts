import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Application, {
  APPLICATION_STATUSES,
  APPLICATION_SOURCES,
} from "@/lib/models/Application";
import { getMongoUserId } from "@/lib/utils/userHelper";
import logger from "@/lib/observability/logger";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const userId = await getMongoUserId(authResult.userId);
    if (!userId)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const {
      company,
      role,
      source,
      jobUrl,
      resumeId,
      versionId,
      atsScoreAtApply,
      appliedAt,
      notes,
    } = body;

    if (!company?.trim() || !role?.trim()) {
      return NextResponse.json(
        { message: "Company and role are required" },
        { status: 400 }
      );
    }

    if (source && !(APPLICATION_SOURCES as readonly string[]).includes(source)) {
      return NextResponse.json({ message: "Invalid source" }, { status: 400 });
    }

    const appliedDate = appliedAt ? new Date(appliedAt) : new Date();

    const application = await Application.create({
      userId,
      company: company.trim(),
      role: role.trim(),
      source: source || "other",
      jobUrl: jobUrl?.trim() || "",
      resumeId: resumeId || null,
      versionId: versionId || null,
      atsScoreAtApply:
        typeof atsScoreAtApply === "number" ? atsScoreAtApply : null,
      status: "applied",
      statusHistory: [{ status: "applied", at: appliedDate }],
      appliedAt: appliedDate,
      notes: notes?.trim() || "",
    });

    return NextResponse.json(
      {
        message: "Application tracked",
        application: await application.populate("resumeId", "title template"),
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error("createApplication failed:", error.message);
    return NextResponse.json(
      { message: "Something went wrong tracking the application" },
      { status: 500 }
    );
  }
}
