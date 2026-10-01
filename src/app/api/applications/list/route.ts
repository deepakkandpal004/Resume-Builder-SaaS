import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Application, {
  APPLICATION_STATUSES,
} from "@/lib/models/Application";
import { getMongoUserId } from "@/lib/utils/userHelper";
import logger from "@/lib/observability/logger";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const userId = await getMongoUserId(authResult.userId);
    if (!userId)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = { userId };
    if (
      status &&
      (APPLICATION_STATUSES as readonly string[]).includes(status)
    ) {
      filter.status = status;
    }

    const applications = await Application.find(filter)
      .populate("resumeId", "title template")
      .sort({ appliedAt: -1 })
      .lean();

    return NextResponse.json({ applications });
  } catch (error: any) {
    logger.error("listApplications failed:", error.message);
    return NextResponse.json(
      { message: "Something went wrong loading applications" },
      { status: 500 }
    );
  }
}
