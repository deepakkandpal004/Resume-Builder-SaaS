import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Application, {
  APPLICATION_STATUSES,
  APPLICATION_SOURCES,
} from "@/lib/models/Application";
import { getMongoUserId } from "@/lib/utils/userHelper";
import mongoose from "mongoose";
import logger from "@/lib/observability/logger";

async function getOwnedApplication(id: string, userId: unknown) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Application.findOne({ _id: id, userId });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const userId = await getMongoUserId(authResult.userId);
    if (!userId)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const { id } = await params;
    const application = await getOwnedApplication(id, userId);
    if (!application)
      return NextResponse.json(
        { message: "Application not found" },
        { status: 404 }
      );

    const body = await request.json().catch(() => ({}));
    const {
      status,
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

    if (
      status !== undefined &&
      !(APPLICATION_STATUSES as readonly string[]).includes(status)
    ) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }
    if (
      source !== undefined &&
      !(APPLICATION_SOURCES as readonly string[]).includes(source)
    ) {
      return NextResponse.json({ message: "Invalid source" }, { status: 400 });
    }

    if (status && status !== application.status) {
      application.status = status;
      application.statusHistory.push({ status, at: new Date() });
    }
    if (company !== undefined) application.company = String(company).trim();
    if (role !== undefined) application.role = String(role).trim();
    if (source !== undefined) application.source = source;
    if (jobUrl !== undefined) application.jobUrl = String(jobUrl).trim();
    if (resumeId !== undefined) application.resumeId = resumeId || null;
    if (versionId !== undefined) application.versionId = versionId || null;
    if (atsScoreAtApply !== undefined)
      application.atsScoreAtApply =
        typeof atsScoreAtApply === "number" ? atsScoreAtApply : null;
    if (appliedAt !== undefined) application.appliedAt = new Date(appliedAt);
    if (notes !== undefined) application.notes = String(notes);

    await application.save();
    await application.populate("resumeId", "title template");
    return NextResponse.json({ message: "Application updated", application });
  } catch (error: any) {
    logger.error("updateApplication failed:", error.message);
    return NextResponse.json(
      { message: "Something went wrong updating the application" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const userId = await getMongoUserId(authResult.userId);
    if (!userId)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { message: "Invalid application id" },
        { status: 400 }
      );
    }

    await Application.findOneAndDelete({ _id: id, userId });
    return NextResponse.json({ message: "Application deleted" });
  } catch (error: any) {
    logger.error("deleteApplication failed:", error.message);
    return NextResponse.json(
      { message: "Something went wrong deleting the application" },
      { status: 500 }
    );
  }
}
